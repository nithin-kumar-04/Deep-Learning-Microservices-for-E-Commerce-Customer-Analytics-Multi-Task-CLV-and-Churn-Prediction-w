import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProductAnalytics } from '@/lib/api';
import { Loader2, Package } from 'lucide-react';

export default function ProductsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductAnalytics().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }
  if (!data) return <div>Failed to load product analytics.</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Top Selling Products
          </CardTitle>
          <CardDescription>Highest grossing items across all customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-muted-foreground w-24">Stock Code</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground text-right">Unique Buyers</TableHead>
                  <TableHead className="text-muted-foreground text-right">Units Sold</TableHead>
                  <TableHead className="text-muted-foreground text-right">Total Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_products.map((p: any) => (
                  <TableRow key={p.stock_code} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">{p.stock_code}</TableCell>
                    <TableCell className="text-foreground">{p.description}</TableCell>
                    <TableCell className="text-right text-foreground">{p.buyers.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-foreground">{p.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-indigo-400 font-medium">
                      £{p.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}
                    </TableCell>
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
