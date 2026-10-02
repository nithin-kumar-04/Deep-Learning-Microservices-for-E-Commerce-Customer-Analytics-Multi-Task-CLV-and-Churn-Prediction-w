import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import { getSegments } from '@/lib/api';
import { Loader2 } from 'lucide-react';

const COLORS: Record<string, string> = {
  "Champions": "#10b981",       // emerald-500
  "Loyal Customers": "#3b82f6", // blue-500
  "At-Risk VIPs": "#f59e0b",    // amber-500
  "Hibernating": "#ef4444"      // red-500
};

export default function SegmentsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSegments().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }
  
  if (!data) return <div>Failed to load segments.</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Customer Personas</CardTitle>
          <CardDescription>Visualizing RFM clusters across the customer base.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" dataKey="recency" name="Recency (Days)" stroke="#9ca3af" />
                <YAxis type="number" dataKey="frequency" name="Frequency" stroke="#9ca3af" />
                <ZAxis type="number" dataKey="clv" range={[50, 400]} name="CLV" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value: any, name: string) => [Number(value).toFixed(2), name]}
                />
                <Scatter name="Customers" data={data.scatter} fill="#8884d8">
                  {data.scatter.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.segment] || "#8884d8"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {Object.entries(COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
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
          <Table>
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
              {data.summary.map((s: any) => (
                <TableRow key={s.Segment} className="border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[s.Segment] || "#8884d8" }} />
                      {s.Segment}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-foreground">{s.count}</TableCell>
                  <TableCell className="text-right text-foreground">£{s.avg_clv.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-foreground">{(s.avg_churn * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right text-foreground">{s.avg_recency.toFixed(1)} days</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
