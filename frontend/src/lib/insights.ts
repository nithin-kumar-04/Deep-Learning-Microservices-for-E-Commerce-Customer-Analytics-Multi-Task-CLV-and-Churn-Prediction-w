import type { AtRiskCustomer, SegmentSummary } from '@/lib/api';

export type RiskTier = 'critical' | 'high' | 'watch';

export const SEGMENT_COLORS: Record<string, string> = {
  Champions: 'var(--chart-2)',
  'Loyal Customers': 'var(--chart-5)',
  'At-Risk VIPs': 'var(--chart-3)',
  Hibernating: 'var(--destructive)',
};

export const FALLBACK_SEGMENT_COLOR = 'var(--chart-1)';

export function segmentColor(name: string): string {
  return SEGMENT_COLORS[name] ?? FALLBACK_SEGMENT_COLOR;
}

export function riskTier(probability: number): RiskTier {
  if (probability >= 0.8) return 'critical';
  if (probability >= 0.5) return 'high';
  return 'watch';
}

export function riskTierLabel(tier: RiskTier): string {
  if (tier === 'critical') return 'Critical';
  if (tier === 'high') return 'High risk';
  return 'Watchlist';
}

/** CLV exposure weighted by each account's churn probability. */
export function revenueAtRisk(customers: AtRiskCustomer[]): number {
  return customers.reduce(
    (total, customer) => total + customer.clv * Math.min(1, Math.max(0, customer.churnRisk)),
    0,
  );
}

export function averageChurn(customers: AtRiskCustomer[]): number {
  if (customers.length === 0) return 0;
  return customers.reduce((total, customer) => total + customer.churnRisk, 0) / customers.length;
}

export function totalSegmentCustomers(summary: SegmentSummary[]): number {
  return summary.reduce((total, segment) => total + segment.count, 0);
}

export function weightedAverageClv(summary: SegmentSummary[]): number {
  const population = totalSegmentCustomers(summary);
  if (population === 0) return 0;
  const weighted = summary.reduce((total, segment) => total + segment.avg_clv * segment.count, 0);
  return weighted / population;
}

export function monthOverMonthChange(series: { revenue: number }[]): number | null {
  if (series.length < 2) return null;
  const previous = series[series.length - 2]?.revenue ?? 0;
  const latest = series[series.length - 1]?.revenue ?? 0;
  if (previous === 0) return null;
  return (latest - previous) / previous;
}

export function riskDistribution(customers: AtRiskCustomer[]) {
  const buckets = [
    { label: '80–100%', min: 0.8, max: 1.01 },
    { label: '60–80%', min: 0.6, max: 0.8 },
    { label: '40–60%', min: 0.4, max: 0.6 },
    { label: '0–40%', min: 0, max: 0.4 },
  ];

  return buckets.map((bucket) => ({
    label: bucket.label,
    count: customers.filter(
      (customer) => customer.churnRisk >= bucket.min && customer.churnRisk < bucket.max,
    ).length,
  }));
}
