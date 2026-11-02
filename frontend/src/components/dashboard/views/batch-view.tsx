'use client';

import { useState, type DragEvent } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';

import {
  EmptyState,
  InlineAlert,
  PageHeader,
  Panel,
  Pill,
} from '@/components/dashboard/ui-kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { batchPredict } from '@/lib/api';
import { downloadCsv, toCsv } from '@/lib/csv';
import { getApiErrorMessage } from '@/lib/errors';
import { formatNumber } from '@/lib/format';
import type { ViewId } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const REQUIRED_COLUMNS = ['CustomerID', 'Recency', 'Frequency', 'Monetary'];
const MAX_BYTES = 5 * 1024 * 1024;

interface BatchPreviewRow {
  customerId: string;
  recency: string;
  frequency: string;
  monetary: string;
}

interface BatchValidation {
  error: string | null;
  rows: number;
  preview: BatchPreviewRow[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

async function validateBatchFile(file: File): Promise<BatchValidation> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { error: 'Choose a .csv file.', rows: 0, preview: [] };
  }
  if (file.size === 0) {
    return { error: 'That file is empty. Add rows and try again.', rows: 0, preview: [] };
  }
  if (file.size > MAX_BYTES) {
    return { error: 'That file is larger than 5 MB. Split it into smaller batches.', rows: 0, preview: [] };
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { error: 'That file has a header but no customer rows.', rows: 0, preview: [] };
  }

