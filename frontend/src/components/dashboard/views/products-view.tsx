'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ErrorState } from '@/components/ErrorState';
import {
  EmptyState,
  KpiCard,
  Meter,
  PageHeader,
  Panel,
  Pill,
} from '@/components/dashboard/ui-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { getProductAnalytics, type ProductAnalytics } from '@/lib/api';
import { chartTheme } from '@/lib/chart-theme';
import { downloadCsv, toCsv } from '@/lib/csv';
import { formatCompactNumber, formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import type { ViewId } from '@/lib/navigation';
import { useApiData } from '@/lib/use-api-data';
import { cn } from '@/lib/utils';

type SortKey = 'revenue' | 'quantity' | 'buyers';

function ProductsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading product analytics">
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

export function ProductsView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { toast } = useToast();
  const { data, loading, error, retry } = useApiData<ProductAnalytics>(
    'product-analytics',
    getProductAnalytics,
  );
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'revenue',
    direction: 'desc',
  });

  const products = useMemo(() => data?.top_products ?? [], [data]);

  const ranked = useMemo(
    () =>
      [...products]
        .sort((a, b) => b.revenue - a.revenue)
        .map((product, index) => ({ ...product, rank: index + 1 })),
    [products],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...ranked]
      .filter(
        (product) =>
          !normalized ||
          product.description.toLowerCase().includes(normalized) ||
          product.stock_code.toLowerCase().includes(normalized),
      )
      .sort((a, b) => {
        const delta = a[sort.key] - b[sort.key];
        return sort.direction === 'asc' ? delta : -delta;
      });
  }, [query, ranked, sort]);

  if (loading && !data) return <ProductsSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return (
      <ErrorState
        title="No product data"
        message="The API returned an empty product report."
        onRetry={retry}
      />
    );
  }

  const totalRevenue = products.reduce((total, product) => total + product.revenue, 0);
  const unitsSold = products.reduce((total, product) => total + product.quantity, 0);
  const buyerPairs = products.reduce((total, product) => total + product.buyers, 0);
  const averageBuyers = products.length > 0 ? buyerPairs / products.length : 0;
  const topFive = ranked.slice(0, 5).reduce((total, product) => total + product.revenue, 0);
  const concentration = totalRevenue > 0 ? topFive / totalRevenue : 0;
  const topProduct = ranked[0];
  const chartData = ranked.slice(0, 8).map((product) => ({
    name: product.description || product.stock_code,
    revenue: product.revenue,
    code: product.stock_code,
  }));

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    );
  };

  const handleExport = () => {
    if (products.length === 0) return;
    const headers = ['Stock code', 'Description', 'Revenue (GBP)', 'Units sold', 'Unique buyers'];
    const rows = ranked.map((product) => [
      product.stock_code,
      product.description,
      product.revenue.toFixed(2),
      product.quantity,
      product.buyers,
    ]);
    downloadCsv('velora-products.csv', toCsv(headers, rows));
    toast({ title: 'Product report exported', variant: 'success' });
  };

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'quantity', label: 'Units' },
    { key: 'buyers', label: 'Buyers' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Merchandising"
        title="Product performance"
        description="Where revenue concentrates, which products carry the catalogue, and who is buying them."
        meta={
          <>
            <Pill>
              <ShoppingBag className="size-3" aria-hidden="true" />
              {formatNumber(products.length)} products tracked
            </Pill>
            <Pill>
              <Trophy className="size-3" aria-hidden="true" />
              Top 5 drive {formatPercent(concentration, 0)} of revenue
            </Pill>
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={retry} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={products.length === 0}>
              <Download />
              Export
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
          label="Product revenue"
          value={formatCurrency(totalRevenue)}
          icon={ShoppingBag}
          hint={`Across ${formatNumber(products.length)} listed products`}
        />
        <KpiCard
          label="Units sold"
          value={formatCompactNumber(unitsSold)}
          icon={Package}
          tone="success"
          hint="Total quantity across the catalogue"
        />
        <KpiCard
          label="Avg buyers per product"
          value={formatNumber(Math.round(averageBuyers))}
          icon={Users}
          tone="primary"
          hint="Unique buyers averaged across the catalogue"
        />
        <KpiCard
          label="Top-5 concentration"
          value={formatPercent(concentration)}
          icon={Trophy}
          tone="warning"
          hint="Revenue share held by the five best sellers"
          footer={<Meter value={concentration} tone="warning" label="Top five revenue concentration" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Revenue leaders"
          description="The eight highest grossing products."
          icon={Trophy}
          action={<Pill>Top 8</Pill>}
        >
          {chartData.length > 0 ? (
            <div
              className="h-[340px] w-full"
              role="img"
              aria-label="Horizontal bar chart of the highest grossing products"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={chartTheme.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `£${formatCompactNumber(value)}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={chartTheme.axis}
                    fontSize={11}
                    width={118}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: string) =>
                      value.length > 18 ? `${value.slice(0, 17)}…` : value
                    }
                  />
                  <Tooltip
                    cursor={chartTheme.cursorFill}
                    contentStyle={chartTheme.tooltipStyle}
                    itemStyle={chartTheme.tooltipItemStyle}
                    labelStyle={chartTheme.tooltipLabelStyle}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={26}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.code}
                        fill={chartTheme.series[index % chartTheme.series.length]}
                        fillOpacity={0.86}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No product revenue"
              description="Product analytics will appear once the catalogue has sales."
            />
          )}
        </Panel>

        <Panel
          title="Spotlight"
          description="The single product carrying the most revenue."
          icon={Trophy}
          action={<Pill>#1</Pill>}
        >
          {topProduct ? (
            <div className="flex h-full flex-col">
              <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-primary/20 blur-2xl"
                />
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {topProduct.stock_code}
                </p>
                <p className="mt-1.5 text-lg font-semibold leading-tight">
                  {topProduct.description || 'Unnamed product'}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(topProduct.revenue)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatPercent(topProduct.revenue / Math.max(totalRevenue, 1))} of catalogue revenue
                </p>
                <Meter
                  value={topProduct.revenue / Math.max(totalRevenue, 1)}
                  tone="primary"
                  label="Top product share of catalogue revenue"
                  className="mt-3"
                />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 p-2.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Units</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatNumber(topProduct.quantity)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/70 p-2.5">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Buyers</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatNumber(topProduct.buyers)}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto pt-4">
                <Button className="w-full" onClick={() => onNavigate('simulator')}>
                  <Sparkles />
                  Score a similar customer
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={Trophy} title="No top product" description="No product rows are available." />
          )}
        </Panel>
      </div>

      <Panel
        title="Product catalogue"
        description="Search and sort every product in the report."
        icon={Package}
        action={
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or stock code…"
              aria-label="Search products"
              className="h-8 pl-8 pr-8"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear product search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        }
        bodyClassName="p-0 sm:p-0"
      >
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th scope="col" className="w-16 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                  Rank
                </th>
                <th scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Product
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
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filtered.length > 0 ? (
                filtered.map((product) => (
                  <tr key={product.stock_code} className="transition-colors hover:bg-muted/35">
                    <td className="px-4 py-3 sm:px-5">
                      <span
                        className={cn(
                          'grid size-7 place-items-center rounded-lg text-[11px] font-semibold',
                          product.rank <= 3
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {product.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{product.description || 'Unnamed product'}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{product.stock_code}</p>
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatNumber(product.quantity)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatNumber(product.buyers)}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="ml-auto w-24">
                        <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                          {formatPercent(product.revenue / Math.max(totalRevenue, 1), 0)}
                        </div>
                        <Meter
                          value={product.revenue / Math.max(totalRevenue, 1)}
                          tone={product.rank <= 3 ? 'primary' : 'neutral'}
                          label={`Revenue share for ${product.description}`}
                          className="mt-1 h-1"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 sm:px-5">
                    <EmptyState
                      icon={Search}
                      title="No products match"
                      description={`Nothing matches “${query}”. Try a different product name or stock code.`}
                      action={
                        <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                          Clear search
                        </Button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
