'use client';

import { useState } from 'react';
import {
  Download,
  FileText,
  Layers,
  Loader2,
  Package,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import { PageHeader, Panel, Pill } from '@/components/dashboard/ui-kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  getAtRiskCustomers,
  getBusinessOverview,
  getProductAnalytics,
  getSegments,
} from '@/lib/api';
import { downloadCsv, toCsv } from '@/lib/csv';
import { getApiErrorMessage } from '@/lib/errors';
import { customerExposure, revenueAtRisk, riskTier, riskTierLabel } from '@/lib/insights';
import type { ViewId } from '@/lib/navigation';

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  filename: string;
  icon: LucideIcon;
  view: ViewId;
  run: () => Promise<void>;
}

export function ReportsView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportPortfolio = async () => {
    const [overview, atRisk] = await Promise.all([
      getBusinessOverview(),
      getAtRiskCustomers(),
    ]);
    const monthly = overview.historical_monthly;
    const firstMonth = monthly[0]?.date ?? 'n/a';
    const latestMonth = monthly[monthly.length - 1]?.date ?? 'n/a';
    const averageMonthly = monthly.length > 0 ? overview.total_historical / monthly.length : 0;

    const rows: (string | number)[][] = [
      ['Total historical revenue (GBP)', overview.total_historical.toFixed(2)],
      ['90-day forecast (GBP)', overview.forecast_90d.toFixed(2)],
      ['Months covered', monthly.length],
      ['Average monthly revenue (GBP)', averageMonthly.toFixed(2)],
      ['First month', firstMonth],
      ['Latest month', latestMonth],
      ['At-risk accounts', atRisk.length],
      ['At-risk exposure (GBP)', revenueAtRisk(atRisk).toFixed(2)],
    ];

    downloadCsv('velora-portfolio-summary.csv', toCsv(['Metric', 'Value'], rows));
    toast({
      title: 'Portfolio summary exported',
      description: 'velora-portfolio-summary.csv downloaded.',
      variant: 'success',
    });
  };

  const exportSegments = async () => {
    const { summary } = await getSegments();
    const total = summary.reduce((count, segment) => count + segment.count, 0);
    const headers = [
      'Segment',
      'Customers',
      'Share (%)',
      'Avg Recency (days)',
      'Avg Frequency (orders)',
      'Avg Monetary (GBP)',
      'Avg CLV (GBP)',
      'Avg Churn (%)',
    ];
    const rows: (string | number)[][] = [...summary]
      .sort((a, b) => b.count - a.count)
      .map((segment) => [
        segment.Segment,
        segment.count,
        total > 0 ? ((segment.count / total) * 100).toFixed(2) : '0.00',
        segment.avg_recency.toFixed(1),
        segment.avg_frequency.toFixed(2),
        segment.avg_monetary.toFixed(2),
        segment.avg_clv.toFixed(2),
        (segment.avg_churn * 100).toFixed(2),
      ]);

    downloadCsv('velora-segments.csv', toCsv(headers, rows));
    toast({
      title: 'Segment report exported',
      description: 'velora-segments.csv downloaded.',
      variant: 'success',
    });
  };

  const exportAtRisk = async () => {
    const customers = await getAtRiskCustomers();
    const headers = [
      'Customer ID',
      'Churn risk (%)',
      'Predicted CLV (GBP)',
      'Exposure (GBP)',
      'Recency (days)',
      'Frequency (orders)',
      'Risk tier',
      'Status',
    ];
    const rows: (string | number)[][] = [...customers]
      .sort((a, b) => customerExposure(b) - customerExposure(a))
      .map((customer) => [
        customer.id,
        (customer.churnRisk * 100).toFixed(1),
        customer.clv.toFixed(2),
        customerExposure(customer).toFixed(2),
        customer.recency,
        customer.freq,
        riskTierLabel(riskTier(customer.churnRisk)),
        customer.status,
      ]);

    downloadCsv('velora-at-risk.csv', toCsv(headers, rows));
    toast({
      title: 'At-risk report exported',
      description: 'velora-at-risk.csv downloaded.',
      variant: 'success',
    });
  };

  const exportProducts = async () => {
    const { top_products: products } = await getProductAnalytics();
    const headers = [
      'Stock Code',
      'Description',
      'Revenue (GBP)',
      'Quantity sold',
      'Unique buyers',
      'Revenue per unit (GBP)',
    ];
    const rows: (string | number)[][] = [...products]
      .sort((a, b) => b.revenue - a.revenue)
      .map((product) => [
        product.stock_code,
        product.description,
        product.revenue.toFixed(2),
        product.quantity,
        product.buyers,
        product.quantity > 0 ? (product.revenue / product.quantity).toFixed(2) : '0.00',
      ]);

    downloadCsv('velora-products.csv', toCsv(headers, rows));
    toast({
      title: 'Product report exported',
      description: 'velora-products.csv downloaded.',
      variant: 'success',
    });
  };

  const reports: ReportDefinition[] = [
    {
      id: 'portfolio',
      title: 'Portfolio summary',
      description: 'Historical revenue, 90-day forecast and total at-risk exposure.',
      filename: 'velora-portfolio-summary.csv',
      icon: TrendingUp,
      view: 'overview',
      run: exportPortfolio,
    },
    {
      id: 'segments',
      title: 'Segment breakdown',
      description: 'Persona size, share, RFM averages, CLV and churn.',
      filename: 'velora-segments.csv',
      icon: Layers,
      view: 'segments',
      run: exportSegments,
    },
    {
      id: 'at-risk',
      title: 'At-risk queue',
      description: 'Prioritised accounts with churn risk, CLV and exposure.',
      filename: 'velora-at-risk.csv',
      icon: ShieldAlert,
      view: 'at-risk',
      run: exportAtRisk,
    },
    {
      id: 'products',
      title: 'Product performance',
      description: 'Revenue, quantity, unique buyers and revenue per unit.',
      filename: 'velora-products.csv',
      icon: Package,
      view: 'products',
      run: exportProducts,
    },
  ];

  const handleExport = async (report: ReportDefinition) => {
    if (exporting) return;
    setExporting(report.id);
    try {
      await report.run();
    } catch (error) {
      toast({
        title: 'Export failed',
        description: getApiErrorMessage(error, 'Could not build that report. Please try again.'),
        variant: 'error',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analyse"
        title="Reports"
        description="Download a fresh CSV snapshot of any dashboard view. Files are generated on demand from the Velora API."
        actions={<Pill>{reports.length} reports</Pill>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {reports.map((report) => {
          const Icon = report.icon;
          const busy = exporting === report.id;

          return (
            <Panel
              key={report.id}
              className="h-full"
              title={report.title}
              description={report.description}
              icon={Icon}
              action={<Pill>CSV</Pill>}
              footer={
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate(report.view)}
                    aria-label={`View ${report.title}`}
                  >
                    View source
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleExport(report)}
                    disabled={exporting !== null}
                    aria-label={`Export ${report.title}`}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : <Download />}
                    {busy ? 'Exporting…' : 'Export'}
                  </Button>
                </div>
              }
            >
              <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {report.filename}
                </p>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title="Export details" description="What each file contains." icon={FileText}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Portfolio summary</span> includes total
            historical revenue, the 90-day forecast, monthly coverage and total at-risk exposure.
          </li>
          <li>
            <span className="font-medium text-foreground">Segment breakdown</span> lists every RFM
            persona with its customer count, share of the base, average RFM values, CLV and churn.
          </li>
          <li>
            <span className="font-medium text-foreground">At-risk queue</span> exports every account
            sorted by exposure, with churn risk, predicted CLV, recency, frequency and risk tier.
          </li>
          <li>
            <span className="font-medium text-foreground">Product performance</span> exports the
            product catalogue ranked by revenue with quantity, unique buyers and revenue per unit.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
