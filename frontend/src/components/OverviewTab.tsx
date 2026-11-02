'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ErrorState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBusinessOverview, type BusinessOverview } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { chartTheme } from '@/lib/chart-theme';
import { TrendingUp, PoundSterling } from 'lucide-react';

const formatCurrency = (value: number, minimumFractionDigits = 0) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading business overview">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function OverviewTab() {
  const { data, loading, error, retry } = useApiData<BusinessOverview>(
    'business-overview',
    getBusinessOverview,
  );

  if (loading && !data) return <OverviewSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return <ErrorState title="No overview data" message="The API returned an empty overview." onRetry={retry} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Historical Revenue (Last 12M)</CardTitle>
            <PoundSterling className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(data.total_historical)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">90-Day ML Forecast</CardTitle>
            <TrendingUp className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-500">{formatCurrency(data.forecast_90d)}</div>
            <p className="text-xs text-muted-foreground mt-1">Aggregated predicted CLV</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Revenue Trajectory</CardTitle>
          <CardDescription>Historical monthly revenue.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.historical_monthly.length > 0 ? (
            <div
              className="h-96 w-full"
              role="img"
              aria-label="Line chart of historical monthly revenue"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.historical_monthly} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="date" stroke={chartTheme.axis} tickLine={false} />
                  <YAxis stroke={chartTheme.axis} tickLine={false} tickFormatter={(value) => `£${value/1000}k`} />
                  <Tooltip 
                    cursor={{ stroke: chartTheme.axis, strokeDasharray: '3 3' }}
                    contentStyle={chartTheme.tooltipStyle}
                    itemStyle={chartTheme.tooltipItemStyle}
                    formatter={(value) => [formatCurrency(Number(value ?? 0), 0), 'Revenue']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={chartTheme.brand}
                    strokeWidth={3}
                    dot={{ r: 4, fill: chartTheme.brand }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No revenue history is available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
