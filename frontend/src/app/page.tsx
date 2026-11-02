'use client';

import { useEffect, useState } from 'react';

import { AppShell, type ApiHealth } from '@/components/dashboard/app-shell';
import { AtRiskView } from '@/components/dashboard/views/at-risk-view';
import { BatchView } from '@/components/dashboard/views/batch-view';
import { OverviewView } from '@/components/dashboard/views/overview-view';
import { ProductsView } from '@/components/dashboard/views/products-view';
import { SegmentsView } from '@/components/dashboard/views/segments-view';
import { SimulatorView } from '@/components/dashboard/views/simulator-view';
import { getHealth } from '@/lib/api';
import type { AtRiskCustomer } from '@/lib/api';
import type { ViewId } from '@/lib/navigation';

interface SimulatorSeed {
  customerId: string;
  nonce: number;
}

export default function Dashboard() {
  const [activeView, setActiveView] = useState<ViewId>('overview');
  const [seed, setSeed] = useState<SimulatorSeed | null>(null);
  const [health, setHealth] = useState<ApiHealth>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    const pollHealth = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const data = await getHealth();
        if (!cancelled) {
          setHealth({ status: 'online', version: data.version });
        }
      } catch {
        if (!cancelled) {
          setHealth((previous) => ({ status: 'offline', version: previous.version }));
        }
      }
    };

    void pollHealth();
    const intervalId = window.setInterval(pollHealth, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void pollHealth();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const navigate = (view: ViewId) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const simulateCustomer = (customer: AtRiskCustomer) => {
    setSeed({ customerId: customer.id, nonce: Date.now() });
    navigate('simulator');
  };

  return (
    <AppShell activeView={activeView} onNavigate={navigate} health={health}>
      {activeView === 'overview' ? <OverviewView onNavigate={navigate} /> : null}
      {activeView === 'simulator' ? (
        <SimulatorView
          key={`simulator-${seed?.nonce ?? 'default'}`}
          initialCustomerId={seed?.customerId}
          onNavigate={navigate}
        />
      ) : null}
      {activeView === 'segments' ? <SegmentsView onNavigate={navigate} /> : null}
      {activeView === 'products' ? <ProductsView onNavigate={navigate} /> : null}
      {activeView === 'at-risk' ? (
        <AtRiskView onNavigate={navigate} onSimulate={simulateCustomer} />
      ) : null}
      {activeView === 'batch' ? <BatchView onNavigate={navigate} /> : null}
    </AppShell>
  );
}
