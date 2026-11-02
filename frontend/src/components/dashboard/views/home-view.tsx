'use client';

import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  LayoutDashboard,
  Package,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ViewId } from '@/lib/navigation';

interface Workspace {
  id: ViewId;
  label: string;
  description: string;
  icon: LucideIcon;
}

const WORKSPACES: Workspace[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Revenue, forecast and portfolio health in one place.',
    icon: LayoutDashboard,
  },
  {
    id: 'simulator',
    label: 'Simulator',
    description: 'Score one customer and inspect the CLV and churn drivers.',
    icon: Sparkles,
  },
  {
    id: 'segments',
    label: 'Segments',
    description: 'Compare RFM personas and find the riskiest cohort.',
    icon: Users,
  },
  {
    id: 'at-risk',
    label: 'At-Risk',
    description: 'Work the queue ranked by value-weighted churn exposure.',
    icon: ShieldAlert,
  },
  {
    id: 'products',
    label: 'Products',
    description: 'See top sellers and how concentrated revenue really is.',
    icon: Package,
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Download fresh CSV snapshots for any workspace.',
    icon: FileText,
  },
];

const LIFECYCLE = [
  {
    title: 'Score',
    copy: 'Enter recency, frequency and spend to get a 90-day CLV and churn probability.',
  },
  {
    title: 'Understand',
    copy: 'Break the prediction down by driver, then compare the account to the portfolio.',
  },
  {
    title: 'Act',
    copy: 'Prioritise outreach by exposure, export a call list and draft a win-back email.',
  },
];

export function HomeView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className="space-y-6">
      <section className="surface relative overflow-hidden p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[var(--chart-4)]/10 blur-3xl"
        />

        <div className="relative max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Velora · Customer intelligence
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-[40px] sm:leading-[1.1]">
            Know who to keep, who to win back, and what to sell next.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Velora turns retail transaction history into clear customer decisions. Predict
            lifetime value and churn, understand the drivers, then act on the accounts and
            products that matter most.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button size="lg" onClick={() => onNavigate('overview')}>
              Open dashboard
              <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('simulator')}>
              <Sparkles />
              Score a customer
            </Button>
          </div>

          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: 'Customers', value: '5,878' },
              { label: 'History', value: '2010–2011' },
              { label: 'Horizon', value: '90 days' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border/70 bg-card/60 p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="workspaces-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="workspaces-heading" className="text-lg font-semibold tracking-tight">
              Jump into a workspace
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every view works from the same customer and product data.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {WORKSPACES.map((workspace) => {
            const Icon = workspace.icon;
            return (
              <button
                key={workspace.id}
                type="button"
                onClick={() => onNavigate(workspace.id)}
                className="surface group flex items-start gap-3 p-4 text-left shadow-sm transition-colors hover:border-primary/30"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{workspace.label}</span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {workspace.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">From prediction to action</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A simple loop you can repeat every week.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('batch')}>
            <Upload />
            Score a list
          </Button>
        </div>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {LIFECYCLE.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <p className="mt-2.5 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
