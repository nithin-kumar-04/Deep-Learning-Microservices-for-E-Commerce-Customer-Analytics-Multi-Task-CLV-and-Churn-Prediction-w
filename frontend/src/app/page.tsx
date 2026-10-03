"use client";

import React, { useState } from 'react';
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
import { predictCLV, explainCLV, getRecommendations, checkHealth, getAtRiskCustomers, batchPredict, getCustomerRFM, generateEmail, CLVPrediction, CLVExplanation, Recommendation } from "@/lib/api";
import { User, Activity, PoundSterling, RefreshCw, Upload, AlertTriangle, TrendingUp, Package, BarChart2, ChevronLeft, ChevronRight, Download, Loader2, FileText, Mail } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ThemeToggle } from "@/components/theme-toggle";
import SegmentsTab from '@/components/SegmentsTab';
import OverviewTab from '@/components/OverviewTab';
import ProductsTab from '@/components/ProductsTab';

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
  const [isSystemOnline, setIsSystemOnline] = useState<boolean>(true);
  
  // At-Risk State
  const [highRiskCustomers, setHighRiskCustomers] = useState<any[]>([]);
  const [atRiskLoading, setAtRiskLoading] = useState(false);
  
  // Batch State
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Email state
  const [emailTemplate, setEmailTemplate] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleGenerateEmail = async () => {
    setEmailLoading(true);
    setEmailError(null);
    try {
      const res = await generateEmail(customerId);
      setEmailTemplate(res.email_template);
    } catch (e) {
      console.error(e);
      setEmailError("Failed to generate email. Customer may not exist.");
    } finally {
      setEmailLoading(false);
    }
  };

  React.useEffect(() => {
    const pollHealth = async () => {
      const isOnline = await checkHealth();
      setIsSystemOnline(isOnline);
    };
    pollHealth();
    const intervalId = setInterval(pollHealth, 30000);
    return () => clearInterval(intervalId);
  }, []);

  React.useEffect(() => {
    const fetchAtRisk = async () => {
      try {
        setAtRiskLoading(true);
        const data = await getAtRiskCustomers();
        setHighRiskCustomers(data);
      } catch (err) {
        console.error("Failed to fetch at risk customers", err);
      } finally {
        setAtRiskLoading(false);
      }
    };
    fetchAtRisk();
  }, []);

  const exportToCSV = () => {
    const headers = ["Customer ID,Churn Risk (%),Predicted CLV (£),Recency,Frequency,Status"];
    const rows = highRiskCustomers.map(c => 
      `${c.id},${(c.churnRisk * 100).toFixed(1)},${c.clv.toFixed(2)},${c.recency},${c.freq},${c.status}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "high_risk_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      
      try {
        const recs = await getRecommendations(Number(cId));
        setRecommendations(recs.recommendations);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setRecError("Customer ID not found in the product interaction database.");
        }
        setRecommendations([]);
      }
    } catch (err) {
      setError("Failed to fetch predictions. Ensure the FastAPI backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerProfile = async (cId: string) => {
    setCustomerId(cId);
    setLoading(true);
    setError(null);
    setEmailTemplate(null);
    setEmailError(null);
    try {
      const rfm = await getCustomerRFM(cId);
      setRecency(rfm.recency);
      setFrequency(rfm.frequency);
      setMonetary(rfm.monetary);
      await handlePredict(rfm.recency, rfm.frequency, rfm.monetary, cId);
    } catch (err) {
      // If customer not found, we don't overwrite sliders, but we still try to predict 
      // (which will fail for recommendations but work for CLV)
      await handlePredict(recency, frequency, monetary, cId);
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
    handlePredict(r, f, m, presetId);
  };
  
  const handleBatchSubmit = async () => {
    if (!batchFile) return;
    setBatchLoading(true);
    try {
      const blob = await batchPredict(batchFile);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "batch_predictions.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("Batch processing failed. Check the file format.");
    } finally {
      setBatchLoading(false);
    }
  };

  const getChurnBadge = (prob: number) => {
    if (prob > 0.5) return <Badge variant="destructive" className="ml-2">High Risk</Badge>;
    if (prob > 0.2) return <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-500">Medium Risk</Badge>;
    return <Badge variant="outline" className="ml-2 border-green-500 text-green-500">Low Risk</Badge>;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-border bg-card backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Zenthiqa
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <span className="hidden md:inline text-xs border border-border px-2 py-1 rounded-md">
              Demo data: UCI Online Retail, 2010–2011 (v1.0.0)
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className={`w-4 h-4 ${isSystemOnline ? 'text-green-400' : 'text-red-400'}`} /> 
              {isSystemOnline ? 'System Online' : 'System Offline'}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <Tabs defaultValue="simulator" className="w-full space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted border border-border">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="simulator">Customer Simulator</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="batch">Batch Processing</TabsTrigger>
              <TabsTrigger value="high-risk">At-Risk Customers</TabsTrigger>
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
                
                <Card className="bg-card border-border backdrop-blur-sm shadow-xl">
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
                          onClick={() => loadCustomerProfile(String(Math.max(1, parseInt(customerId) - 1)))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Input 
                          id="customer-id"
                          value={customerId} 
                          onChange={(e) => setCustomerId(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadCustomerProfile(customerId)}
                          className="bg-background border-border focus-visible:ring-indigo-500 text-center" 
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => loadCustomerProfile(String(parseInt(customerId) + 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Press Enter to load profile</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border backdrop-blur-sm shadow-xl">
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
                        <label className="font-medium text-foreground">Recency (Days)</label>
                        <span className="text-indigo-400 font-mono">{recency}</span>
                      </div>
                      <Slider 
                        value={[recency]} 
                        onValueChange={(v) => setRecency(Array.isArray(v) ? v[0] : (v as number))} 
                        max={365} 
                        step={1} 
                        className="[&_[role=slider]]:bg-indigo-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <label className="font-medium text-foreground">Frequency (Orders)</label>
                        <span className="text-indigo-400 font-mono">{frequency}</span>
                      </div>
                      <Slider 
                        value={[frequency]} 
                        onValueChange={(v) => setFrequency(Array.isArray(v) ? v[0] : (v as number))} 
                        max={50} 
                        step={1} 
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
                        <label className="font-medium text-foreground">Monetary (£)</label>
                        <span className="text-indigo-400 font-mono">£{monetary.toFixed(2)}</span>
                      </div>
                      <Input 
                        type="number" 
                        value={monetary} 
                        onChange={(e) => setMonetary(Number(e.target.value))}
                        className="bg-background border-border focus-visible:ring-indigo-500 font-mono"
                      />
                    </div>

                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handlePredict()} 
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
                  <Card className="bg-card border-border relative overflow-hidden group">
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
                  <Card className="bg-card border-border relative overflow-hidden group">
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
                        className={`h-1.5 ${prediction && prediction.churn_probability > 0.5 ? '[&>div]:bg-red-500' : '[&>div]:bg-indigo-500'}`}
                      />
                      <p className="text-sm text-muted-foreground">Probability of account going dormant.</p>
                      
                      {/* XAI: SHAP Explanations */}
                      {explanation && (
                        <div className="pt-3 mt-3 border-t border-border">
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-indigo-400" /> AI Rationale (SHAP Contributions)
                          </p>
                          <div className="h-40 w-full mt-4">
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
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(val) => `${(val*100).toFixed(0)}%`} />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                                <RechartsTooltip 
                                  cursor={{fill: '#1e293b', opacity: 0.4}}
                                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                                  itemStyle={{ color: '#f8fafc' }}
                                  formatter={(val: any) => [`${Number(val) > 0 ? '+' : ''}${(Number(val) * 100).toFixed(1)}%`, 'Effect on Churn Risk']}
                                />
                                <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                  {
                                    [
                                      explanation.contributions.Recency,
                                      explanation.contributions.Frequency,
                                      explanation.contributions.Monetary
                                    ].map((val, index) => (
                                      <Cell key={`cell-${index}`} fill={val > 0 ? '#ef4444' : '#10b981'} />
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
                <Card className="bg-card border-border">
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
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Recency (Days)', user: recency, avg: 45 },
                        { name: 'Frequency (x10)', user: frequency * 10, avg: 50 },
                        { name: 'Spend ($) / 10', user: monetary / 10, avg: 60 },
                      ]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          cursor={{fill: '#1e293b', opacity: 0.4}}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                          itemStyle={{ color: '#f8fafc' }}
                        />
                        <Bar dataKey="user" fill="#6366f1" radius={[4, 4, 0, 0]} name="This Customer" />
                        <Bar dataKey="avg" fill="#334155" radius={[4, 4, 0, 0]} name="Cohort Average" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="bg-card border-border">
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
                      <div className="rounded-md border border-border overflow-hidden">
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
                                    <span className="text-sm font-medium text-slate-200">
                                      {(rec.affinity_score * 100).toFixed(0)}%
                                    </span>
                                    <Progress value={rec.affinity_score * 100} className="w-16 h-1.5 [&>div]:bg-purple-500" />
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
                      onClick={handleGenerateEmail}
                      disabled={emailLoading}
                    >
                      {emailLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      Draft Win-Back Email
                    </Button>
                    
                    {emailError && (
                      <div className="w-full p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-sm text-center">
                        {emailError}
                      </div>
                    )}

                    {emailTemplate && (
                      <div className="w-full p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono text-muted-foreground text-left">
                        {emailTemplate}
                      </div>
                    )}
                  </CardFooter>
                </Card>

              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="focus:outline-none">
            <Card className="bg-card border-border shadow-xl max-w-2xl mx-auto mt-10">
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
                  className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-muted-foreground hover:border-indigo-500/50 hover:bg-slate-800/30 transition-all cursor-pointer relative"
                >
                  <input 
                    type="file" 
                    id="batch-upload" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".csv"
                    onChange={(e) => setBatchFile(e.target.files?.[0] || null)}
                  />
                  {batchFile ? (
                    <>
                      <FileText className="w-8 h-8 mb-3 text-indigo-400" />
                      <p className="text-sm font-medium text-foreground">{batchFile.name}</p>
                      <p className="text-xs mt-1">Ready to process</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-3 text-foreground" />
                      <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                      <p className="text-xs mt-1">or drag and drop here</p>
                    </>
                  )}
                </label>
                <Button 
                  onClick={handleBatchSubmit} 
                  disabled={!batchFile || batchLoading}
                  className="w-full bg-slate-100 hover:bg-white text-slate-900 font-medium"
                >
                  {batchLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Process Batch File"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="high-risk" className="focus:outline-none">
            <Card className="bg-card border-border shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-2xl font-light">At-Risk Customers</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Top customers identified by the Deep Learning model with highest probability of churn.
                  </CardDescription>
                </div>
                <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
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
                    {atRiskLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Analyzing entire customer base...
                        </TableCell>
                      </TableRow>
                    ) : highRiskCustomers.map((customer) => (
                      <TableRow key={customer.id} className="border-border hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium text-foreground">#{customer.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{ (customer.churnRisk * 100).toFixed(1) }%</span>
                            <Progress value={customer.churnRisk * 100} className="w-16 h-1.5 [&>div]:bg-red-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">£{customer.clv.toFixed(2)}</TableCell>
                        <TableCell className="text-foreground">{customer.recency} days</TableCell>
                        <TableCell className="text-foreground">{customer.freq} orders</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={customer.churnRisk > 0.8 ? "destructive" : "secondary"} className={customer.churnRisk > 0.8 ? "" : "bg-yellow-500/20 text-yellow-500"}>
                            {customer.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
