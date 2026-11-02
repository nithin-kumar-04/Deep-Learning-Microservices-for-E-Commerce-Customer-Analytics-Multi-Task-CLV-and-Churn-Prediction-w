'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  Command,
  Database,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';

import { BrandMark, Wordmark } from '@/components/dashboard/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  NAV_GROUPS,
  VIEWS,
  getViewMeta,
  type ViewId,
  type ViewMeta,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';

export interface ApiHealth {
  status: 'checking' | 'online' | 'offline';
  version?: string;
}

interface AppShellProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  health: ApiHealth;
  children: ReactNode;
}

function HealthDot({ status, className }: { status: ApiHealth['status']; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-1.5 rounded-full',
        status === 'online'
          ? 'bg-success shadow-[0_0_0_3px_color-mix(in_oklch,var(--success)_18%,transparent)]'
          : status === 'offline'
            ? 'bg-destructive shadow-[0_0_0_3px_color-mix(in_oklch,var(--destructive)_18%,transparent)]'
            : 'animate-pulse bg-warning',
        className,
      )}
      aria-hidden="true"
    />
  );
}

function NavItem({
  view,
  active,
  collapsed,
  onNavigate,
  onSelect,
}: {
  view: ViewMeta;
  active: boolean;
  collapsed: boolean;
  onNavigate: (view: ViewId) => void;
  onSelect?: () => void;
}) {
  const Icon = view.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onNavigate(view.id);
          onSelect?.();
        }}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? view.label : undefined}
        title={collapsed ? view.label : undefined}
        className={cn(
          'group relative flex w-full items-center rounded-xl text-sm transition-colors',
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 text-left',
          active
            ? 'bg-primary/10 text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
      >
        {active ? (
          <span
            className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
            aria-hidden="true"
          />
        ) : null}
        <Icon
          className={cn(
            'size-4 shrink-0 transition-colors',
            active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          )}
          aria-hidden="true"
        />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{view.label}</span>
            </span>
            <ChevronRight
              className={cn(
                'size-3.5 shrink-0 transition-all',
                active
                  ? 'translate-x-0 text-primary opacity-100'
                  : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60',
              )}
              aria-hidden="true"
            />
          </>
        ) : null}
      </button>
    </li>
  );
}

