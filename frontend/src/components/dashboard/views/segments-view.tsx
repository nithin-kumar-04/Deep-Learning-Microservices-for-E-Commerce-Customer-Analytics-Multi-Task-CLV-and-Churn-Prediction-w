'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Layers,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import { ErrorState } from '@/components/ErrorState';
import {
  EmptyState,
  KpiCard,
  Meter,
  PageHeader,
  Panel,
  Pill,
  riskTone,
} from '@/components/dashboard/ui-kit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { getSegments, type SegmentSummary, type SegmentsResponse } from '@/lib/api';
import { chartTheme } from '@/lib/chart-theme';
import { downloadCsv, toCsv } from '@/lib/csv';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import {
  segmentColor,
  totalSegmentCustomers,
  weightedAverageClv,
} from '@/lib/insights';
import type { ViewId } from '@/lib/navigation';
import { useApiData } from '@/lib/use-api-data';
import { cn } from '@/lib/utils';

type SortKey = 'count' | 'avg_clv' | 'avg_churn' | 'avg_recency';
type SortDirection = 'asc' | 'desc';

function SegmentsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading customer segments">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-[26rem] w-full rounded-2xl" />
    </div>
  );
}

export function SegmentsView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { toast } = useToast();
  const { data, loading, error, retry } = useApiData<SegmentsResponse>('segments', getSegments);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'count',
    direction: 'desc',
  });

  if (loading && !data) return <SegmentsSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return (
      <ErrorState
        title="No segment data"
        message="The API returned an empty segment report."
        onRetry={retry}
      />
    );
  }

  const summary = data.summary;
  const population = totalSegmentCustomers(summary);
  const averageClv = weightedAverageClv(summary);
  const largest = summary.reduce<SegmentSummary | null>(
    (best, segment) => (!best || segment.count > best.count ? segment : best),
    null,
  );
  const riskiest = summary.reduce<SegmentSummary | null>(
    (worst, segment) => (!worst || segment.avg_churn > worst.avg_churn ? segment : worst),
    null,
  );
  const palette = summary.map((segment) => segmentColor(segment.Segment));

  const sorted = [...summary].sort((a, b) => {
    const delta = a[sort.key] - b[sort.key];
    return sort.direction === 'asc' ? delta : -delta;
  });

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    );
  };

  const scatterPoints = data.scatter.slice(0, 700);

  const handleExport = () => {
    if (summary.length === 0) return;
    const headers = [
      'Segment',
      'Customers',
      'Share (%)',
      'Avg CLV (GBP)',
      'Avg churn (%)',
      'Avg recency (days)',
      'Avg frequency',
      'Avg monetary (GBP)',
    ];
    const rows = sorted.map((segment) => [
      segment.Segment,
      segment.count,
      population > 0 ? ((segment.count / population) * 100).toFixed(1) : '0.0',
      segment.avg_clv.toFixed(2),
      (segment.avg_churn * 100).toFixed(1),
      segment.avg_recency.toFixed(1),
      segment.avg_frequency.toFixed(1),
      segment.avg_monetary.toFixed(2),
    ]);
    downloadCsv('velora-segments.csv', toCsv(headers, rows));
    toast({ title: 'Segment report exported', variant: 'success' });
  };

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'count', label: 'Population' },
    { key: 'avg_clv', label: 'Avg CLV' },
    { key: 'avg_churn', label: 'Avg churn' },
    { key: 'avg_recency', label: 'Avg recency' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="RFM segmentation"
        title="Customer personas"
        description="Four behavioural clusters, sized and scored so you can decide where to invest retention and growth effort."
        meta={
          <>
            <Pill>
              <Users className="size-3" aria-hidden="true" />
              {formatNumber(population)} customers mapped
            </Pill>
            <Pill>
              <Layers className="size-3" aria-hidden="true" />
              {summary.length} segments
            </Pill>
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={retry} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={summary.length === 0}>
              <Download />
              Export report
            </Button>
            <Button onClick={() => onNavigate('at-risk')}>
              <ShieldAlert />
              At-risk queue
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Customers mapped"
          value={formatNumber(population)}
          icon={Users}
          hint="Across every RFM persona"
        />
        <KpiCard
          label="Weighted average CLV"
          value={formatCurrency(averageClv)}
          icon={Wallet}
          tone="success"
          hint="Population-weighted across segments"
        />
        <KpiCard
          label="Largest segment"
          value={largest ? formatNumber(largest.count) : '—'}
          icon={Layers}
          tone="primary"
          hint={largest ? `${largest.Segment} · ${formatPercent(largest.count / Math.max(population, 1))} of the base` : 'No segments'}
          footer={
            largest ? (
              <Meter
                value={largest.count / Math.max(population, 1)}
                tone="primary"
                label={`${largest.Segment} share of customers`}
              />
            ) : null
          }
        />
        <KpiCard
          label="Highest segment churn"
          value={riskiest ? formatPercent(riskiest.avg_churn) : '—'}
          icon={ShieldAlert}
          tone="danger"
          hint={riskiest ? `${riskiest.Segment} needs the first intervention` : 'No data'}
          footer={
            riskiest ? (
              <Meter
                value={riskiest.avg_churn}
                tone={riskTone(riskiest.avg_churn)}
                label={`${riskiest.Segment} average churn risk`}
              />
            ) : null
          }
        />
      </div>

      <Panel
        title="Population composition"
        description="How the customer base splits across personas."
        icon={Layers}
        action={<Pill>{summary.length} personas</Pill>}
      >
        {summary.length > 0 ? (
          <div className="space-y-4">
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label="Stacked bar showing the share of customers in each segment"
            >
              {summary.map((segment, index) => (
                <div
                  key={segment.Segment}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(segment.count / Math.max(population, 1)) * 100}%`,
                    backgroundColor: palette[index],
                  }}
                  title={`${segment.Segment}: ${formatNumber(segment.count)}`}
                />
              ))}
            </div>

            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {summary.map((segment, index) => (
                <li key={segment.Segment} className="flex items-start gap-2.5">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: palette[index] }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{segment.Segment}</p>
                      <p className="text-xs font-medium tabular-nums">
                        {formatPercent(segment.count / Math.max(population, 1))}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatNumber(segment.count)} customers · {formatCurrency(segment.avg_clv)} avg CLV
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {largest && riskiest ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-muted-foreground">
                  <strong className="font-medium text-foreground">{largest.Segment}</strong> is the
                  biggest cohort at {formatPercent(largest.count / Math.max(population, 1))} of the
                  base, while <strong className="font-medium text-foreground">{riskiest.Segment}</strong>{' '}
                  carries the highest churn at {formatPercent(riskiest.avg_churn)}.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState icon={Layers} title="No segment metrics" description="The segment report is empty." />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Persona landscape"
          description="Recency versus frequency, with bubble size representing CLV."
          icon={Users}
          action={<Pill>{formatNumber(data.scatter.length)} points</Pill>}
        >
          {scatterPoints.length > 0 ? (
            <>
              <div
                className="h-[340px] w-full"
                role="img"
                aria-label="Scatter chart of customers by recency and frequency, coloured by segment"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 12, bottom: 8, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis
                      type="number"
                      dataKey="recency"
                      name="Recency (days)"
                      stroke={chartTheme.axis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="frequency"
                      name="Frequency"
                      stroke={chartTheme.axis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <ZAxis type="number" dataKey="clv" range={[35, 260]} name="CLV" />
                    <Tooltip
                      cursor={chartTheme.cursorStroke}
                      contentStyle={chartTheme.tooltipStyle}
                      itemStyle={chartTheme.tooltipItemStyle}
                      formatter={(value, name) => [
                        Number(value ?? 0).toFixed(1),
                        String(name ?? ''),
                      ]}
                    />
                    <Scatter name="Customers" data={scatterPoints} fill="var(--chart-1)">
                      {scatterPoints.map((entry, index) => (
                        <Cell
                          key={`${entry.id}-${index}`}
                          fill={segmentColor(entry.segment)}
                          fillOpacity={0.72}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {summary.map((segment, index) => (
                  <div key={segment.Segment} className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: palette[index] }}
                      aria-hidden="true"
                    />
                    <span className="text-[11px] text-muted-foreground">{segment.Segment}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={Users} title="No customer points" description="The scatter report has no rows." />
          )}
        </Panel>

        <Panel
          className="lg:col-span-2"
          title="Segment scorecard"
          description="Average value and risk by persona."
          icon={Wallet}
        >
          <ul className="space-y-3">
            {sorted.map((segment) => {
              const share = segment.count / Math.max(population, 1);
              return (
                <li key={segment.Segment} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: segmentColor(segment.Segment) }}
                        aria-hidden="true"
                      />
                      <p className="truncate text-sm font-medium">{segment.Segment}</p>
                    </div>
                    <span className="text-xs font-medium tabular-nums">
                      {formatPercent(share)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Avg CLV</p>
                      <p className="font-medium tabular-nums">{formatCurrency(segment.avg_clv)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg recency</p>
                      <p className="font-medium tabular-nums">{segment.avg_recency.toFixed(0)} days</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Churn risk</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPercent(segment.avg_churn)}
                      </span>
                    </div>
                    <Meter
                      value={segment.avg_churn}
                      tone={riskTone(segment.avg_churn)}
                      label={`${segment.Segment} average churn risk`}
                      className="h-1"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Segment aggregate metrics"
        description="Full RFM profile for every persona. Click a header to sort."
        icon={Layers}
        bodyClassName="p-0 sm:p-0"
      >
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                  Segment
                </th>
                {sortOptions.map((option) => (
                  <th
                    key={option.key}
                    scope="col"
                    aria-sort={
                      sort.key === option.key
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(option.key)}
                      className="ml-auto inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {option.label}
                      {sort.key === option.key ? (
                        sort.direction === 'asc' ? (
                          <ArrowUp className="size-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                  Avg spend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {sorted.map((segment) => (
                <tr key={segment.Segment} className="transition-colors hover:bg-muted/35">
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: segmentColor(segment.Segment) }}
                        aria-hidden="true"
                      />
                      <span className="font-medium">{segment.Segment}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatNumber(segment.count)}
                    <span className="ml-1 text-[11px] text-muted-foreground">
                      ({formatPercent(segment.count / Math.max(population, 1), 0)})
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(segment.avg_clv)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPercent(segment.avg_churn)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {segment.avg_recency.toFixed(1)} days
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                    {formatCurrency(segment.avg_monetary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
