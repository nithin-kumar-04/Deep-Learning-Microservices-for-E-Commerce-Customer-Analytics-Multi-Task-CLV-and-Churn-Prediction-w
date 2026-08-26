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
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { predictCLV, getRecommendations, CLVPrediction, Recommendation } from "@/lib/api";
import { User, Activity, DollarSign, RefreshCw, Upload, AlertTriangle, TrendingUp, CheckCircle, Package, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const [customerId, setCustomerId] = useState<string>("12345");
  
  // Simulator State
  const [recency, setRecency] = useState<number>(10);
  const [frequency, setFrequency] = useState<number>(5);
  const [monetary, setMonetary] = useState<number>(500);

  // Predictions State
  const [prediction, setPrediction] = useState<CLVPrediction | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const pred = await predictCLV(recency, frequency, monetary);
      setPrediction(pred);
      
      try {
        const recs = await getRecommendations(Number(customerId));
        setRecommendations(recs.recommendations);
      } catch (recError) {
        console.log("No recommendations found for this user (or backend not seeded yet).");
        setRecommendations([]);
      }
    } catch (err) {
      setError("Failed to fetch predictions. Ensure the FastAPI backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getChurnBadge = (prob: number) => {
    if (prob > 0.5) return <Badge variant="destructive" className="ml-2">High Risk</Badge>;
    if (prob > 0.2) return <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-500">Medium Risk</Badge>;
    return <Badge variant="outline" className="ml-2 border-green-500 text-green-500">Low Risk</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Nexus Analytics
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-green-400" /> System Online</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <Tabs defaultValue="simulator" className="w-full space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-slate-900/80 border border-slate-800">
              <TabsTrigger value="simulator">Customer Simulator</TabsTrigger>
              <TabsTrigger value="batch">Batch Processing</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="simulator" className="space-y-6 focus:outline-none">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Controls */}
              <div className="lg:col-span-4 space-y-6">
                
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-400" />
                      Customer Profile
                    </CardTitle>
                    <CardDescription className="text-slate-400">Select or enter a customer ID to analyze.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Quick Picks</label>
                      <Select onValueChange={(v) => setCustomerId(v)}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-300">
                          <SelectValue placeholder="Select a preset profile" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                          <SelectItem value="12345">High Value / Low Churn (12345)</SelectItem>
                          <SelectItem value="13000">At-Risk VIP (13000)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Customer ID</label>
                      <Input 
                        value={customerId} 
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-purple-400" />
                      What-If Simulator
                    </CardTitle>
                    <CardDescription className="text-slate-400">Adjust RFM features to simulate DL predictions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <label className="font-medium text-slate-300">Recency (Days)</label>
                        <span className="text-indigo-400 font-mono">{recency}</span>
                      </div>
                      <Slider 
                        value={[recency]} 
                        onValueChange={(v) => setRecency(v[0])} 
                        max={365} 
                        step={1} 
                        className="[&_[role=slider]]:bg-indigo-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <label className="font-medium text-slate-300">Frequency (Orders)</label>
                        <span className="text-indigo-400 font-mono">{frequency}</span>
                      </div>
                      <Slider 
                        value={[frequency]} 
                        onValueChange={(v) => setFrequency(v[0])} 
                        max={50} 
                        step={1} 
                        className="[&_[role=slider]]:bg-indigo-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <label className="font-medium text-slate-300">Monetary ($)</label>
                        <span className="text-indigo-400 font-mono">${monetary.toFixed(2)}</span>
                      </div>
                      <Input 
                        type="number" 
                        value={monetary} 
                        onChange={(e) => setMonetary(Number(e.target.value))}
                        className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500 font-mono"
                      />
                    </div>

                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handlePredict} 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all"
                    >
                      {loading ? "Running Models..." : "Generate AI Insights"}
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
                  <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2">
                      <CardDescription className="text-slate-400 uppercase tracking-wider font-semibold text-xs">
                        Predicted 90-Day CLV
                      </CardDescription>
                      <CardTitle className="text-4xl font-light text-slate-50 flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-indigo-500" />
                        {prediction ? prediction.predicted_clv_90d.toFixed(2) : "0.00"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-500">
                        Projected value over the next quarter based on deep learning forecasting.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Churn Card */}
                  <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2">
                      <CardDescription className="text-slate-400 uppercase tracking-wider font-semibold text-xs flex justify-between items-center">
                        Churn Risk
                        {prediction && getChurnBadge(prediction.churn_probability)}
                      </CardDescription>
                      <CardTitle className="text-4xl font-light text-slate-50 flex items-end gap-1">
                        {prediction ? (prediction.churn_probability * 100).toFixed(1) : "0.0"}
                        <span className="text-xl text-slate-500 mb-1">%</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Progress 
                        value={prediction ? prediction.churn_probability * 100 : 0} 
                        className={`h-1.5 ${prediction && prediction.churn_probability > 0.5 ? '[&>div]:bg-red-500' : '[&>div]:bg-indigo-500'}`}
                      />
                      <p className="text-sm text-slate-500">Probability of account going dormant.</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Visual Analytics Chart */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-indigo-400" />
                      Behavioral Metrics vs Cohort Average
                    </CardTitle>
                    <CardDescription className="text-slate-400">
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
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-400" />
                      Hyper-Personalized Recommendations
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Neural Collaborative Filtering (NCF) product affinities for this profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recommendations.length > 0 ? (
                      <div className="rounded-md border border-slate-800 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-950/50">
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className="w-16 text-slate-400">Rank</TableHead>
                              <TableHead className="text-slate-400">Product Code</TableHead>
                              <TableHead className="text-slate-400">Description</TableHead>
                              <TableHead className="text-right text-slate-400">Affinity Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recommendations.map((rec) => (
                              <TableRow key={rec.rank} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <TableCell className="font-medium text-slate-300">#{rec.rank}</TableCell>
                                <TableCell className="font-mono text-xs text-indigo-400">{rec.stock_code}</TableCell>
                                <TableCell className="text-slate-300">{rec.description}</TableCell>
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
                      <div className="h-40 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500">
                        <Package className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No recommendations generated.</p>
                        <p className="text-xs">Run a prediction or ensure the user exists in the model.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="focus:outline-none">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl max-w-2xl mx-auto mt-10">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <CardTitle className="text-2xl font-light">Batch Processing</CardTitle>
                <CardDescription className="text-slate-400">
                  Upload a CSV with `CustomerID`, `Recency`, `Frequency`, `Monetary` to score multiple users instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500/50 hover:bg-slate-800/30 transition-all cursor-pointer">
                  <Upload className="w-8 h-8 mb-3 text-slate-500" />
                  <p className="text-sm font-medium text-slate-300">Click to upload CSV</p>
                  <p className="text-xs mt-1">or drag and drop here</p>
                </div>
                <Button className="w-full bg-slate-100 hover:bg-white text-slate-900 font-medium">
                  Process Batch File
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
