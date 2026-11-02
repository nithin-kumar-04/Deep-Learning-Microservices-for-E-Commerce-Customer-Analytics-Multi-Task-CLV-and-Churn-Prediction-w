// Shared theme-aware values for Recharts. Recharts renders SVG, so CSS custom
// properties resolve against the active light/dark theme at paint time.
export const chartTheme = {
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)',
  brand: 'var(--chart-1)',
  positive: 'var(--chart-2)',
  warning: 'var(--chart-3)',
  danger: 'var(--destructive)',
  cohort: 'var(--muted-foreground)',
  series: [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ],
  tooltipStyle: {
    backgroundColor: 'var(--popover)',
    borderColor: 'var(--border)',
    borderRadius: '12px',
    color: 'var(--popover-foreground)',
    fontSize: '12px',
    padding: '10px 12px',
    boxShadow: '0 16px 40px -16px rgb(0 0 0 / 0.28)',
  },
  tooltipItemStyle: {
    color: 'var(--popover-foreground)',
  },
  tooltipLabelStyle: {
    color: 'var(--muted-foreground)',
    marginBottom: '4px',
  },
  cursorFill: {
    fill: 'var(--muted)',
    opacity: 0.55,
  },
  cursorStroke: {
    stroke: 'var(--muted-foreground)',
    strokeDasharray: '3 3',
  },
} as const;
