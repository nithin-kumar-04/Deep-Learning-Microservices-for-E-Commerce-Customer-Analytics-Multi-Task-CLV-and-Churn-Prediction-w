const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat('en-GB');

const compact = new Intl.NumberFormat('en-GB', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number, precise = false): string {
  const safe = Number.isFinite(value) ? value : 0;
  return precise ? currencyPrecise.format(safe) : currency.format(safe);
}

export function formatNumber(value: number): string {
  return number.format(Number.isFinite(value) ? value : 0);
}

export function formatCompactNumber(value: number): string {
  return compact.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${(safe * 100).toFixed(fractionDigits)}%`;
}

export function formatMonth(value: string): string {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(date);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
