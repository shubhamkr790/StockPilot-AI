import React, { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Plus, Trash2, AlertTriangle, CheckCircle2, PencilLine } from 'lucide-react';
import { api, formatDate, formatPaise, paiseToInput, rupeesToPaise, DraftResponse, Invoice, Product, Unit } from '../lib/api';
import { EmptyState, ErrorBox, Notice, PageHeader, Skeleton, Spinner, useToast } from '../components/ui';

type Row = {
  key: string;
  rawProductName: string;
  target: string; // product id, or 'NEW'
  newUnit: Unit;
  newPrice: string;
  qty: string;
  unitPrice: string;
  printedTotalPaise: number | null;
  uncertain: string[];
  matchNote: string;
};

const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];

export function Invoices() {
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [history, setHistory] = useState<Invoice[] | null>(null);
  const loadHistory = () => api.invoices().then((r) => setHistory(r.invoices)).catch(() => setHistory([]));
  useEffect(() => {
    loadHistory();
  }, []);

  if (draft) return <Review draft={draft} onDone={() => { setDraft(null); loadHistory(); }} />;

  return (
    <div>
      <PageHeader title="AI invoice scanner" subtitle="Upload a photo or PDF of a supplier bill. AI reads it; nothing changes stock until you review and confirm." />
      <UploadBox onDraft={setDraft} />
      <h2 className="text-xl font-semibold mt-10 mb-3">Imported invoices</h2>
      {!history ? <Skeleton className="h-24" /> : history.length === 0 ? (
        <EmptyState icon={<FileText className="w-10 h-10" />} title="No invoices imported yet" body="Confirmed invoices appear here with their lines." />
      ) : (
        <div className="card divide-y divide-stone-100">
          {history.map((inv) => (
            <details key={inv.id} className="group">
              <summary className="flex items-center gap-3 p-4 cursor-pointer list-none">
                <div className="icon-tile"><FileText className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{inv.supplierName}</p>
                  <p className="text-sm text-stone-500">#{inv.invoiceNumber} · {formatDate(inv.invoiceDate)} · {inv.items.length} lines</p>
                </div>
                <p className="font-semibold tabular">{formatPaise(inv.totalAmountPaise)}</p>
              </summary>
              <div className="px-4 pb-4 text-sm">
                {inv.items.map((l) => (
                  <div key={l.id} className="flex justify-between gap-3 py-1.5 border-t border-stone-100">
                    <span className="truncate">{l.matchedProductName}{l.isNewProduct && <span className="text-brand-700"> (new)</span>}</span>
                    <span className="tabular text-stone-600">+{l.quantity} × {formatPaise(l.unitPricePaise)}</span>
                  </div>
                ))}
                <p className="text-stone-500 mt-2">Confirmed {formatDate(inv.confirmedAt, true)} · {inv.source === 'OCR' ? `read from ${inv.fileName}` : 'entered manually'}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadBox({ onDraft }: { onDraft: (d: DraftResponse) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ocr, setOcr] = useState<string | null | undefined>(undefined);
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    api.ocrStatus().then((r) => setOcr(r.provider)).catch(() => setOcr(null));
  }, []);

  const handle = async (file?: File | null) => {
    if (!file) return;
    setError('');
    if (!ALLOWED.includes(file.type)) return setError(`"${file.name}" isn't a JPG, PNG or PDF.`);
    if (file.size > 5 * 1024 * 1024) return setError(`"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB. The limit is 5 MB.`);
    setBusy(true);
    try {
      onDraft(await api.uploadInvoice(file));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const manual = async () => {
    setBusy(true);
    try {
      onDraft(await api.manualDraft({ supplierName: '', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), totalAmountPaise: 0, lines: [{ rawName: '', qty: 1, unitCostPaise: 0, totalPaise: 0 }] }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        className={`card border-2 border-dashed ${drag ? 'border-brand-500 bg-brand-50/50' : 'border-stone-200'} flex flex-col items-center text-center px-6 py-12`}
      >
        {busy ? (
          <>
            <Spinner className="w-9 h-9" />
            <p className="mt-4 font-medium">AI is reading the invoice…</p>
            <p className="text-sm text-stone-500">This usually takes 5–15 seconds.</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center"><Upload className="w-7 h-7" /></div>
            <p className="mt-4 text-lg font-medium">Scan a supplier invoice with AI</p>
            <p className="text-stone-500 text-sm mt-1">JPG, PNG or PDF · up to 5 MB</p>
            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <button className="btn-primary" onClick={() => input.current?.click()} disabled={ocr === null}>Choose file or take photo</button>
              <button className="btn-outline" onClick={manual}><PencilLine className="w-4 h-4" /> Enter manually</button>
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
          </>
        )}
      </div>
      {ocr === null && <div className="mt-3"><Notice>Invoice reading isn't configured on this server (add GEMINI_API_KEY). You can still enter invoices manually.</Notice></div>}
      {error && <div className="mt-3"><ErrorBox message={error} /></div>}
    </div>
  );
}

function Review({ draft, onDone }: { draft: DraftResponse; onDone: () => void }) {
  const toast = useToast();
  const inv = draft.draftInvoice;
  const [products, setProducts] = useState<Product[]>([]);
  const [head, setHead] = useState({ supplierName: inv.supplierName, invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate, total: paiseToInput(inv.totalAmountPaise) });
  const [rows, setRows] = useState<Row[]>(() =>
    inv.items.map((l) => ({
      key: l.id,
      rawProductName: l.rawProductName,
      target: l.matchedProductId || 'NEW',
      newUnit: 'pcs',
      newPrice: paiseToInput(Math.round(l.unitPricePaise * 1.2)),
      qty: String(l.quantity),
      unitPrice: paiseToInput(l.unitPricePaise),
      printedTotalPaise: inv.source === 'OCR' ? l.lineTotalPaise : null,
      uncertain: l.uncertainFields,
      matchNote: l.matchType === 'NEW' ? 'No match found' : l.matchType === 'FUZZY' ? `Similar name (${Math.round(l.confidence * 100)}%) — please check` : l.matchType === 'SKU' ? 'Matched by SKU' : 'Exact match',
    }))
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.products().then((r) => setProducts(r.products)).catch(() => {});
  }, []);

  const update = (k: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));
  const lineTotal = (r: Row) => {
    const p = rupeesToPaise(r.unitPrice);
    const q = Number(r.qty);
    return p === null || !Number.isFinite(q) ? null : Math.round(q * p);
  };
  const sum = rows.reduce((s, r) => s + (lineTotal(r) || 0), 0);
  const totalPaise = rupeesToPaise(head.total);
  const totalMismatch = totalPaise !== null && totalPaise !== sum;
  const headUnc = (f: string) => inv.uncertainFields.includes(f);
  const amber = 'border-amber-300 bg-amber-50';

  const confirm = async () => {
    setError('');
    if (!head.supplierName.trim() || !head.invoiceNumber.trim()) return setError('Enter the supplier name and invoice number.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(head.invoiceDate)) return setError('Enter the invoice date.');
    if (totalPaise === null) return setError('Enter the invoice total, e.g. 4128.00');
    const items = [];
    for (const [i, r] of rows.entries()) {
      const price = rupeesToPaise(r.unitPrice);
      const qty = Number(r.qty);
      if (!r.rawProductName.trim() && r.target === 'NEW') return setError(`Line ${i + 1}: enter a product name.`);
      if (!Number.isFinite(qty) || qty <= 0) return setError(`Line ${i + 1}: quantity must be more than zero.`);
      if (price === null) return setError(`Line ${i + 1}: enter a valid unit price.`);
      const newPrice = rupeesToPaise(r.newPrice);
      if (r.target === 'NEW' && newPrice === null) return setError(`Line ${i + 1}: enter a selling price for the new product.`);
      items.push({
        rawProductName: r.rawProductName,
        matchedProductId: r.target === 'NEW' ? null : r.target,
        newProduct: r.target === 'NEW' ? { name: r.rawProductName, unit: r.newUnit, sellingPricePaise: newPrice } : null,
        quantity: qty,
        unitPricePaise: price,
      });
    }
    if (totalMismatch && !window.confirm(`Line totals add up to ${formatPaise(sum)} but the invoice total is ${formatPaise(totalPaise)}. Confirm anyway?`)) return;
    setBusy(true);
    try {
      const r = await api.confirmInvoice(inv.id, { ...head, totalAmountPaise: totalPaise, items });
      toast(r.message);
      onDone();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Review invoice"
        subtitle={inv.source === 'OCR' ? `Read from ${inv.fileName}. Check every highlighted field, then confirm.` : 'Enter the invoice lines, then confirm.'}
        actions={<button className="btn-outline" onClick={onDone}>Discard</button>}
      />
      <div className="space-y-3 mb-5">
        {draft.validation.duplicateOf && (
          <Notice tone="red">
            <b>Already imported.</b> An invoice from this supplier with this number was confirmed on {formatDate(draft.validation.duplicateOf.confirmedAt)}. Confirming again will be refused, so stock can't be doubled.
          </Notice>
        )}
        {inv.source === 'OCR' && rows.some((r) => r.uncertain.length) && <Notice>Fields highlighted in amber were hard to read. Please check them against the paper invoice.</Notice>}
      </div>

      <div className="card p-4 sm:p-5 grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2"><label className="label">Supplier</label><input className={`input ${headUnc('supplierName') ? amber : ''}`} value={head.supplierName} onChange={(e) => setHead({ ...head, supplierName: e.target.value })} /></div>
        <div><label className="label">Invoice no.</label><input className={`input ${headUnc('invoiceNumber') ? amber : ''}`} value={head.invoiceNumber} onChange={(e) => setHead({ ...head, invoiceNumber: e.target.value })} /></div>
        <div><label className="label">Date</label><input type="date" className={`input ${headUnc('invoiceDate') ? amber : ''}`} value={head.invoiceDate} onChange={(e) => setHead({ ...head, invoiceDate: e.target.value })} /></div>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((r, i) => {
          const lt = lineTotal(r);
          const mathOff = r.printedTotalPaise !== null && lt !== null && Math.abs(lt - r.printedTotalPaise) > 1;
          const unc = (f: string) => (r.uncertain.includes(f) ? amber : '');
          return (
            <div key={r.key} className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-medium text-stone-500">Line {i + 1}</p>
                {rows.length > 1 && <button className="text-stone-400 hover:text-red-600 p-1" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label="Remove line"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">As printed</label><input className={`input ${unc('rawName')}`} value={r.rawProductName} onChange={(e) => update(r.key, { rawProductName: e.target.value })} placeholder="Product name" /></div>
                <div>
                  <label className="label">Add stock to</label>
                  <select className={`input ${r.target === 'NEW' ? 'border-brand-200 bg-brand-50/50' : ''}`} value={r.target} onChange={(e) => update(r.key, { target: e.target.value, matchNote: e.target.value === 'NEW' ? 'Will create a new product' : 'Chosen by you' })}>
                    <option value="NEW">+ Create new product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <p className="text-[13px] text-stone-500 mt-1">{r.matchNote}</p>
                </div>
              </div>
              {r.target === 'NEW' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><label className="label">Unit</label><select className="input" value={r.newUnit} onChange={(e) => update(r.key, { newUnit: e.target.value as Unit })}>{['pcs', 'kg', 'litre', 'box'].map((u) => <option key={u}>{u}</option>)}</select></div>
                  <div><label className="label">Selling price ₹</label><input className="input tabular" inputMode="decimal" value={r.newPrice} onChange={(e) => update(r.key, { newPrice: e.target.value })} /></div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div><label className="label">Qty</label><input className={`input tabular ${unc('qty')}`} inputMode="decimal" value={r.qty} onChange={(e) => update(r.key, { qty: e.target.value })} /></div>
                <div><label className="label">Unit cost ₹</label><input className={`input tabular ${unc('unitCostPaise')}`} inputMode="decimal" value={r.unitPrice} onChange={(e) => update(r.key, { unitPrice: e.target.value })} /></div>
                <div><label className="label">Line total</label><p className="h-11 flex items-center font-semibold tabular">{lt === null ? '—' : formatPaise(lt)}</p></div>
              </div>
              {mathOff && <p className="text-sm text-amber-700 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Printed line total was {formatPaise(r.printedTotalPaise!)} — qty × cost doesn't match.</p>}
            </div>
          );
        })}
        <button className="btn-outline w-full" onClick={() => setRows([...rows, { key: `n${Date.now()}`, rawProductName: '', target: 'NEW', newUnit: 'pcs', newPrice: '', qty: '1', unitPrice: '', printedTotalPaise: null, uncertain: [], matchNote: 'Will create a new product' }])}>
          <Plus className="w-4 h-4" /> Add line
        </button>
      </div>

      <div className="card p-4 sm:p-5 mt-4 sticky bottom-20 lg:bottom-4">
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <p className="text-sm text-stone-500">Lines add up to</p>
            <p className="text-xl font-bold tabular">{formatPaise(sum)}</p>
          </div>
          <div><label className="label">Invoice total ₹</label><input className={`input tabular ${headUnc('totalAmountPaise') || totalMismatch ? amber : ''}`} inputMode="decimal" value={head.total} onChange={(e) => setHead({ ...head, total: e.target.value })} /></div>
        </div>
        {totalMismatch ? (
          <p className="text-sm text-amber-700 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Off by {formatPaise(Math.abs(sum - (totalPaise || 0)))} — check lines or taxes.</p>
        ) : (
          <p className="text-sm text-brand-700 mt-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Totals match.</p>
        )}
        {error && <div className="mt-3"><ErrorBox message={error} /></div>}
        <button className="btn-primary w-full h-12 mt-3 text-base" disabled={busy} onClick={confirm}>
          {busy ? <Spinner className="w-5 h-5 text-white" /> : `Confirm & add ${rows.length} line${rows.length > 1 ? 's' : ''} to stock`}
        </button>
      </div>
    </div>
  );
}
