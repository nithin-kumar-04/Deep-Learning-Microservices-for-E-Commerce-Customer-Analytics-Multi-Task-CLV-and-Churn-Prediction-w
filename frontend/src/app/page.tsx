"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { predictCLV, explainCLV, getRecommendations, getHealth, getAtRiskCustomers, batchPredict, getCustomerRFM, generateEmail, CLVPrediction, CLVExplanation, Recommendation, AtRiskCustomer, HealthStatus } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { chartTheme } from "@/lib/chart-theme";
import { useApiData } from "@/lib/use-api-data";
import axios from 'axios';
import { User, Activity, PoundSterling, RefreshCw, Upload, AlertTriangle, TrendingUp, Package, BarChart2, ChevronLeft, ChevronRight, Download, Loader2, FileText, Mail, Copy, Check } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

const OverviewTab = dynamic(() => import('@/components/OverviewTab'), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const SegmentsTab = dynamic(() => import('@/components/SegmentsTab'), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const ProductsTab = dynamic(() => import('@/components/ProductsTab'), {
  ssr: false,
  loading: () => <TabSkeleton />,
});

function TabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function Dashboard() {
  const [customerId, setCustomerId] = useState<string>("12345");
  
  // Simulator State
  const [recency, setRecency] = useState<number>(10);
  const [frequency, setFrequency] = useState<number>(5);
  const [monetary, setMonetary] = useState<number>(500);

  // Predictions State
  const [prediction, setPrediction] = useState<CLVPrediction | null>(null);
  const [explanation, setExplanation] = useState<CLVExplanation | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ status: 'checking' | 'online' | 'offline'; version?: string }>({ status: 'checking' });
  
  // Batch State
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [batchInputKey, setBatchInputKey] = useState(0);

  // Email state
  const [emailTemplate, setEmailTemplate] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const pollHealth = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const data: HealthStatus = await getHealth();
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

  const atRisk = useApiData<AtRiskCustomer[]>(
    'at-risk-customers',
    getAtRiskCustomers,
    { ttlMs: 60_000 },
  );
  const highRiskCustomers = atRisk.data ?? [];

  useEffect(() => {
    if (!emailCopied) return;
    const timeoutId = window.setTimeout(() => setEmailCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [emailCopied]);

  const escapeCsvValue = (value: string | number) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const exportToCSV = () => {
    if (highRiskCustomers.length === 0) return;
    const headers = ['Customer ID', 'Churn Risk (%)', 'Predicted CLV (£)', 'Recency (Days)', 'Frequency (Orders)', 'Status'];
    const rows = highRiskCustomers.map((customer) => [
      customer.id,
      (customer.churnRisk * 100).toFixed(1),
      customer.clv.toFixed(2),
      customer.recency,
      customer.freq,
      customer.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'high_risk_customers.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  };

  const handlePredict = async (r = recency, f = frequency, m = monetary, cId = customerId) => {
    setLoading(true);
    setError(null);
    setRecError(null);
    try {
      const [pred, expl] = await Promise.all([
        predictCLV(r, f, m),
        explainCLV(r, f, m)
      ]);
      setPrediction(pred);
      setExplanation(expl);

      const numericCustomerId = Number(cId);
      if (!Number.isFinite(numericCustomerId) || numericCustomerId <= 0) {
        setRecommendations([]);
        setRecError('Enter a valid customer ID to load product recommendations.');
        return;
      }

      try {
        const recs = await getRecommendations(numericCustomerId);
        setRecommendations(recs.recommendations);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setRecError("Customer ID not found in the product interaction database.");
        } else {
          setRecError(getApiErrorMessage(err, 'Recommendations are temporarily unavailable.'));
        }
        setRecommendations([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch predictions. Ensure the API is running.'));
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerProfile = async (cId: string) => {
    const trimmedId = cId.trim();
    if (!/^\d+$/.test(trimmedId)) {
      setError('Enter a valid numeric customer ID.');
      return;
    }

    setCustomerId(trimmedId);
    setLoading(true);
    setError(null);
    setEmailTemplate(null);
    setEmailError(null);
    try {
      const rfm = await getCustomerRFM(trimmedId);
      setRecency(rfm.recency);
      setFrequency(rfm.frequency);
      setMonetary(rfm.monetary);
      await handlePredict(rfm.recency, rfm.frequency, rfm.monetary, trimmedId);
    } catch {
      // Keep the current slider values when the customer has no stored RFM
      // profile, but still score the inputs so the dashboard stays useful.
      await handlePredict(recency, frequency, monetary, trimmedId);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPick = (presetId: string) => {
    setCustomerId(presetId);
    let r = recency, f = frequency, m = monetary;
    if (presetId === "12345") {
      r = 10; f = 25; m = 1500;
    } else if (presetId === "13000") {
      r = 150; f = 2; m = 100;
    }
    setRecency(r);
    setFrequency(f);
    setMonetary(m);
    void handlePredict(r, f, m, presetId);
  };

  const parsedCustomerId = Number.parseInt(customerId, 10);
  const hasValidCustomerId = Number.isFinite(parsedCustomerId) && parsedCustomerId > 0;

  const stepCustomerId = (delta: number) => {
    if (!hasValidCustomerId) return;
    void loadCustomerProfile(String(Math.max(1, parsedCustomerId + delta)));
  };

  const handleGenerateEmail = async () => {
    const trimmedId = customerId.trim();
    if (!/^\d+$/.test(trimmedId)) {
      setEmailError('Enter a valid customer ID first.');
      return;
    }

    setEmailLoading(true);
    setEmailError(null);
    setEmailTemplate(null);
    try {
      const res = await generateEmail(trimmedId);
      setEmailTemplate(res.email_template);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setEmailError('Customer not found. Choose a valid customer ID first.');
      } else {
        setEmailError(getApiErrorMessage(err, 'Could not generate the email draft. Please try again.'));
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!emailTemplate) return;
    try {
      await navigator.clipboard.writeText(emailTemplate);
      setEmailCopied(true);
    } catch {
      setEmailError('Could not copy the draft automatically. Select the text and copy it manually.');
    }
  };

  const resetBatchInput = () => {
    setBatchInputKey((key) => key + 1);
  };

  const clearBatchFile = () => {
    setBatchFile(null);
    setBatchError(null);
    setBatchSuccess(null);
    resetBatchInput();
  };

  const validateBatchFile = async (file: File): Promise<string | null> => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return 'Choose a .csv file.';
    }
    if (file.size === 0) {
      return 'That file is empty. Add rows and try again.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'That file is larger than 5 MB. Split it into smaller batches.';
    }

    const firstLine = (await file.slice(0, 4096).text()).split(/\r?\n/, 1)[0] ?? '';
    const headers = firstLine
      .replace(/^\uFEFF/, '')
      .split(',')
      .map((header) => header.trim().replace(/^"|"$/g, '').toLowerCase());
    const required = ['customerid', 'recency', 'frequency', 'monetary'];
    const missing = required.filter((header) => !headers.includes(header));
    if (missing.length > 0) {
      return `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Expected CustomerID, Recency, Frequency, Monetary.`;
    }
    return null;
  };

  const handleBatchFile = async (file: File | null) => {
    setBatchError(null);
    setBatchSuccess(null);
    if (!file) {
      setBatchFile(null);
      return;
    }

    const validationError = await validateBatchFile(file);
    if (validationError) {
      setBatchFile(null);
      setBatchError(validationError);
      resetBatchInput();
      return;
    }
    setBatchFile(file);
  };

  const handleBatchDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleBatchFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleBatchSubmit = async () => {
    if (!batchFile) return;
    setBatchLoading(true);
    setBatchError(null);
    setBatchSuccess(null);
    try {
      const blob = await batchPredict(batchFile);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'batch_predictions.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
      setBatchSuccess('Batch scored successfully. Your download should start automatically.');
      setBatchFile(null);
      resetBatchInput();
    } catch (err) {
      setBatchError(getApiErrorMessage(err, 'Batch processing failed. Check the file format and try again.'));
    } finally {
      setBatchLoading(false);
    }
  };

  const getChurnBadge = (prob: number) => {
    if (prob > 0.5) return <Badge variant="destructive" className="ml-2">High Risk</Badge>;
    if (prob > 0.2) return <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Medium Risk</Badge>;
    return <Badge variant="outline" className="ml-2 border-green-500 text-green-600 dark:text-green-400">Low Risk</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-background to-purple-50/50 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/20 text-foreground font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-border bg-card backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
              Velora
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <span className="hidden md:inline text-xs border border-border px-3 py-1.5 rounded-full bg-background/50">
              Demo data: UCI Online Retail, 2010–2011{health.version ? ` (v${health.version})` : ''}
            </span>
            <span className="flex items-center gap-1.5" aria-live="polite">
              <Activity
                aria-hidden="true"
                className={`w-4 h-4 ${
                  health.status === 'online'
                    ? 'text-green-500'
                    : health.status === 'offline'
                      ? 'text-red-500'
                      : 'text-amber-500 animate-pulse'
                }`}
              />
              {health.status === 'checking' ? 'Checking…' : health.status === 'online' ? 'System Online' : 'System Offline'}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <Tabs defaultValue="simulator" className="w-full space-y-6">
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="bg-card/60 backdrop-blur-md border border-border/50 p-1 rounded-xl h-auto flex-nowrap w-max min-w-full justify-start shadow-sm">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-500">Overview</TabsTrigger>
              <TabsTrigger value="simulator" className="rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-500">Customer Simulator</TabsTrigger>
              <TabsTrigger value="segments" className="rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-500">Segments</TabsTrigger>
              <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-500">Products</TabsTrigger>
              <TabsTrigger value="batch" className="rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-500">Batch Processing</TabsTrigger>
              <TabsTrigger value="high-risk" className="rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-500">At-Risk Customers</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="focus:outline-none">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="segments" className="focus:outline-none">
            <SegmentsTab />
          </TabsContent>

          <TabsContent value="products" className="focus:outline-none">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6 focus:outline-none">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Controls */}
              <div className="lg:col-span-4 space-y-6">
                
                <Card className="bg-card/60 border-border/50 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-400" />
                      Customer Profile
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Select or enter a customer ID to analyze.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="quick-picks" className="text-sm font-medium text-foreground">Quick Picks</label>
                      <Select onValueChange={(val) => handleQuickPick(val as string)}>
                        <SelectTrigger id="quick-picks" className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select a preset profile" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                          <SelectItem value="12345">High Value / Low Churn (12345)</SelectItem>
                          <SelectItem value="13000">At-Risk VIP (13000)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="customer-id" className="text-sm font-medium text-foreground">Customer ID</label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => stepCustomerId(-1)}
                          disabled={!hasValidCustomerId || parsedCustomerId <= 1}
                          aria-label="Load previous customer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Input 
                          id="customer-id"
                          value={customerId} 
                          onChange={(e) => setCustomerId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && void loadCustomerProfile(customerId)}
                          inputMode="numeric"
                          aria-describedby="customer-id-hint"
                          className="bg-background border-border focus-visible:ring-indigo-500 text-center" 
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => stepCustomerId(1)}
                          disabled={!hasValidCustomerId}
                          aria-label="Load next customer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <p id="customer-id-hint" className="text-xs text-muted-foreground mt-1">Press Enter to load profile</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/60 border-border/50 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-purple-400" />
                      What-If Simulator
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Adjust RFM features to simulate DL predictions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">Recency (Days)</span>
                        <span className="text-indigo-400 font-mono">{recency}</span>
                      </div>
                      <Slider 
                        value={[recency]} 
                        onValueChange={(v) => setRecency(Array.isArray(v) ? v[0] : (v as number))} 
                        max={365} 
                        step={1} 
                        labels={["Recency in days"]}
                        className="[&_[role=slider]]:bg-indigo-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">Frequency (Orders)</span>
                        <span className="text-indigo-400 font-mono">{frequency}</span>
                      </div>
                      <Slider 
                        value={[frequency]} 
                        onValueChange={(v) => setFrequency(Array.isArray(v) ? v[0] : (v as number))} 
                        max={50} 
                        step={1} 
                        labels={["Frequency in orders"]}
                        className="[&_[role=slider]]:bg-indigo-500"
                      />
                      {/* Purchase History Timeline Mockup */}
                      <div className="pt-2">
                        <div className="text-xs text-muted-foreground mb-1">Simulated Purchase Timeline (Last 365 Days)</div>
                        <div className="flex gap-1 h-2 w-full rounded overflow-hidden bg-muted">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className={`flex-1 ${((i * 7 + 3) % 50) < frequency ? 'bg-indigo-500' : 'bg-transparent'}`} title={`Month ${12 - i} ago`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <label htmlFor="monetary" className="font-medium text-foreground">Monetary (£)</label>
                        <span className="text-indigo-400 font-mono">£{(Number.isFinite(monetary) ? monetary : 0).toFixed(2)}</span>
                      </div>
                      <Input 
                        id="monetary"
                        type="number" 
                        min={0}
                        step="0.01"
                        value={Number.isFinite(monetary) ? monetary : 0}
                        onChange={(e) => setMonetary(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="bg-background border-border focus-visible:ring-indigo-500 font-mono"
                      />
                    </div>

                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => void handlePredict()} 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all"
                    >
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running Models...</> : "Generate AI Insights"}
                    </Button>
                  </CardFooter>
                </Card>

              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-8 space-y-6">
                
                {error && (
                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CLV Card */}
                  <Card className="bg-card/60 border-border/50 backdrop-blur-md relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2">
                      <CardDescription className="text-muted-foreground uppercase tracking-wider font-semibold text-xs">
                        Predicted 90-Day CLV
                      </CardDescription>
                      <CardTitle className="text-4xl font-light text-foreground flex items-center gap-2">
                        <PoundSterling className="w-8 h-8 text-indigo-500" />
                        {prediction ? prediction.predicted_clv_90d.toFixed(2) : "—"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Projected value over the next quarter based on deep learning forecasting.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Churn Card */}
                  <Card className="bg-card/60 border-border/50 backdrop-blur-md relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300">
                     <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2">
                      <CardDescription className="text-muted-foreground uppercase tracking-wider font-semibold text-xs flex justify-between items-center">
                        Churn Risk
                        {prediction && getChurnBadge(prediction.churn_probability)}
                      </CardDescription>
                      <CardTitle className="text-4xl font-light text-foreground flex items-end gap-1">
                        {prediction ? (prediction.churn_probability * 100).toFixed(1) : "—"}
                        <span className="text-xl text-muted-foreground mb-1">%</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Progress 
                        value={prediction ? prediction.churn_probability * 100 : 0} 
                        aria-label="Predicted churn risk"
                        className={`[&_[data-slot=progress-track]]:h-1.5 ${prediction && prediction.churn_probability > 0.5 ? '[&_[data-slot=progress-indicator]]:bg-red-500' : '[&_[data-slot=progress-indicator]]:bg-indigo-500'}`}
                      />
                      <p className="text-sm text-muted-foreground">Probability of account going dormant.</p>
                      
                      {/* XAI: SHAP Explanations */}
                      {explanation && (
                        <div className="pt-3 mt-3 border-t border-border">
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-indigo-400" /> AI Rationale (SHAP Contributions)
                          </p>
                          <div
                            className="h-40 w-full mt-4"
                            role="img"
                            aria-label="Bar chart of SHAP feature contributions to churn risk"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                layout="vertical" 
                                data={[
                                  { name: 'Recency', value: explanation.contributions.Recency },
                                  { name: 'Frequency', value: explanation.contributions.Frequency },
                                  { name: 'Monetary', value: explanation.contributions.Monetary },
                                ]} 
                                margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={true} vertical={false} />
                                <XAxis type="number" stroke={chartTheme.axis} fontSize={10} tickFormatter={(val) => `${(val*100).toFixed(0)}%`} />
                                <YAxis dataKey="name" type="category" stroke={chartTheme.axis} fontSize={11} axisLine={false} tickLine={false} />
                                <RechartsTooltip 
                                  cursor={chartTheme.cursorFill}
                                  contentStyle={chartTheme.tooltipStyle}
                                  itemStyle={chartTheme.tooltipItemStyle}
                                  formatter={(val) => [`${Number(val) > 0 ? '+' : ''}${(Number(val) * 100).toFixed(1)}%`, 'Effect on Churn Risk']}
                                />
                                <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                  {
                                    [
                                      explanation.contributions.Recency,
                                      explanation.contributions.Frequency,
                                      explanation.contributions.Monetary
                                    ].map((val, index) => (
                                      <Cell key={`cell-${index}`} fill={val > 0 ? chartTheme.negative : chartTheme.positive} />
                                    ))
                                  }
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Base value (average customer): <strong>{(explanation.base_value * 100).toFixed(1)}%</strong>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Visual Analytics Chart */}
                <Card className="bg-card/60 border-border/50 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-indigo-400" />
                      Behavioral Metrics vs Demo Cohort Average
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Visualizing current RFM inputs relative to standard segment baselines.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    <div
                      className="h-full w-full"
                      role="img"
                      aria-label="Bar chart comparing this customer's RFM inputs with the demo cohort average"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Recency (Days)', user: recency, avg: 45 },
                          { name: 'Frequency (x10)', user: frequency * 10, avg: 50 },
                          { name: 'Spend (£) / 10', user: (Number.isFinite(monetary) ? monetary : 0) / 10, avg: 60 },
                        ]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                          <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                            cursor={chartTheme.cursorFill}
                            contentStyle={chartTheme.tooltipStyle}
                            itemStyle={chartTheme.tooltipItemStyle}
                          />
                          <Bar dataKey="user" fill={chartTheme.brand} radius={[4, 4, 0, 0]} name="This Customer" />
                          <Bar dataKey="avg" fill={chartTheme.cohort} radius={[4, 4, 0, 0]} name="Cohort Average" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="bg-card/60 border-border/50 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-400" />
                      Hyper-Personalized Recommendations
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Neural Collaborative Filtering (NCF) product affinities for this profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recommendations.length > 0 ? (
                      <div className="rounded-md border border-border overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-background/50">
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="w-16 text-muted-foreground">Rank</TableHead>
                              <TableHead className="text-muted-foreground">Product Code</TableHead>
                              <TableHead className="text-muted-foreground">Description</TableHead>
                              <TableHead className="text-right text-muted-foreground">Affinity Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recommendations.map((rec) => (
                              <TableRow key={rec.rank} className="border-border hover:bg-muted/50 transition-colors">
                                <TableCell className="font-medium text-foreground">#{rec.rank}</TableCell>
                                <TableCell className="font-mono text-xs text-indigo-400">{rec.stock_code}</TableCell>
                                <TableCell className="text-foreground">{rec.description}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-medium text-foreground">
                                      {(rec.affinity_score * 100).toFixed(0)}%
                                    </span>
                                    <Progress
                                      value={rec.affinity_score * 100}
                                      aria-label={`Affinity score for ${rec.description}`}
                                      className="w-16 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-indicator]]:bg-purple-500"
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground p-4 text-center">
                        {recError ? (
                          <>
                            <AlertTriangle className="w-8 h-8 mb-2 opacity-50 text-red-400" />
                            <p className="text-sm text-red-400">{recError}</p>
                          </>
                        ) : (
                          <>
                            <Package className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">No recommendations generated.</p>
                            <p className="text-xs">Run a prediction or ensure the user exists in the model.</p>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                      onClick={() => void handleGenerateEmail()}
                      disabled={emailLoading}
                    >
                      {emailLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      Draft Win-Back Email
                    </Button>
                    
                    {emailError && (
                      <div role="alert" className="w-full p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-sm text-center">
                        {emailError}
                      </div>
                    )}

                    {emailTemplate && (
                      <div className="w-full overflow-hidden rounded-md border border-border bg-muted/50 text-left">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email draft</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleCopyEmail()}
                            aria-label={emailCopied ? 'Email draft copied' : 'Copy email draft'}
                          >
                            {emailCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {emailCopied ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-sm text-foreground">
                          {emailTemplate}
                        </pre>
                      </div>
                    )}
                  </CardFooter>
                </Card>

              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="focus:outline-none">
            <Card className="bg-card/60 border-border/50 backdrop-blur-md shadow-xl max-w-2xl mx-auto mt-10 transition-all duration-300">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <CardTitle className="text-2xl font-light">Batch Processing</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Upload a CSV with `CustomerID`, `Recency`, `Frequency`, `Monetary` to score multiple users instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <label 
                  htmlFor="batch-upload"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleBatchDrop}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-muted-foreground transition-all cursor-pointer relative ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-border hover:border-indigo-500/50 hover:bg-muted/40'
                  }`}
                >
                  <input 
                    key={batchInputKey}
                    type="file" 
                    id="batch-upload" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".csv,text/csv"
                    onChange={(event) => void handleBatchFile(event.target.files?.[0] ?? null)}
                  />
                  {batchFile ? (
                    <>
                      <FileText className="w-8 h-8 mb-3 text-indigo-400" />
                      <p className="text-sm font-medium text-foreground">{batchFile.name}</p>
                      <p className="text-xs mt-1">Ready to process — click or drop to replace</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-3 text-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {isDragging ? 'Drop your CSV here' : 'Click to upload CSV'}
                      </p>
                      <p className="text-xs mt-1">or drag and drop here · max 5 MB</p>
                    </>
                  )}
                </label>

                {batchFile && (
                  <div className="flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={clearBatchFile}>
                      Remove selected file
                    </Button>
                  </div>
                )}

                {batchError && (
                  <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{batchError}</span>
                  </div>
                )}

                {batchSuccess && (
                  <div role="status" className="flex items-start gap-2 rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{batchSuccess}</span>
                  </div>
                )}

                <Button 
                  onClick={() => void handleBatchSubmit()} 
                  disabled={!batchFile || batchLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {batchLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Process Batch File"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="high-risk" className="focus:outline-none">
            <Card className="bg-card/60 border-border/50 backdrop-blur-md shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-2xl font-light">At-Risk Customers</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Top customers identified by the Deep Learning model with highest probability of churn.
                  </CardDescription>
                </div>
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={highRiskCustomers.length === 0 || atRisk.loading}
                >
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="pt-6" aria-busy={atRisk.loading}>
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Customer ID</TableHead>
                        <TableHead className="text-muted-foreground">Churn Risk</TableHead>
                        <TableHead className="text-muted-foreground">Predicted CLV</TableHead>
                        <TableHead className="text-muted-foreground">Recency</TableHead>
                        <TableHead className="text-muted-foreground">Frequency</TableHead>
                        <TableHead className="text-right text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atRisk.loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={`at-risk-skeleton-${index}`}>
                            <TableCell colSpan={6} className="py-2">
                              <Skeleton className="h-8 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : atRisk.error ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10">
                            <div role="alert" className="flex flex-col items-center gap-3 text-center">
                              <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
                              <p className="text-sm text-muted-foreground">{atRisk.error}</p>
                              <Button variant="outline" size="sm" onClick={atRisk.retry}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Try again
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : highRiskCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            No at-risk customers found.
                          </TableCell>
                        </TableRow>
                      ) : highRiskCustomers.map((customer) => (
                        <TableRow key={customer.id} className="border-border hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium text-foreground">#{customer.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{ (customer.churnRisk * 100).toFixed(1) }%</span>
                              <Progress
                                value={customer.churnRisk * 100}
                                aria-label={`Churn risk for customer ${customer.id}`}
                                className="w-16 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-indicator]]:bg-red-500"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground">£{customer.clv.toFixed(2)}</TableCell>
                          <TableCell className="text-foreground">{customer.recency} days</TableCell>
                          <TableCell className="text-foreground">{customer.freq} orders</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={customer.churnRisk > 0.8 ? "destructive" : "secondary"} className={customer.churnRisk > 0.8 ? "" : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"}>
                              {customer.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
