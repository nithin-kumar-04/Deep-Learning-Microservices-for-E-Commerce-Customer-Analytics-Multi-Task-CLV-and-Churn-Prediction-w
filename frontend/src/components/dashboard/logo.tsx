import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl',
        'bg-gradient-to-br from-primary via-primary to-[var(--chart-4)]',
        'text-primary-foreground shadow-lg shadow-primary/25',
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgb(255_255_255/0.45),transparent_55%)]" />
      <svg viewBox="0 0 24 24" className="relative size-5" fill="none">
        <path
          d="M5.5 7.5 12 18l6.5-10.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[15px] font-semibold leading-none tracking-tight">Velora</p>
      {!compact ? (
        <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Customer intelligence
        </p>
      ) : null}
    </div>
  );
}
