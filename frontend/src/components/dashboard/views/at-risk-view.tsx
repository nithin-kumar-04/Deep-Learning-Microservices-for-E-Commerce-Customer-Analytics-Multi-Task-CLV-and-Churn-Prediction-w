'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Gauge,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Users,
  X,
} from 'lucide-react';

import { ErrorState } from '@/components/ErrorState';
import {
  CustomerAvatar,
  EmptyState,
  InlineAlert,
  KpiCard,
  Meter,
  PageHeader,
  Panel,
  Pill,
  RiskBadge,
  RiskGauge,
  riskTone,
} from '@/components/dashboard/ui-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { getAtRiskCustomers, type AtRiskCustomer } from '@/lib/api';
import { downloadCsv, toCsv } from '@/lib/csv';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import {
  averageChurn,
  customerExposure,
  revenueAtRisk,
  riskDistribution,
  riskTier,
  riskTierLabel,
  type RiskTier,
} from '@/lib/insights';
import type { ViewId } from '@/lib/navigation';
import { useApiData } from '@/lib/use-api-data';
import { cn } from '@/lib/utils';

type TierFilter = 'all' | RiskTier;
type SortKey = 'weighted' | 'churn' | 'clv' | 'recency';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'weighted', label: 'Highest exposure' },
  { value: 'churn', label: 'Highest churn' },
  { value: 'clv', label: 'Highest CLV' },
  { value: 'recency', label: 'Longest absent' },
];

function AtRiskSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading at-risk customers">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[30rem] w-full rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[30rem] w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function AtRiskView({
  onNavigate,
  onSimulate,
}: {
  onNavigate: (view: ViewId) => void;
  onSimulate: (customer: AtRiskCustomer) => void;
}) {
  const { toast } = useToast();
  const { data, loading, error, retry } = useApiData<AtRiskCustomer[]>(
    'at-risk-customers',
    getAtRiskCustomers,
    { ttlMs: 60_000 },
  );
  const [tier, setTier] = useState<TierFilter>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('weighted');

  const customers = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    return customers.reduce(
      (accumulator, customer) => {
        accumulator[riskTier(customer.churnRisk)] += 1;
        return accumulator;
      },
      { critical: 0, high: 0, watch: 0 } as Record<RiskTier, number>,
    );
  }, [customers]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers
      .filter((customer) => {
        if (tier !== 'all' && riskTier(customer.churnRisk) !== tier) return false;
        if (!normalized) return true;
        return (
          customer.id.toLowerCase().includes(normalized) ||
          customer.status.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => {
        if (sortKey === 'churn') return b.churnRisk - a.churnRisk;
        if (sortKey === 'clv') return b.clv - a.clv;
        if (sortKey === 'recency') return b.recency - a.recency;
        return customerExposure(b) - customerExposure(a);
      });
  }, [customers, query, sortKey, tier]);

  if (loading && !data) return <AtRiskSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;

  const exposure = revenueAtRisk(customers);
  const avgChurn = averageChurn(customers);
  const distribution = riskDistribution(customers);
  const maxBucket = Math.max(1, ...distribution.map((bucket) => bucket.count));
  const hasFilters = tier !== 'all' || query.trim().length > 0;

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = [
      'Customer ID',
      'Churn risk (%)',
      'Predicted CLV (GBP)',
      'Exposure (GBP)',
      'Recency (days)',
      'Frequency (orders)',
      'Risk tier',
      'Status',
    ];
    const rows = filtered.map((customer) => [
      customer.id,
      (customer.churnRisk * 100).toFixed(1),
      customer.clv.toFixed(2),
      customerExposure(customer).toFixed(2),
      customer.recency,
      customer.freq,
      riskTierLabel(riskTier(customer.churnRisk)),
      customer.status,
    ]);
    downloadCsv('velora-at-risk-customers.csv', toCsv(headers, rows));
    toast({
      title: 'At-risk export ready',
      description: `${formatNumber(filtered.length)} accounts written to CSV.`,
      variant: 'success',
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Retention operations"
        title="At-risk workspace"
        description="A prioritised queue of valuable accounts with elevated churn probability, built for outreach rather than reporting."
        meta={
          <>
            <Pill>
              <ShieldAlert className="size-3" aria-hidden="true" />
              Refreshes every 60 seconds
            </Pill>
            <Pill>
              <TrendingDown className="size-3" aria-hidden="true" />
              Value-weighted risk ordering
            </Pill>
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={retry} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
              <Download />
              Export CSV
            </Button>
            <Button onClick={() => onNavigate('simulator')}>
              <Sparkles />
              Score a customer
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Priority accounts"
          value={formatNumber(customers.length)}
          icon={ShieldAlert}
          tone="warning"
          hint={`${formatNumber(counts.critical)} critical · ${formatNumber(counts.high)} high risk`}
        />
        <KpiCard
          label="Revenue at risk"
          value={formatCurrency(exposure)}
          icon={AlertTriangle}
          tone="danger"
          hint="CLV weighted by predicted churn probability"
        />
        <KpiCard
          label="Average churn risk"
          value={formatPercent(avgChurn)}
          icon={Gauge}
          tone={riskTone(avgChurn)}
          hint="Across every account in the queue"
          footer={
            <Meter value={avgChurn} tone={riskTone(avgChurn)} label="Average churn risk across priority accounts" />
          }
        />
        <KpiCard
          label="Watchlist"
          value={formatNumber(counts.watch)}
          icon={Users}
          tone="success"
          hint="Lower-risk accounts to nurture, not rescue"
          footer={
            <button
              type="button"
              onClick={() => setTier('watch')}
              className="text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
            >
              Filter to watchlist
            </button>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Priority queue"
          description="Search, filter and work the accounts that matter most."
          icon={ShieldAlert}
          action={<Pill>{formatNumber(filtered.length)} shown</Pill>}
          bodyClassName="p-0 sm:p-0"
          footer={
            <p className="text-[11px] text-muted-foreground">
              Showing {formatNumber(filtered.length)} of {formatNumber(customers.length)} accounts.
              Export uses the current filters.
            </p>
          }
        >
          <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer ID or status…"
                aria-label="Search at-risk customers"
                className="h-8 pl-8 pr-8"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear customer search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by risk tier">
                {(
                  [
                    { id: 'all', label: 'All', count: customers.length },
                    { id: 'critical', label: 'Critical', count: counts.critical },
                    { id: 'high', label: 'High risk', count: counts.high },
                    { id: 'watch', label: 'Watch', count: counts.watch },
                  ] as { id: TierFilter; label: string; count: number }[]
                ).map((option) => {
                  const active = tier === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTier(option.id)}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border bg-background/60 text-muted-foreground hover:border-primary/25 hover:text-foreground',
                      )}
                    >
                      {option.label}
                      <span
                        className={cn(
                          'rounded-full px-1 text-[10px] tabular-nums',
                          active ? 'bg-primary/15' : 'bg-muted',
                        )}
                      >
                        {formatNumber(option.count)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                Sort
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="h-7 rounded-lg border border-input bg-background px-2 text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <div className="p-4">
              <InlineAlert variant="error" title="The queue may be stale">
                {error}{' '}
                <button type="button" onClick={retry} className="font-medium underline">
                  Try again
                </button>
              </InlineAlert>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title={customers.length === 0 ? 'No at-risk accounts' : 'No accounts match'}
                description={
                  customers.length === 0
                    ? 'Nothing is above the risk threshold right now. Check back after the next scoring run.'
                    : 'Try a different tier, clear the search, or reset the filters.'
                }
                action={
                  hasFilters ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTier('all');
                        setQuery('');
                      }}
                    >
                      Reset filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="scrollbar-thin hidden overflow-x-auto md:block">
                <table className="w-full min-w-[780px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left">
                      <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                        Customer
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Churn risk
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Predicted CLV
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Exposure
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Recency
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Orders
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filtered.map((customer) => (
                      <tr key={customer.id} className="transition-colors hover:bg-muted/35">
                        <td className="px-4 py-3 sm:px-5">
                          <div className="flex items-center gap-2.5">
                            <CustomerAvatar value={customer.id} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">#{customer.id}</p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <RiskBadge
                                  probability={customer.churnRisk}
                                  label={riskTierLabel(riskTier(customer.churnRisk))}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {customer.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-12 font-mono text-xs tabular-nums">
                              {formatPercent(customer.churnRisk)}
                            </span>
                            <Meter
                              value={customer.churnRisk}
                              tone={riskTone(customer.churnRisk)}
                              label={`Churn risk for customer ${customer.id}`}
                              className="w-16"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(customer.clv)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span
                            title="Predicted CLV multiplied by churn probability"
                            className="font-medium"
                          >
                            {formatCurrency(customerExposure(customer))}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{customer.recency}d</td>
                        <td className="px-3 py-3 text-right tabular-nums">{customer.freq}</td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSimulate(customer)}
                            aria-label={`Simulate customer ${customer.id}`}
                          >
                            <Sparkles />
                            Simulate
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border/70 md:hidden">
                {filtered.map((customer) => (
                  <li key={customer.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <CustomerAvatar value={customer.id} />
                        <div>
                          <p className="text-sm font-medium">#{customer.id}</p>
                          <p className="text-[10px] text-muted-foreground">{customer.status}</p>
                        </div>
                      </div>
                      <RiskBadge
                        probability={customer.churnRisk}
                        label={riskTierLabel(riskTier(customer.churnRisk))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg border border-border/70 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatPercent(customer.churnRisk)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">CLV</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(customer.clv)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Exposure
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(customerExposure(customer))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Absent</p>
                        <p className="text-sm font-semibold tabular-nums">{customer.recency}d</p>
                      </div>
                    </div>
                    <Meter
                      value={customer.churnRisk}
                      tone={riskTone(customer.churnRisk)}
                      label={`Churn risk for customer ${customer.id}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onSimulate(customer)}
                      aria-label={`Simulate customer ${customer.id}`}
                    >
                      <Sparkles />
                      Simulate this customer
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Exposure profile"
            description="How risk is distributed across the queue."
            icon={Gauge}
          >
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center">
              <RiskGauge value={avgChurn} size="lg" label="Average churn risk" />
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Portfolio exposure
                </p>
                <p className="mt-1 text-sm font-medium">{formatCurrency(exposure)}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {formatNumber(counts.critical)} accounts are above the 80% churn threshold.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {distribution.map((bucket) => (
                <div key={bucket.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{bucket.label}</span>
                    <span className="font-medium tabular-nums">{formatNumber(bucket.count)}</span>
                  </div>
                  <Meter
                    value={bucket.count / maxBucket}
                    tone={
                      bucket.label === '80–100%'
                        ? 'danger'
                        : bucket.label === '60–80%'
                          ? 'warning'
                          : bucket.label === '40–60%'
                            ? 'primary'
                            : 'success'
                    }
                    label={`${bucket.label} churn distribution`}
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Intervention ladder" description="Match the motion to the risk tier." icon={AlertTriangle}>
            <ol className="space-y-3">
              {[
                {
                  step: '01',
                  title: 'Personal rescue',
                  copy: 'Critical accounts: direct outreach with a high-value offer within 48 hours.',
                  tone: 'danger' as const,
                },
                {
                  step: '02',
                  title: 'Timely incentive',
                  copy: 'High risk: automated win-back with product-led recommendations.',
                  tone: 'warning' as const,
                },
                {
                  step: '03',
                  title: 'Nurture watchlist',
                  copy: 'Watch tier: keep warm with content and early access, not discounts.',
                  tone: 'success' as const,
                },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-semibold',
                      item.tone === 'danger'
                        ? 'bg-destructive/10 text-destructive'
                        : item.tone === 'warning'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success',
                    )}
                  >
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {item.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => onNavigate('simulator')}
            >
              <Sparkles />
              Simulate an intervention
            </Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
