'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/lib/errors';

interface CacheEntry<T> {
  data: T | null;
  error: string | null;
  fetchedAt: number;
  promise: Promise<T> | null;
}

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface FetchResult<T> {
  data: T | null;
  error: string | null;
}

// Module-level cache shared by every component that requests the same key.
// This keeps tab switches instant while still allowing an explicit retry.
const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  force = false,
): Promise<FetchResult<T>> {
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  const isFresh = cached?.data != null && Date.now() - cached.fetchedAt < ttlMs;

  if (!force && isFresh && cached) {
    return { data: cached.data, error: null };
  }

  // Reuse an in-flight request for the same key so two components mounted at
  // the same time only trigger one network call.
  let promise = cached?.promise ?? null;
  if (!promise) {
    promise = fetcher();
    cache.set(key, {
      data: cached?.data ?? null,
      error: null,
      fetchedAt: cached?.fetchedAt ?? 0,
      promise,
    });
  }

  try {
    const data = await promise;
    cache.set(key, { data, error: null, fetchedAt: Date.now(), promise: null });
    return { data, error: null };
  } catch (error) {
    const message = getApiErrorMessage(error, 'Something went wrong while loading this data.');
    cache.set(key, {
      data: cached?.data ?? null,
      error: message,
      fetchedAt: 0,
      promise: null,
    });
    return { data: cached?.data ?? null, error: message };
  }
}

export function useApiData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number } = {},
) {
  const { ttlMs = DEFAULT_TTL_MS } = options;
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [state, setState] = useState<FetchState<T>>(() => {
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    return {
      data: cached?.data ?? null,
      error: cached?.error ?? null,
      loading: !cached?.data,
    };
  });

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let cancelled = false;

    fetchWithCache(key, fetcher, ttlMs).then((result) => {
      if (!cancelled && mountedRef.current && requestIdRef.current === requestId) {
        setState({ data: result.data, error: result.error, loading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetcher, key, ttlMs]);

  const retry = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    void fetchWithCache(key, fetcher, ttlMs, true).then((result) => {
      if (mountedRef.current && requestIdRef.current === requestId) {
        setState({ data: result.data, error: result.error, loading: false });
      }
    });
  }, [fetcher, key, ttlMs]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    retry,
  };
}
