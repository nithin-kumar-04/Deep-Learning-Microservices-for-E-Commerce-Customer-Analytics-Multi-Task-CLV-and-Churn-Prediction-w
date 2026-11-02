'use client';

import { useId, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Minus,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { clamp, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_ICON: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/12 text-warning ring-warning/25',
  danger: 'bg-destructive/10 text-destructive ring-destructive/20',
  neutral: 'bg-muted text-muted-foreground ring-border',
};

const TONE_BAR: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
};

const TONE_STROKE: Record<Tone, string> = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--destructive)',
  neutral: 'var(--muted-foreground)',
};

export function riskTone(probability: number): Extract<Tone, 'success' | 'warning' | 'danger'> {
  if (probability >= 0.8) return 'danger';
  if (probability >= 0.5) return 'warning';
  return 'success';
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  footer,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={cn('surface flex flex-col shadow-sm', className)}>
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon ? (
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
              {description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn('min-w-0 flex-1 p-4 sm:p-5', bodyClassName)}>{children}</div>
      {footer ? <div className="border-t border-border/70 px-4 py-3 sm:px-5">{footer}</div> : null}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  tone = 'primary',
  hint,
  trend,
  spark,
  footer,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: string;
  trend?: { label: string; direction: 'up' | 'down'; positive: boolean };
  spark?: number[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'surface group relative overflow-hidden p-4 shadow-sm transition-colors hover:border-primary/30',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-primary/8 blur-2xl transition-opacity group-hover:opacity-100 sm:opacity-70"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
            {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
          </div>
        </div>
        {Icon ? (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-xl ring-1',
              TONE_ICON[tone],
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {trend ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                trend.positive
                  ? 'bg-success/10 text-success'
                  : trend.direction === 'down'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="size-3" aria-hidden="true" />
              ) : trend.direction === 'down' ? (
                <ArrowDownRight className="size-3" aria-hidden="true" />
              ) : (
                <Minus className="size-3" aria-hidden="true" />
              )}
              {trend.label}
            </span>
          ) : null}
          {hint ? <p className="text-xs leading-snug text-muted-foreground">{hint}</p> : null}
        </div>
        {spark && spark.length > 1 ? (
          <Sparkline data={spark} tone={tone} className="h-9 w-20 shrink-0 opacity-90" />
        ) : null}
      </div>
      {footer ? <div className="relative mt-3 border-t border-border/70 pt-3">{footer}</div> : null}
    </div>
  );
}

export function Sparkline({
  data,
  tone = 'primary',
  className,
}: {
  data: number[];
  tone?: Tone;
  className?: string;
}) {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? 100 / (data.length - 1) : 100;

  const points = data.map((value, index) => {
    const x = index * step;
    const y = 30 - ((value - min) / range) * 26 - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TONE_STROKE[tone]} stopOpacity="0.28" />
          <stop offset="100%" stopColor={TONE_STROKE[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,32 ${points.join(' ')} 100,32`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={TONE_STROKE[tone]}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function RiskBadge({
  probability,
  label,
  className,
}: {
  probability: number;
  label?: string;
  className?: string;
}) {
  const tone = riskTone(probability);
  const styles = {
    danger: 'border-destructive/25 bg-destructive/10 text-destructive',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    success: 'border-success/25 bg-success/10 text-success',
  }[tone];
  const text = label ?? (tone === 'danger' ? 'Critical' : tone === 'warning' ? 'High risk' : 'Watch');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        styles,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {text}
    </span>
  );
}

export function Meter({
  value,
  tone = 'primary',
  label,
  className,
}: {
  value: number;
  tone?: Tone;
  label?: string;
  className?: string;
}) {
  const pct = clamp(value, 0, 1) * 100;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', TONE_BAR[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function RiskGauge({
  value,
  size = 'md',
  label = 'Churn risk',
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const safe = clamp(value, 0, 1);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const arc = 0.75;
  const tone = riskTone(safe);
  const dimension = size === 'sm' ? 64 : size === 'lg' ? 132 : 104;

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label={`${label}: ${formatPercent(safe, 0)}`}
    >
      <svg viewBox="0 0 100 100" className="size-full">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * arc} ${circumference}`}
          transform="rotate(135 50 50)"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * arc * safe} ${circumference}`}
          transform="rotate(135 50 50)"
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-semibold tabular-nums',
            size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg',
          )}
        >
          {formatPercent(safe, 0)}
        </span>
        {size !== 'sm' ? (
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            churn
          </span>
        ) : null}
      </div>
    </div>
  );
}

const ALERT_STYLES = {
  info: { icon: Info, className: 'border-primary/20 bg-primary/5 text-primary' },
  success: { icon: CheckCircle2, className: 'border-success/25 bg-success/5 text-success' },
  warning: { icon: TriangleAlert, className: 'border-warning/25 bg-warning/5 text-warning' },
  error: { icon: XCircle, className: 'border-destructive/25 bg-destructive/5 text-destructive' },
} as const;

export function InlineAlert({
  variant = 'info',
  title,
  children,
  action,
}: {
  variant?: keyof typeof ALERT_STYLES;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const { icon: Icon, className } = ALERT_STYLES[variant];

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-3.5', className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        {children ? <div className="text-muted-foreground [&_a]:underline">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Pill({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        tone === 'neutral'
          ? 'border-border bg-background/60 text-muted-foreground'
          : 'border-transparent bg-primary/10 text-primary',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CustomerAvatar({ value, className }: { value: string; className?: string }) {
  const digits = value.replace(/\D/g, '');
  const short = digits ? `#${digits.slice(-3)}` : value.slice(0, 3).toUpperCase();

  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10px] font-semibold text-primary ring-1 ring-primary/15',
        className,
      )}
      aria-hidden="true"
    >
      {short}
    </span>
  );
}
