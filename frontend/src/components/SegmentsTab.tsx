'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ErrorState';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import { getSegments, type SegmentsResponse, type SegmentPoint } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { chartTheme } from '@/lib/chart-theme';

const SEGMENT_COLORS: Record<string, string> = {
  'Champions': '#10b981',
  'Loyal Customers': '#3b82f6',
  'At-Risk VIPs': '#f59e0b',
  'Hibernating': '#ef4444',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

function SegmentsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading customer segments">
      <Skeleton className="h-96 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function SegmentsTab() {
  const { data, loading, error, retry } = useApiData<SegmentsResponse>('segments', getSegments);

  if (loading && !data) return <SegmentsSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return <ErrorState title="No segment data" message="The API returned an empty segment report." onRetry={retry} />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Customer Personas</CardTitle>
          <CardDescription>Visualizing RFM clusters across the customer base.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.scatter.length > 0 ? (
            <div
              className="h-96 w-full"
              role="img"
              aria-label="Scatter chart of customers by recency, frequency and lifetime value"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis type="number" dataKey="recency" name="Recency (Days)" stroke={chartTheme.axis} tickLine={false} />
                  <YAxis type="number" dataKey="frequency" name="Frequency" stroke={chartTheme.axis} tickLine={false} />
                  <ZAxis type="number" dataKey="clv" range={[50, 400]} name="CLV" />
                  <Tooltip 
                    cursor={chartTheme.cursorStroke}
                    contentStyle={chartTheme.tooltipStyle}
                    itemStyle={chartTheme.tooltipItemStyle}
                    formatter={(value, name) => [Number(value ?? 0).toFixed(2), String(name ?? '')]}
                  />
                  <Scatter name="Customers" data={data.scatter} fill={chartTheme.brand}>
                    {data.scatter.map((entry: SegmentPoint, index: number) => (
                      <Cell key={`cell-${entry.id}-${index}`} fill={SEGMENT_COLORS[entry.segment] || chartTheme.brand} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No customer points are available.</p>
          )}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
            {Object.entries(SEGMENT_COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                <span className="text-sm text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Segment Aggregate Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">Segment</TableHead>
                  <TableHead className="text-muted-foreground text-right">Population</TableHead>
                  <TableHead className="text-muted-foreground text-right">Avg CLV (£)</TableHead>
                  <TableHead className="text-muted-foreground text-right">Avg Churn Risk</TableHead>
                  <TableHead className="text-muted-foreground text-right">Avg Recency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No segment metrics are available.
                    </TableCell>
                  </TableRow>
                ) : data.summary.map((segment) => (
                  <TableRow key={segment.Segment} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SEGMENT_COLORS[segment.Segment] || chartTheme.brand }}
                          aria-hidden="true"
                        />
                        {segment.Segment}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-foreground">{segment.count.toLocaleString('en-GB')}</TableCell>
                    <TableCell className="text-right text-foreground">{formatCurrency(segment.avg_clv)}</TableCell>
                    <TableCell className="text-right text-foreground">{(segment.avg_churn * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-foreground">{segment.avg_recency.toFixed(1)} days</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
