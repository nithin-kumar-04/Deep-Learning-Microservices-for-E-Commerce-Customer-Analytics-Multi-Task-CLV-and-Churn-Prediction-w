'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Mail,
  PackageSearch,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react';

import {
  CustomerAvatar,
  EmptyState,
  InlineAlert,
  Meter,
  PageHeader,
  Panel,
  Pill,
  RiskBadge,
  RiskGauge,
  riskTone,
} from '@/components/dashboard/ui-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/toast';
import {
  explainCLV,
  generateEmail,
  getCustomerRFM,
  getRecommendations,
  getSegments,
  predictCLV,
  type CLVExplanation,
  type CLVPrediction,
  type Recommendation,
} from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatCurrency, formatPercent } from '@/lib/format';
import { weightedSegmentBenchmark } from '@/lib/insights';
import type { ViewId } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useApiData } from '@/lib/use-api-data';

const PRESETS = [
  { id: '12345', name: 'High value', detail: 'Recent, frequent, high spend', r: 10, f: 25, m: 1500 },
  { id: '13000', name: 'At-risk VIP', detail: 'High value, long absence', r: 150, f: 2, m: 100 },
];

interface RunResult {
  prediction: CLVPrediction;
  explanation: CLVExplanation;
}

function RunDelta({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        tone === 'success'
          ? 'bg-success/10 text-success'
          : tone === 'warning'
            ? 'bg-warning/10 text-warning'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {label} {value}
    </span>
  );
}