  const headers = parseCsvLine(lines[0].replace(/^\uFEFF/, '')).map((header) =>
    header.replace(/^"|"$/g, '').toLowerCase(),
  );
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column.toLowerCase()));
  if (missing.length > 0) {
    return {
      error: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Expected CustomerID, Recency, Frequency, Monetary.`,
      rows: 0,
      preview: [],
    };
  }

  const columnIndex = {
    customerId: headers.indexOf('customerid'),
    recency: headers.indexOf('recency'),
    frequency: headers.indexOf('frequency'),
    monetary: headers.indexOf('monetary'),
  };

  const preview: BatchPreviewRow[] = [];
  const invalidRows: string[] = [];
  let invalidCount = 0;

  lines.slice(1).forEach((line, index) => {
    const cells = parseCsvLine(line);
    const customerId = cells[columnIndex.customerId] ?? '';
    const recency = cells[columnIndex.recency] ?? '';
    const frequency = cells[columnIndex.frequency] ?? '';
    const monetary = cells[columnIndex.monetary] ?? '';
    const numericCells = [
      { label: 'Recency', value: recency },
      { label: 'Frequency', value: frequency },
      { label: 'Monetary', value: monetary },
    ];
    const problems: string[] = [];

    if (!customerId) problems.push('CustomerID is empty');

    numericCells.forEach((cell) => {
      const parsed = Number(cell.value);
      if (cell.value.trim() === '' || !Number.isFinite(parsed) || parsed < 0) {
        problems.push(`${cell.label} must be a non-negative number`);
      }
    });

    if (problems.length > 0) {
      invalidCount += 1;
      if (invalidRows.length < 3) {
        invalidRows.push(`Row ${index + 2}: ${problems.join(', ')}`);
      }
      return;
    }

    if (preview.length < 3) {
      preview.push({ customerId, recency, frequency, monetary });
    }
  });

  if (invalidCount > 0) {
    const details = invalidRows.join('; ');
    const remainder = invalidCount > invalidRows.length ? ` and ${invalidCount - invalidRows.length} more` : '';
    return {
      error: `${invalidCount} row${invalidCount > 1 ? 's' : ''} have invalid values. ${details}${remainder}.`,
      rows: 0,
      preview: [],
    };
  }

  return { error: null, rows: lines.length - 1, preview };
}

export function BatchView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { toast } = useToast();
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [preview, setPreview] = useState<BatchPreviewRow[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [lastRun, setLastRun] = useState<{ filename: string; rows: number } | null>(null);

  const resetInput = () => setInputKey((key) => key + 1);

  const handleFile = async (file: File | null) => {
    setBatchError(null);
    setBatchSuccess(null);
    if (!file) {
      setBatchFile(null);
      setRowCount(0);
      setPreview([]);
      return;
    }

    const result = await validateBatchFile(file);
    if (result.error) {
      setBatchFile(null);
      setRowCount(0);
      setPreview([]);
      setBatchError(result.error);
      resetInput();
      return;
    }

    setBatchFile(file);
    setRowCount(result.rows);
    setPreview(result.preview);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files?.[0] ?? null);
  };

  const clearFile = () => {
    setBatchFile(null);
    setRowCount(0);
    setPreview([]);
    setBatchError(null);
    setBatchSuccess(null);
    resetInput();
  };

  const handleSubmit = async () => {
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

      const message = `${formatNumber(rowCount)} customers scored. The download should start automatically.`;
      setBatchSuccess(message);
      setLastRun({ filename: batchFile.name, rows: rowCount });
      setBatchFile(null);
      setRowCount(0);
      setPreview([]);
      resetInput();
      toast({ title: 'Batch scored successfully', description: message, variant: 'success' });
    } catch (err) {
      setBatchError(
        getApiErrorMessage(err, 'Batch processing failed. Check the file format and try again.'),
      );
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = REQUIRED_COLUMNS;
    const rows = [
      ['12345', '10', '25', '1500'],
      ['13000', '150', '2', '100'],
    ];
    downloadCsv('velora-batch-template.csv', toCsv(headers, rows));
    toast({ title: 'Template downloaded', description: 'Two example rows are included.', variant: 'success' });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Bulk operations"
        title="Batch scoring"
        description="Score an entire customer list in one pass. Upload a CSV, validate the schema, and download churn and CLV predictions."
        meta={
          <>
            <Pill>
              <ShieldCheck className="size-3" aria-hidden="true" />
              Validated before upload
            </Pill>
            <Pill>
              <FileText className="size-3" aria-hidden="true" />
              CSV up to 5 MB
            </Pill>
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download />
              Download template
            </Button>
            <Button onClick={() => onNavigate('at-risk')}>
              <Sparkles />
              At-risk workspace
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Upload a customer list"
          description="Drag a file in or browse from your machine. Required columns are checked instantly."
          icon={UploadCloud}
        >
          <div className="space-y-4">
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
              onDrop={handleDrop}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30',
              )}
            >
              <input
                key={inputKey}
                type="file"
                id="batch-upload"
                className="absolute inset-0 cursor-pointer opacity-0"
                accept=".csv,text/csv"
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              />
              <span
                className={cn(
                  'grid size-12 place-items-center rounded-2xl transition-colors',
                  isDragging ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {batchFile ? (
                  <FileText className="size-5" aria-hidden="true" />
                ) : (
                  <Upload className="size-5" aria-hidden="true" />
                )}
              </span>
              {batchFile ? (
                <>
                  <p className="mt-3 text-sm font-medium">{batchFile.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBytes(batchFile.size)} · {formatNumber(rowCount)} data rows · ready to score
                  </p>
                  <p className="mt-2 text-[11px] text-primary">Click or drop to replace</p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-medium">
                    {isDragging ? 'Drop your CSV here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CSV only · up to 5 MB · header row required
                  </p>
                </>
              )}
            </label>

            {batchFile ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {formatNumber(rowCount)} rows queued for scoring
                </p>
                <Button type="button" variant="ghost" size="xs" onClick={clearFile}>
                  <X />
                  Remove
                </Button>
              </div>
            ) : null}

            {batchFile && preview.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border/70">
                <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    File preview
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {preview.length} of {formatNumber(rowCount)} rows
                  </p>
                </div>
                <div className="scrollbar-thin overflow-x-auto">
                  <table className="w-full min-w-[420px] text-[11px]" aria-label="Batch file preview">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th scope="col" className="px-3 py-2 font-semibold">CustomerID</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Recency</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Frequency</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Monetary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {preview.map((row, index) => (
                        <tr key={`${row.customerId}-${index}`}>
                          <td className="px-3 py-2 font-mono">{row.customerId}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.recency}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.frequency}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.monetary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {batchError ? (
              <div role="alert">
                <InlineAlert variant="error" title="Check the file">
                  {batchError}
                </InlineAlert>
              </div>
            ) : null}

            {batchSuccess ? (
              <InlineAlert variant="success" title="Batch complete">
                {batchSuccess}
              </InlineAlert>
            ) : null}

            <Button
              onClick={() => void handleSubmit()}
              disabled={!batchFile || batchLoading}
              className="h-10 w-full shadow-lg shadow-primary/20"
            >
              {batchLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Scoring customers…
                </>
              ) : (
                <>
                  <Sparkles />
                  Process batch
                </>
              )}
            </Button>

            <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-3">
              {['Upload a CSV', 'Validate the schema', 'Download predictions'].map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-2"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="What you get back" description="One row per input customer." icon={Check}>
            <ul className="space-y-3">
              {[
                {
                  title: 'Churn probability',
                  copy: 'The model score between 0 and 1 for each customer.',
                },
                {
                  title: '90-day CLV',
                  copy: 'Predicted customer value for the next quarter.',
                },
                {
                  title: 'Customer ID',
                  copy: 'Kept intact so you can join the output back to your CRM.',
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-success/10 text-success">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-medium">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {item.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Template & limits" description="Start from a working example." icon={FileText}>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Required columns
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {REQUIRED_COLUMNS.map((column) => (
                    <span
                      key={column}
                      className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                    >
                      {column}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Column names are case-insensitive. Extra columns are ignored. Files over 5 MB should
                be split into smaller batches.
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
                <Download />
                Download CSV template
              </Button>
            </div>
          </Panel>

          <Panel title="Last run" description="The most recent batch scored in this session." icon={ArrowRight}>
            {lastRun ? (
              <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lastRun.filename}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatNumber(lastRun.rows)} customers scored · download complete
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={UploadCloud}
                title="No batches yet"
                description="Your last scored file and row count will appear here."
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
