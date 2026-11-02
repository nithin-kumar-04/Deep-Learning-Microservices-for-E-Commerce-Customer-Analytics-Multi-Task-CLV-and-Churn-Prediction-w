'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ErrorState';
import { getProductAnalytics, type ProductAnalytics } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { Package } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

function ProductsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading product analytics">
      <div className="rounded-xl border border-border p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="mb-2 h-9 w-full last:mb-0" />
        ))}
      </div>
    </div>
  );
}

export default function ProductsTab() {
  const { data, loading, error, retry } = useApiData<ProductAnalytics>(
    'product-analytics',
    getProductAnalytics,
  );

  if (loading && !data) return <ProductsSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return <ErrorState title="No product data" message="The API returned an empty product report." onRetry={retry} />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" aria-hidden="true" />
            Top Selling Products
          </CardTitle>
          <CardDescription>Highest grossing items across all customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table className="min-w-[720px]">
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
                {data.top_products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No product metrics are available.
                    </TableCell>
                  </TableRow>
                ) : data.top_products.map((product) => (
                  <TableRow key={product.stock_code} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">{product.stock_code}</TableCell>
                    <TableCell className="text-foreground">{product.description}</TableCell>
                    <TableCell className="text-right text-foreground">{product.buyers.toLocaleString('en-GB')}</TableCell>
                    <TableCell className="text-right text-foreground">{product.quantity.toLocaleString('en-GB')}</TableCell>
                    <TableCell className="text-right text-indigo-500 font-medium">
                      {formatCurrency(product.revenue)}
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
