'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { AppShell, type ApiHealth } from '@/components/dashboard/app-shell';
import { AtRiskView } from '@/components/dashboard/views/at-risk-view';
import { BatchView } from '@/components/dashboard/views/batch-view';
import { OverviewView } from '@/components/dashboard/views/overview-view';
import { ProductsView } from '@/components/dashboard/views/products-view';
import { ReportsView } from '@/components/dashboard/views/reports-view';
import { SegmentsView } from '@/components/dashboard/views/segments-view';
import { SimulatorView } from '@/components/dashboard/views/simulator-view';
import { getHealth } from '@/lib/api';
import type { AtRiskCustomer } from '@/lib/api';
import { isViewId, type ViewId } from '@/lib/navigation';

interface SimulatorSeed {
  customerId: string;
  nonce: number;
}

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  // Re-check once after hydration, in case the page loaded with a hash before
  // the subscription was attached.
  callback();
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
}

function getHashSnapshot() {
  return typeof window === 'undefined' ? '' : window.location.hash;
}

function getServerHashSnapshot() {
  return '';
}

function viewFromHash(hash: string): ViewId {
  const value = hash.replace(/^#\/?/, '').split('?')[0];
  return isViewId(value) ? value : 'overview';
}

export default function Dashboard() {
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, getServerHashSnapshot);
  const activeView = viewFromHash(hash);
  const [seed, setSeed] = useState<SimulatorSeed | null>(null);
  const [health, setHealth] = useState<ApiHealth>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    const pollHealth = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const data = await getHealth();
        if (!cancelled) {
          setHealth({ status: 'online', version: data.version });
        }
      } catch {
        if (!cancelled) {
          setHealth((previous) => ({ status: 'offline', version: previous.version }));
        }
      }
    };

    void pollHealth();
    const intervalId = window.setInterval(pollHealth, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void pollHealth();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const navigate = (view: ViewId) => {
    const target = `#/${view}`;
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const simulateCustomer = (customer: AtRiskCustomer) => {
    setSeed({ customerId: customer.id, nonce: Date.now() });
    navigate('simulator');
  };

  return (
    <AppShell activeView={activeView} onNavigate={navigate} health={health}>
      {activeView === 'overview' ? <OverviewView onNavigate={navigate} /> : null}
      {activeView === 'simulator' ? (
        <SimulatorView
          key={`simulator-${seed?.nonce ?? 'default'}`}
          initialCustomerId={seed?.customerId}
          onNavigate={navigate}
        />
      ) : null}
      {activeView === 'segments' ? <SegmentsView onNavigate={navigate} /> : null}
      {activeView === 'products' ? <ProductsView onNavigate={navigate} /> : null}
      {activeView === 'reports' ? <ReportsView onNavigate={navigate} /> : null}
      {activeView === 'at-risk' ? (
        <AtRiskView onNavigate={navigate} onSimulate={simulateCustomer} />
      ) : null}
      {activeView === 'batch' ? <BatchView onNavigate={navigate} /> : null}
    </AppShell>
  );
}
