import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, Upload, PackageCheck, CalendarClock, Info } from 'lucide-react';
import { api, formatDate, formatPaise, formatQty, Me, Recommendation } from '../lib/api';
import { EmptyState, ErrorBox, PageHeader, Sheet, Skeleton, Spinner, StatusBadge, useToast } from '../components/ui';

export function Restock({ me, onSettingsChanged }: { me: Me; onSettingsChanged: () => void }) {
  const toast = useToast();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [cover, setCover] = useState(String(me.business.targetCoverDays));

  const load = () => {
    setError('');
    api.recommendations().then((r) => setRecs(r.recommendations)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const saveCover = async () => {
    const n = Number(cover);
    if (!Number.isInteger(n) || n < 0 || n > 60) return toast('Target cover must be 0–60 days.', 'error');
    try {
      await api.updateSettings(n);
      toast('Target cover updated');
      onSettingsChanged();
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const ordered = recs?.filter((r) => r.recommendedQuantity);
  const totalCost = (ordered || []).reduce((s, r) => s + (r.estimatedCostPaise || 0), 0);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Restock forecast"
          subtitle="Calculated from each product's own sales history — every number shows its working."
          actions={
            <>
              <button className="btn-outline" onClick={() => setImporting(true)}><Upload className="w-4 h-4" /> Import sales CSV</button>
              <button className="btn-outline" onClick={() => window.print()} disabled={!ordered?.length}><Printer className="w-4 h-4" /> Print</button>
              <button className="btn-primary" onClick={() => api.downloadRestockCsv().catch((e) => toast(e.message, 'error'))} disabled={!recs?.length}><Download className="w-4 h-4" /> Export CSV</button>
            </>
          }
        />

        <details className="card p-4 mb-5 text-[15px]">
          <summary className="flex items-center gap-2 cursor-pointer font-medium list-none"><Info className="w-4 h-4 text-brand-600" /> How this is calculated</summary>
          <ul className="mt-3 space-y-1.5 text-stone-600 list-disc pl-5">
            <li><b>Sells / day</b> = units sold over the last 14 days ÷ 14 (fewer days if the product is newer).</li>
            <li><b>Days of cover</b> = stock ÷ sells per day. Stock-out date = today + days of cover.</li>
            <li><b>Alert</b> when stock ≤ reorder level, or days of cover ≤ supplier lead time.</li>
            <li><b>Order</b> = sells/day × (lead time + target cover) − stock, rounded up to the pack size. Never negative.</li>
            <li>Under 7 days of sales history we say <b>"Not enough history"</b> instead of guessing.</li>
          </ul>
          <div className="flex items-end gap-2 mt-4">
            <div>
              <label className="label">Target cover (days beyond lead time)</label>
              <input className="input w-32 tabular" inputMode="numeric" value={cover} onChange={(e) => setCover(e.target.value)} />
            </div>
            <button className="btn-outline" onClick={saveCover}>Save</button>
          </div>
        </details>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : !recs ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : recs.length === 0 ? (
        <EmptyState icon={<PackageCheck className="w-12 h-12" />} title="Nothing to reorder" body="Products show up here when they run low or will run out before a delivery could arrive." />
      ) : (
        <>
          <div className="no-print space-y-3">
            {recs.map((r) => (
              <div key={r.productId} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[17px]">{r.name}</p>
                    <p className="text-sm text-stone-500">{r.sku} · lead time {r.leadTimeDays}d · pack of {r.packSize}</p>
                  </div>
                  <StatusBadge status={r.status} qty={formatQty(r.currentStock, r.unit)} />
                </div>
                <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-[15px] text-stone-700">
                  <p>{r.explanation}</p>
                  {r.calculation && <p className="mt-1.5 text-sm text-stone-500 tabular">Calculation: <span className="text-stone-700">{r.calculation}</span></p>}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm">
                  {r.recommendedQuantity ? (
                    <span className="font-semibold text-brand-700 text-base">Order {r.recommendedQuantity} {r.unit}</span>
                  ) : r.hasEnoughHistory ? (
                    <span className="text-stone-500">No order needed yet</span>
                  ) : (
                    <span className="text-amber-700 font-medium">Not enough history</span>
                  )}
                  {r.estimatedCostPaise ? <span className="text-stone-500 tabular">≈ {formatPaise(r.estimatedCostPaise)}</span> : null}
                  {r.predictedStockOutDate && <span className="text-amber-700 flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Runs out ~{formatDate(r.predictedStockOutDate)}</span>}
                  {r.alertReason && <span className="text-stone-500">Why flagged: {r.alertReason}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Printable purchase order */}
          <div className="hidden print:block">
            <h1 className="text-2xl font-bold">Purchase order — {me.business.name}</h1>
            <p className="text-sm mb-4">{me.business.address} · {formatDate(new Date().toISOString())}</p>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b-2 border-stone-800 text-left"><th className="py-2">SKU</th><th>Product</th><th className="text-right">Qty</th><th className="text-right">Est. cost</th></tr></thead>
              <tbody>
                {ordered?.map((r) => (
                  <tr key={r.productId} className="border-b border-stone-300"><td className="py-2">{r.sku}</td><td>{r.name}</td><td className="text-right">{r.recommendedQuantity} {r.unit}</td><td className="text-right">{formatPaise(r.estimatedCostPaise || 0)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3} className="py-2 text-right font-semibold">Total</td><td className="text-right font-semibold">{formatPaise(totalCost)}</td></tr></tfoot>
            </table>
          </div>
        </>
      )}

      <Sheet open={importing} onClose={() => setImporting(false)} title="Import past sales">
        <ImportCsv onDone={() => { setImporting(false); load(); }} />
      </Sheet>
    </div>
  );
}

function ImportCsv({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!/\.csv$/i.test(file.name)) return setError('Please choose a .csv file.');
    setBusy(true);
    try {
      const r = await api.importHistory(await file.text());
      toast(`Imported ${r.importedRows} day(s) of sales`);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sample = () => {
    const today = new Date();
    const rows = ['date,sku,quantity'];
    for (let d = 1; d <= 30; d++) {
      const day = new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10);
      rows.push(`${day},KIR-SOAP-DET-75G,${3 + (d % 3)}`);
    }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })), download: 'sample-sales-history.csv' });
    a.click();
  };

  return (
    <div className="space-y-4 text-[15px]">
      <p className="text-stone-600">Upload daily sales from before you used StockPilot, so forecasts work from day one. Columns: <code className="bg-stone-100 rounded px-1.5">date,sku,quantity</code> with dates as YYYY-MM-DD.</p>
      <p className="text-stone-600">This history feeds forecasts only — it doesn't change current stock. Re-uploading the same days replaces them instead of doubling.</p>
      <button className="text-brand-700 font-medium" onClick={sample}>Download a sample file</button>
      {error && <ErrorBox message={error} />}
      <button className="btn-primary w-full" disabled={busy} onClick={() => input.current?.click()}>{busy ? <Spinner className="w-4 h-4 text-white" /> : 'Choose CSV file'}</button>
      <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
}
