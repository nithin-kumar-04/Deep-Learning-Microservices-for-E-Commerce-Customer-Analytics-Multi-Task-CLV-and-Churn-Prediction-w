'use client';

import {
  ArrowRight,
  ChartSpline,
  Database,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ErrorState } from '@/components/ErrorState';
import {
  CustomerAvatar,
  EmptyState,
  KpiCard,
  Meter,
  PageHeader,
  Panel,
  Pill,
  RiskBadge,
  riskTone,
} from '@/components/dashboard/ui-kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAtRiskCustomers, getBusinessOverview, type AtRiskCustomer, type BusinessOverview } from '@/lib/api';
import { chartTheme } from '@/lib/chart-theme';
import { formatCurrency, formatMonth, formatNumber, formatPercent } from '@/lib/format';
import {
  averageChurn,
  monthOverMonthChange,
  revenueAtRisk,
  riskDistribution,
} from '@/lib/insights';
import type { ViewId } from '@/lib/navigation';
import { useApiData } from '@/lib/use-api-data';

function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading business overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 w-full rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function OverviewView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const overview = useApiData<BusinessOverview>('business-overview', getBusinessOverview);
  const atRisk = useApiData<AtRiskCustomer[]>('at-risk-customers', getAtRiskCustomers, {
    ttlMs: 60_000,
  });

  const data = overview.data;

  if (overview.loading && !data) return <OverviewSkeleton />;
  if (overview.error && !data) {
    return <ErrorState message={overview.error} onRetry={overview.retry} />;
  }
  if (!data) {
    return (
      <ErrorState
        title="No overview data"
        message="The API returned an empty overview report."
        onRetry={overview.retry}
      />
    );
  }

  const monthly = data.historical_monthly;
  const customers = atRisk.data ?? [];
  const exposure = revenueAtRisk(customers);
  const avgChurn = averageChurn(customers);
  const criticalCount = customers.filter((customer) => customer.churnRisk >= 0.8).length;
  const mom = monthOverMonthChange(monthly);
  const forecastShare = data.total_historical > 0 ? data.forecast_90d / data.total_historical : 0;
  const distribution = riskDistribution(customers);
  const maxBucket = Math.max(1, ...distribution.map((bucket) => bucket.count));
  const priority = [...customers]
    .sort((a, b) => b.churnRisk * b.clv - a.churnRisk * a.clv)
    .slice(0, 5);
  const chartData = monthly.map((point) => ({
    label: formatMonth(point.date),
    revenue: point.revenue,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio overview"
        title="Revenue that stays ahead of churn"
        description="A live read on lifetime value, the next quarter of forecast revenue, and the accounts that need a human touch."
        meta={
          <>
            <Pill>
              <Database className="size-3" aria-hidden="true" />
              UCI Online Retail · demo
            </Pill>
            <Pill>
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              {formatNumber(customers.length)} priority accounts tracked
            </Pill>
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={overview.retry} disabled={overview.loading}>
              <RefreshCw className={overview.loading ? 'animate-spin' : undefined} />
              Refresh
            </Button>
            <Button onClick={() => onNavigate('simulator')}>
              <Sparkles />
              Score a customer
            </Button>
          </>
        }
      />

      {atRisk.error ? (
        <div className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-xs text-muted-foreground">
          {atRisk.error} Retrying the account feed is available from the At-Risk workspace.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Historical revenue"
          value={formatCurrency(data.total_historical)}
          icon={Wallet}
          tone="primary"
          hint={`Across ${monthly.length} recorded months`}
          spark={monthly.map((point) => point.revenue)}
          trend={
            mom == null
              ? undefined
              : {
                  label: `${mom >= 0 ? '+' : ''}${formatPercent(mom)} MoM`,
                  direction: mom >= 0 ? 'up' : 'down',
                  positive: mom >= 0,
                }
          }
        />
        <KpiCard
          label="90-day forecast"
          value={formatCurrency(data.forecast_90d)}
          icon={TrendingUp}
          tone="success"
          hint="Aggregated predicted CLV for the next quarter"
          footer={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Versus recorded revenue</span>
                <span className="font-medium text-foreground">{formatPercent(forecastShare)}</span>
              </div>
              <Meter value={forecastShare} tone="success" label="Forecast share of historical revenue" />
            </div>
          }
        />
        <KpiCard
          label="Revenue at risk"
          value={formatCurrency(exposure)}
          icon={ShieldAlert}
          tone="danger"
          hint="CLV weighted by each account’s churn probability"
          footer={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Average churn risk</span>
                <span className="font-medium text-foreground">{formatPercent(avgChurn)}</span>
              </div>
              <Meter value={avgChurn} tone={riskTone(avgChurn)} label="Average churn risk" />
            </div>
          }
        />
        <KpiCard
          label="Critical accounts"
          value={formatNumber(criticalCount)}
          icon={Users}
          tone="warning"
          hint={`${formatNumber(customers.length)} accounts in the priority queue`}
          footer={
            <button
              type="button"
              onClick={() => onNavigate('at-risk')}
              className="flex w-full items-center justify-between text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
            >
              Open the at-risk queue
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Revenue trajectory"
          description="Monthly gross revenue across the demo window."
          icon={ChartSpline}
          action={<Pill>{monthly.length} months</Pill>}
        >
          {chartData.length > 0 ? (
            <div
              className="h-[300px] w-full"
              role="img"
              aria-label="Area chart of historical monthly revenue"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="overview-revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke={chartTheme.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    stroke={chartTheme.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={(value: number) => `£${Math.round(value / 1000)}k`}
                  />
                  <Tooltip
                    cursor={chartTheme.cursorStroke}
                    contentStyle={chartTheme.tooltipStyle}
                    itemStyle={chartTheme.tooltipItemStyle}
                    labelStyle={chartTheme.tooltipLabelStyle}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2.4}
                    fill="url(#overview-revenue)"
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={ChartSpline}
              title="No revenue history yet"
              description="Monthly revenue will appear here once the business overview endpoint returns data."
            />
          )}
        </Panel>

        <Panel
          title="Quarter outlook"
          description="Forecast confidence and exposure distribution."
          icon={Gauge}
        >
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Predicted revenue
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(data.forecast_90d)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Next 90 days · aggregated lifetime value
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Historical coverage</span>
                <span className="font-medium tabular-nums">{formatPercent(forecastShare)}</span>
              </div>
              <Meter value={forecastShare} tone="success" label="Forecast coverage" />
            </div>

            <div className="space-y-3 border-t border-border/70 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Churn exposure
              </p>
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
                    label={`${bucket.label} churn exposure`}
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Priority accounts"
          description="Highest value-weighted churn exposure right now."
          icon={ShieldAlert}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('at-risk')}>
              View all
              <ArrowRight />
            </Button>
          }
        >
          {priority.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {priority.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('at-risk')}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <CustomerAvatar value={customer.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">Customer #{customer.id}</p>
                        <RiskBadge probability={customer.churnRisk} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatCurrency(customer.clv)} CLV · {customer.recency}d since last order ·{' '}
                        {customer.freq} orders
                      </p>
                    </div>
                    <div className="hidden w-28 shrink-0 space-y-1.5 sm:block">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Churn</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatPercent(customer.churnRisk)}
                        </span>
                      </div>
                      <Meter
                        value={customer.churnRisk}
                        tone={riskTone(customer.churnRisk)}
                        label={`Churn risk for customer ${customer.id}`}
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title={atRisk.loading ? 'Loading priority accounts…' : 'No at-risk accounts'}
              description={
                atRisk.loading
                  ? 'The churn model is ranking the portfolio.'
                  : 'Nothing is flagged right now. Check back after the next scoring run.'
              }
            />
          )}
        </Panel>

        <Panel title="Operating playbook" description="The three moves that protect this quarter." icon={Zap}>
          <div className="space-y-1">
            {[
              {
                title: 'Rescue critical accounts',
                copy: 'Work the top 10 by weighted CLV with a win-back offer.',
                view: 'at-risk' as ViewId,
                icon: ShieldAlert,
              },
              {
                title: 'Reward the champions',
                copy: 'Protect advocacy with an early-access or loyalty perk.',
                view: 'segments' as ViewId,
                icon: Users,
              },
              {
                title: 'Re-score a saved profile',
                copy: 'Change recency, frequency or spend and watch the model move.',
                view: 'simulator' as ViewId,
                icon: Sparkles,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onNavigate(item.view)}
                  className="group flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm font-medium">
                      {item.title}
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {item.copy}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