function NavList({
  activeView,
  onNavigate,
  onSelect,
  collapsed = false,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  onSelect?: () => void;
  collapsed?: boolean;
}) {
  const home = getViewMeta('home');

  return (
    <nav aria-label="Primary" className="space-y-5">
      <ul className="space-y-0.5">
        <NavItem
          view={home}
          active={activeView === 'home'}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onSelect={onSelect}
        />
      </ul>

      {NAV_GROUPS.map((group) => (
        <div key={group}>
          {collapsed ? (
            <div className="mx-auto mb-1.5 h-px w-6 bg-border" aria-hidden="true" />
          ) : (
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {group}
            </p>
          )}
          <ul className={cn('space-y-0.5', !collapsed && 'mt-2')}>
            {VIEWS.filter((view) => view.group === group && view.id !== 'home').map((view) => (
              <NavItem
                key={view.id}
                view={view}
                active={view.id === activeView}
                collapsed={collapsed}
                onNavigate={onNavigate}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ health }: { health: ApiHealth }) {
  const label =
    health.status === 'online'
      ? 'API online'
      : health.status === 'offline'
        ? 'API offline'
        : 'Checking API';

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-border/80 bg-card/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <Database className="size-3.5 text-primary" aria-hidden="true" />
            UCI Online Retail
          </span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
            Demo
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          2010–2011 transaction sample · 5,878 customers
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-card/70 p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Service status
          </span>
          <HealthDot status={health.status} />
        </div>
        <p className="mt-1.5 text-xs font-medium">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {health.status === 'online'
            ? `Model service${health.version ? ` v${health.version}` : ''}`
            : health.status === 'offline'
              ? 'Start the FastAPI service'
              : 'Contacting the prediction service…'}
        </p>
      </div>
    </div>
  );
}

function SidebarContent({
  activeView,
  health,
  onNavigate,
  onSelect,
  collapsed,
}: {
  activeView: ViewId;
  health: ApiHealth;
  onNavigate: (view: ViewId) => void;
  onSelect?: () => void;
  collapsed: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={cn(
          'flex items-center gap-2.5 px-4 py-5 text-left',
          collapsed && 'justify-center px-0',
        )}
        aria-label="Go to Velora home"
      >
        <BrandMark />
        {!collapsed ? <Wordmark /> : null}
      </button>
      <div className={cn('scrollbar-thin flex-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
        <NavList
          activeView={activeView}
          onNavigate={onNavigate}
          onSelect={onSelect}
          collapsed={collapsed}
        />
      </div>
      <div className={cn('border-t border-border/70 py-3', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          <div className="flex justify-center" title={`API ${health.status}`}>
            <HealthDot status={health.status} />
            <span className="sr-only">API status: {health.status}</span>
          </div>
        ) : (
          <>
            <SidebarFooter health={health} />
            <p className="mt-3 px-1 text-[10px] font-medium tracking-wide text-muted-foreground/70">
              Velora · Customer intelligence
            </p>
          </>
        )}
      </div>
    </>
  );
}

function CommandPalette({
  open,
  activeView,
  onClose,
  onNavigate,
}: {
  open: boolean;
  activeView: ViewId;
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const normalized = query.trim().toLowerCase();
  const matches = VIEWS.filter(
    (view) =>
      !normalized ||
      view.label.toLowerCase().includes(normalized) ||
      view.description.toLowerCase().includes(normalized),
  );
  const highlighted = matches.length > 0 ? Math.min(activeIndex, matches.length - 1) : -1;

  const select = (view: ViewId) => {
    onNavigate(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="animate-fade absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-scale-in relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(Math.min(highlighted + 1, matches.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(Math.max(highlighted - 1, 0));
              } else if (event.key === 'Enter' && matches[highlighted]) {
                event.preventDefault();
                select(matches[highlighted].id);
              }
            }}
            placeholder="Jump to a view…"
            aria-label="Search views"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        <ul
          role="listbox"
          aria-label="Views"
          className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2"
        >
          {matches.map((view, index) => {
            const Icon = view.icon;
            const selected = index === highlighted;

            return (
              <li key={view.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(view.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    selected ? 'bg-primary/10' : 'hover:bg-muted/60',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-lg ring-1',
                      selected
                        ? 'bg-primary/10 text-primary ring-primary/20'
                        : 'bg-muted text-muted-foreground ring-border',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{view.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {view.description}
                    </span>
                  </span>
                  {activeView === view.id ? (
                    <Check className="size-4 shrink-0 text-primary" aria-label="Current view" />
                  ) : (
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
          {matches.length === 0 ? (
            <li className="px-3 py-10 text-center text-sm text-muted-foreground">
              No views match &ldquo;{query}&rdquo;.
            </li>
          ) : null}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-3.5 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>↑↓ navigate · ↵ open</span>
          <span className="flex items-center gap-1">
            <Command className="size-3" aria-hidden="true" /> K
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ activeView, onNavigate, health, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const meta = getViewMeta(activeView);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigate = (view: ViewId) => {
    onNavigate(view);
    setDrawerOpen(false);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Ambient backdrop */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] grid-backdrop opacity-60" />
        <div className="absolute -left-32 top-[-12rem] size-[30rem] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -right-40 top-10 size-[26rem] rounded-full bg-[var(--chart-4)]/6 blur-3xl" />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/70 bg-sidebar/80 backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex',
          sidebarCollapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <SidebarContent
          activeView={activeView}
          health={health}
          onNavigate={navigate}
          collapsed={sidebarCollapsed}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-fade absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="animate-rise absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col border-r border-border bg-sidebar shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-5">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="flex items-center gap-2.5 text-left"
                aria-label="Go to Velora home"
              >
                <BrandMark />
                <Wordmark />
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
              <NavList
                activeView={activeView}
                onNavigate={navigate}
                onSelect={() => setDrawerOpen(false)}
              />
            </div>
            <div className="border-t border-border/70 px-3 py-3">
              <SidebarFooter health={health} />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'transition-[padding] duration-200 ease-out',
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64',
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-8">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden lg:inline-flex"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
              title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>

            <div className="hidden min-w-0 items-center gap-1.5 text-xs sm:flex">
              <button
                type="button"
                onClick={() => navigate('home')}
                aria-label="Go to Velora home"
                className="rounded font-semibold tracking-tight transition-colors hover:text-primary"
              >
                Velora
              </button>
              <ChevronRight className="size-3 text-muted-foreground/60" aria-hidden="true" />
              <span className="truncate text-muted-foreground">{meta.label}</span>
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
                className="hidden h-8 items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground md:flex"
              >
                <Search className="size-3.5" aria-hidden="true" />
                <span>Jump to…</span>
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
                className="md:hidden"
              >
                <Search className="size-4" />
              </Button>

              <span
                aria-live="polite"
                aria-label={`API status: ${health.status}`}
                className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex"
              >
                <HealthDot status={health.status} />
                {health.status === 'online' ? 'Live' : health.status === 'offline' ? 'Offline' : 'Checking'}
              </span>

              <ThemeToggle />
            </div>
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] px-3 py-6 outline-none sm:px-5 sm:py-7 lg:px-8 lg:py-8"
        >
          <div key={activeView} className="animate-rise">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        activeView={activeView}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}