function ShapBars({ explanation }: { explanation: CLVExplanation }) {
  const rows = [
    { name: 'Recency', value: explanation.contributions.Recency },
    { name: 'Frequency', value: explanation.contributions.Frequency },
    { name: 'Monetary', value: explanation.contributions.Monetary },
  ];
  const maxAbs = Math.max(0.0001, ...rows.map((row) => Math.abs(row.value)));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row) => {
          const positive = row.value >= 0;
          return (
            <div
              key={row.name}
              className="grid grid-cols-[72px_minmax(0,1fr)_58px] items-center gap-3 text-xs"
            >
              <span className="font-medium">{row.name}</span>
              <div className="relative h-6 overflow-hidden rounded-md bg-muted/50">
                <span
                  className="absolute inset-y-0 left-1/2 z-10 w-px bg-border"
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'absolute inset-y-1 rounded-sm transition-all duration-500',
                    positive ? 'left-1/2 bg-destructive/75' : 'right-1/2 bg-success/75',
                  )}
                  style={{ width: `${(Math.abs(row.value) / maxAbs) * 47}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-right font-mono text-[11px] font-medium',
                  positive ? 'text-destructive' : 'text-success',
                )}
              >
                {positive ? '+' : ''}
                {(row.value * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-success/75" aria-hidden="true" />
          Lowers risk
        </span>
        <span>
          Baseline <strong className="font-medium text-foreground">{formatPercent(explanation.base_value)}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          Raises risk
          <span className="size-2 rounded-full bg-destructive/75" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

export function SimulatorView({
  initialCustomerId,
  onNavigate,
}: {
  initialCustomerId?: string;
  onNavigate: (view: ViewId) => void;
}) {
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '12345');
  const [recency, setRecency] = useState(10);
  const [frequency, setFrequency] = useState(5);
  const [monetary, setMonetary] = useState(500);

  const [result, setResult] = useState<RunResult | null>(null);
  const [previousResult, setPreviousResult] = useState<RunResult | null>(null);
  const resultRef = useRef<RunResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  const segments = useApiData('segments', getSegments);
  const prediction = result?.prediction ?? null;
  const explanation = result?.explanation ?? null;

  const [emailTemplate, setEmailTemplate] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  const seededRef = useRef(false);

  useEffect(() => {
    if (!emailCopied) return;
    const timeoutId = window.setTimeout(() => setEmailCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [emailCopied]);

  const runPrediction = async (r = recency, f = frequency, m = monetary, cId = customerId) => {
    setLoading(true);
    setError(null);
    setRecError(null);
    try {
      const [pred, expl] = await Promise.all([predictCLV(r, f, m), explainCLV(r, f, m)]);
      const nextResult: RunResult = {
        prediction: pred,
        explanation: expl,
      };
      const previous = resultRef.current;
      resultRef.current = nextResult;
      setResult(nextResult);
      setPreviousResult(previous);

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
          setRecError('Customer ID not found in the product interaction database.');
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

  // When the queue hands us a customer, pull their stored RFM profile and
  // score it straight away so the simulator opens on real behaviour.
  useEffect(() => {
    if (!initialCustomerId || seededRef.current) return;
    seededRef.current = true;

    const loadSeededProfile = async () => {
      setLoading(true);
      setError(null);
      resultRef.current = null;
      setPreviousResult(null);
      try {
        const rfm = await getCustomerRFM(initialCustomerId);
        setRecency(rfm.recency);
        setFrequency(rfm.frequency);
        setMonetary(rfm.monetary);
        await runPrediction(rfm.recency, rfm.frequency, rfm.monetary, initialCustomerId);
      } catch {
        await runPrediction();
      } finally {
        setLoading(false);
      }
    };

    void loadSeededProfile();
    // The seed is applied once per mount; the page remounts with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    resultRef.current = null;
    setPreviousResult(null);
    try {
      const rfm = await getCustomerRFM(trimmedId);
      setRecency(rfm.recency);
      setFrequency(rfm.frequency);
      setMonetary(rfm.monetary);
      await runPrediction(rfm.recency, rfm.frequency, rfm.monetary, trimmedId);
    } catch {
      // The customer may not have a stored RFM profile. Keep the current
      // slider values and still score them so the view stays useful.
      await runPrediction(recency, frequency, monetary, trimmedId);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPick = (presetId: string) => {
    const preset = PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setCustomerId(preset.id);
    setRecency(preset.r);
    setFrequency(preset.f);
    setMonetary(preset.m);
    setEmailTemplate(null);
    resultRef.current = null;
    setPreviousResult(null);
    void runPrediction(preset.r, preset.f, preset.m, preset.id);
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
      const message = 'Enter a valid customer ID first.';
      setEmailError(message);
      toast({ title: 'Customer ID required', description: message, variant: 'error' });
      return;
    }

    setEmailLoading(true);
    setEmailError(null);
    setEmailTemplate(null);
    try {
      const res = await generateEmail(trimmedId);
      setEmailTemplate(res.email_template);
      toast({
        title: 'Win-back draft ready',
        description: `Personalised for customer #${trimmedId}.`,
        variant: 'success',
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setEmailError('Customer not found. Choose a valid customer ID first.');
      } else {
        setEmailError(
          getApiErrorMessage(err, 'Could not generate the email draft. Please try again.'),
        );
      }
      toast({ title: 'Could not draft the email', variant: 'error' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!emailTemplate) return;
    try {
      await navigator.clipboard.writeText(emailTemplate);
      setEmailCopied(true);
      toast({ title: 'Draft copied', variant: 'success' });
    } catch {
      setEmailError('Could not copy the draft automatically. Select the text and copy it manually.');
    }
  };

  const benchmark = segments.data ? weightedSegmentBenchmark(segments.data.summary) : null;
  const benchmarkRows = benchmark
    ? [
        {
          label: 'Recency',
          value: `${recency} days`,
          benchmark: `${Math.round(benchmark.recency)} days`,
          ratio: benchmark.recency > 0 ? recency / benchmark.recency : 0,
          better: recency <= benchmark.recency,
        },
        {
          label: 'Frequency',
          value: `${frequency} orders`,
          benchmark: `${benchmark.frequency.toFixed(1)} orders`,
          ratio: benchmark.frequency > 0 ? frequency / benchmark.frequency : 0,
          better: frequency >= benchmark.frequency,
        },
        {
          label: 'Monetary',
          value: formatCurrency(monetary, true),
          benchmark: formatCurrency(benchmark.monetary, true),
          ratio: benchmark.monetary > 0 ? monetary / benchmark.monetary : 0,
          better: monetary >= benchmark.monetary,
        },
      ]
    : [];

  const clvDelta =
    prediction && previousResult
      ? prediction.predicted_clv_90d - previousResult.prediction.predicted_clv_90d
      : null;
  const clvDeltaShare =
    clvDelta != null && previousResult && previousResult.prediction.predicted_clv_90d !== 0
      ? clvDelta / previousResult.prediction.predicted_clv_90d
      : null;
  const churnDelta =
    prediction && previousResult
      ? prediction.churn_probability - previousResult.prediction.churn_probability
      : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Individual scoring"
        title="Customer simulator"
        description="Move the behavioural levers and see how the CLV and churn models respond — then turn the result into an action."
        meta={
          <>
            <Pill>
              <Activity className="size-3" aria-hidden="true" />
              LightGBM CLV
            </Pill>
            <Pill>
              <Sparkles className="size-3" aria-hidden="true" />
              SHAP explanations
            </Pill>
            <Pill>
              <PackageSearch className="size-3" aria-hidden="true" />
              NCF recommendations
            </Pill>
          </>
        }
        actions={
          <Button variant="outline" onClick={() => onNavigate('at-risk')}>
            View at-risk queue
            <ChevronRight />
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.65fr)]">
        <div className="space-y-5">
          <Panel
            title="Customer profile"
            description="Start from a preset or load a stored RFM profile."
            icon={User}
          >
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {PRESETS.map((preset) => {
                  const selected = customerId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleQuickPick(preset.id)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-colors',
                        selected
                          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border bg-background/40 hover:border-primary/25 hover:bg-muted/40',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{preset.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          #{preset.id}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                        {preset.detail}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label htmlFor="customer-id" className="text-xs font-medium text-foreground">
                  Customer ID
                </label>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => stepCustomerId(-1)}
                    disabled={!hasValidCustomerId || parsedCustomerId <= 1}
                    aria-label="Load previous customer"
                  >
                    <ChevronLeft />
                  </Button>
                  <Input
                    id="customer-id"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void loadCustomerProfile(customerId);
                    }}
                    inputMode="numeric"
                    aria-describedby="customer-id-hint"
                    className="h-9 flex-1 text-center font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => stepCustomerId(1)}
                    disabled={!hasValidCustomerId}
                    aria-label="Load next customer"
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p id="customer-id-hint" className="text-[11px] text-muted-foreground">
                    Press Enter to load the stored profile.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => void loadCustomerProfile(customerId)}
                  >
                    Load
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="What-if inputs"
            description="Adjust RFM values, then re-score the profile."
            icon={SlidersHorizontal}
          >
            <div className="space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium" htmlFor="recency-slider">
                    Recency
                  </label>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {recency} days
                  </span>
                </div>
                <Slider
                  id="recency-slider"
                  value={[recency]}
                  onValueChange={(value) =>
                    setRecency(Array.isArray(value) ? value[0] : (value as number))
                  }
                  min={0}
                  max={365}
                  step={1}
                  labels={['Recency in days']}
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium" htmlFor="frequency-slider">
                    Frequency
                  </label>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {frequency} orders
                  </span>
                </div>
                <Slider
                  id="frequency-slider"
                  value={[frequency]}
                  onValueChange={(value) =>
                    setFrequency(Array.isArray(value) ? value[0] : (value as number))
                  }
                  min={0}
                  max={50}
                  step={1}
                  labels={['Frequency in orders']}
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium" htmlFor="monetary">
                    Monetary value
                  </label>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {formatCurrency(monetary, true)}
                  </span>
                </div>
                <Input
                  id="monetary"
                  type="number"
                  min={0}
                  step="0.01"
                  value={Number.isFinite(monetary) ? monetary : 0}
                  onChange={(event) =>
                    setMonetary(event.target.value === '' ? 0 : Number(event.target.value))
                  }
                  className="h-9 font-mono"
                />
              </div>

              <Button
                onClick={() => void runPrediction()}
                disabled={loading}
                className="h-10 w-full shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Running models…
                  </>
                ) : (
                  <>
                    <Sparkles />
                    Run models
                  </>
                )}
              </Button>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Versus portfolio average
                  </p>
                  {segments.loading && !benchmark ? (
                    <span className="text-[10px] text-muted-foreground">Loading…</span>
                  ) : null}
                </div>
                {benchmarkRows.length > 0 ? (
                  <dl className="mt-2 space-y-1.5">
                    {benchmarkRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="flex items-center gap-2 font-medium">
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {row.benchmark}
                          </span>
                          {row.value}
                          <span
                            className={cn(
                              'rounded px-1 py-0.5 text-[10px] font-semibold',
                              row.better ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                            )}
                            title={`${Math.round(row.ratio * 100)}% of the portfolio average`}
                          >
                            {Math.round(row.ratio * 100)}%
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {segments.error
                      ? 'Segment benchmark is unavailable right now. Your inputs are still scored against the models.'
                      : 'Portfolio benchmark will appear once the segment report loads.'}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          {error ? (
            <InlineAlert variant="error" title="Could not score this customer">
              {error}
            </InlineAlert>
          ) : null}

          {!prediction && !loading ? (
            <InlineAlert variant="info" title="Ready when you are">
              Run the models to generate a 90-day CLV forecast, churn probability, SHAP reasoning and
              product recommendations for customer #{customerId}.
            </InlineAlert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface relative overflow-hidden p-5 shadow-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-primary/10 blur-2xl"
              />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Predicted 90-day CLV
                  </p>
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                  {prediction ? formatCurrency(prediction.predicted_clv_90d, true) : '—'}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Projected customer value over the next quarter.
                </p>
                {clvDelta != null ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <RunDelta
                      label="vs last run"
                      value={`${clvDelta >= 0 ? '+' : ''}${formatCurrency(clvDelta)}${clvDeltaShare != null ? ` (${clvDeltaShare >= 0 ? '+' : ''}${formatPercent(clvDeltaShare)})` : ''}`}
                      tone={clvDelta > 0 ? 'success' : clvDelta < 0 ? 'warning' : 'neutral'}
                    />
                  </div>
                ) : null}
                <div className="mt-4 flex items-center gap-2">
                  <CustomerAvatar value={customerId} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">Customer #{customerId}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {prediction ? 'Model output ready' : 'Awaiting a scoring run'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="surface flex items-center gap-4 p-5 shadow-sm">
              <RiskGauge
                value={prediction?.churn_probability ?? 0}
                size="lg"
                label="Predicted churn risk"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Churn risk
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums">
                    {prediction ? formatPercent(prediction.churn_probability) : '—'}
                  </span>
                  {prediction ? <RiskBadge probability={prediction.churn_probability} /> : null}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Probability the account goes dormant.
                </p>
                {churnDelta != null ? (
                  <div className="mt-2">
                    <RunDelta
                      label="vs last run"
                      value={`${churnDelta >= 0 ? '+' : ''}${(churnDelta * 100).toFixed(1)} pp`}
                      tone={churnDelta < 0 ? 'success' : churnDelta > 0 ? 'warning' : 'neutral'}
                    />
                  </div>
                ) : null}
                <Meter
                  value={prediction?.churn_probability ?? 0}
                  tone={riskTone(prediction?.churn_probability ?? 0)}
                  label="Predicted churn risk"
                  className="mt-3"
                />
              </div>
            </div>
          </div>

          <Panel
            title="Why the model moved"
            description="SHAP contributions to churn risk. Positive values push risk up."
            icon={Activity}
            action={<Pill>Explainability</Pill>}
          >
            {explanation ? (
              <ShapBars explanation={explanation} />
            ) : (
              <EmptyState
                icon={Activity}
                title="No explanation yet"
                description="Run the models to see which RFM features are driving the churn score."
              />
            )}
          </Panel>

          <Panel
            title="Recommended next products"
            description="Neural collaborative filtering affinities for this profile."
            icon={PackageSearch}
            action={<Pill>{recommendations.length > 0 ? `${recommendations.length} matches` : 'NCF'}</Pill>}
          >
            {recommendations.length > 0 ? (
              <ul className="space-y-1">
                {recommendations.map((rec) => (
                  <li
                    key={`${rec.rank}-${rec.stock_code}`}
                    className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                      {rec.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{rec.description}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{rec.stock_code}</p>
                    </div>
                    <div className="w-24 shrink-0 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Affinity</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatPercent(rec.affinity_score, 0)}
                        </span>
                      </div>
                      <Meter
                        value={rec.affinity_score}
                        tone="primary"
                        label={`Affinity score for ${rec.description}`}
                        className="h-1"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={PackageSearch}
                title={recError ? 'Recommendations unavailable' : 'No recommendations yet'}
                description={
                  recError ??
                  'Score this customer to load product affinities from the collaborative filtering model.'
                }
              />
            )}
          </Panel>

          <Panel
            title="Win-back outreach"
            description="Generate a personalised retention email for this profile."
            icon={Mail}
            action={
              <Button
                size="sm"
                onClick={() => void handleGenerateEmail()}
                disabled={emailLoading}
              >
                {emailLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {emailLoading ? 'Drafting…' : 'Draft win-back email'}
              </Button>
            }
          >
            <div className="space-y-3">
              {emailError ? (
                <InlineAlert variant="error" title="Draft could not be created">
                  {emailError}
                </InlineAlert>
              ) : null}

              {emailTemplate ? (
                <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Email draft · customer #{customerId}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleCopyEmail()}
                      aria-label={emailCopied ? 'Email draft copied' : 'Copy email draft'}
                    >
                      {emailCopied ? <Check /> : <Copy />}
                      {emailCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="scrollbar-thin max-h-72 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
                    {emailTemplate}
                  </pre>
                </div>
              ) : (
                <EmptyState
                  icon={Mail}
                  title="No draft generated"
                  description="Create a retention email that references the customer's churn risk and product affinities."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleGenerateEmail()}
                      disabled={emailLoading}
                    >
                      <RefreshCw className={emailLoading ? 'animate-spin' : undefined} />
                      Generate draft
                    </Button>
                  }
                />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
