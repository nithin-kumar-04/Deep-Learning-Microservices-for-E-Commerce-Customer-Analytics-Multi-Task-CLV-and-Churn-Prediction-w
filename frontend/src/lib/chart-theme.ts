// Shared theme-aware values for Recharts. Recharts renders SVG, so CSS custom
// properties resolve against the active light/dark theme at paint time.
export const chartTheme = {
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)',
  brand: '#6366f1',
  positive: '#10b981',
  negative: '#ef4444',
  cohort: 'var(--muted-foreground)',
  tooltipStyle: {
    backgroundColor: 'var(--popover)',
    borderColor: 'var(--border)',
    borderRadius: '8px',
    color: 'var(--popover-foreground)',
    fontSize: '12px',
    boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
  },
  tooltipItemStyle: {
    color: 'var(--popover-foreground)',
  },
  cursorFill: {
    fill: 'var(--muted)',
    opacity: 0.6,
  },
  cursorStroke: {
    stroke: 'var(--muted-foreground)',
    strokeDasharray: '3 3',
  },
} as const;
