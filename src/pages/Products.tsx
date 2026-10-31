import React, { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Search, Pencil, SlidersHorizontal, Archive, RotateCcw, History, CalendarClock } from 'lucide-react';
import { api, formatDate, formatPaise, formatQty, paiseToInput, rupeesToPaise, Me, Movement, Product, Unit } from '../lib/api';
import { Chip, EmptyState, ErrorBox, PageHeader, Sheet, Skeleton, Spinner, StatusBadge, useToast } from '../components/ui';

const STATUSES = [
  ['ALL', 'All'],
  ['IN_STOCK', 'In stock'],
  ['LOW_STOCK', 'Low'],
  ['OUT_OF_STOCK', 'Out'],
] as const;

export function Products({ me }: { me: Me }) {
  const isOwner = me.user.role === 'OWNER';
  const toast = useToast();
  const [all, setAll] = useState<Product[] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);

  const load = async () => {
    setError('');
    try {
      setAll((await api.products({ archived })).products);
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, [archived]);

  const categories = useMemo(() => ['ALL', ...new Set((all || []).map((p) => p.category))].sort(), [all]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (all || []).filter(
      (p) =>
        (archived ? p.isArchived : !p.isArchived) &&
        (status === 'ALL' || p.status === status) &&
        (category === 'ALL' || p.category === category) &&
        (!s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
    );
  }, [all, q, status, category, archived]);

  const archive = async (p: Product) => {
    if (!confirm(`Archive "${p.name}"? Its sales and stock history will be kept.`)) return;
    try {
      toast((await api.archiveProduct(p.id)).message);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const restore = async (p: Product) => {
    try {
      await api.restoreProduct(p.id);
      toast(`"${p.name}" restored`);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={all ? `${list.length} of ${all.filter((p) => !p.isArchived).length} products` : 'Loading…'}
        actions={isOwner && <button className="btn-primary" onClick={() => setEditing('new')}><Plus className="w-5 h-5" /> Add product</button>}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input pl-11" placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {categories.map((c) => <option key={c} value={c}>{c === 'ALL' ? 'All categories' : c}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <div className="inline-flex rounded-xl bg-stone-100 p-1">
          {STATUSES.map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)} className={`px-3.5 h-9 rounded-lg text-sm font-medium transition-colors ${status === v ? 'bg-white shadow-card text-stone-900' : 'text-stone-500'}`}>{l}</button>
          ))}
        </div>
        {isOwner && (
          <label className="flex items-center gap-2 text-sm text-stone-600 ml-auto">
            <input type="checkbox" className="accent-brand-600 w-4 h-4" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show archived
          </label>
        )}
      </div>

      <div className="mt-5">
        {error ? <ErrorBox message={error} onRetry={load} /> : !all ? (
          <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Package className="w-12 h-12" />} title={all.length ? 'No products match' : 'No products yet'} body={all.length ? 'Try a different search or filter.' : 'Add your first product to start tracking stock.'} />
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {list.map((p) => (
              <div key={p.id} className="card p-4 sm:p-5 min-w-0">
                <div className="flex items-start gap-4">
                  <div className="icon-tile hidden sm:flex"><Package className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button onClick={() => setViewing(p)} className="text-left min-w-0">
                        <p className="font-semibold text-[17px] leading-snug truncate">{p.name}</p>
                        <p className="text-stone-500 text-sm">{p.sku}</p>
                      </button>
                      <StatusBadge status={p.status} qty={formatQty(p.currentStock, p.unit)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <Chip>{p.category}</Chip>
                      <Chip>{formatPaise(p.sellingPricePaise)} / {p.unit}</Chip>
                      {p.predictedStockOutDate && p.status !== 'IN_STOCK' && (
                        <Chip tone="amber"><CalendarClock className="w-3.5 h-3.5" /> Out ~{formatDate(p.predictedStockOutDate)}</Chip>
                      )}
                      {p.isArchived && <Chip tone="red">Archived</Chip>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-stone-100">
                  <button className="btn-ghost btn-sm" onClick={() => setViewing(p)}><History className="w-4 h-4" /> History</button>
                  {isOwner && !p.isArchived && (
                    <>
                      <button className="btn-ghost btn-sm" onClick={() => setEditing(p)}><Pencil className="w-4 h-4" /> Edit</button>
                      <button className="btn-ghost btn-sm" onClick={() => setAdjusting(p)}><SlidersHorizontal className="w-4 h-4" /> Adjust</button>
                      <button className="btn-ghost btn-sm ml-auto text-red-600 hover:bg-red-50" onClick={() => archive(p)} aria-label="Archive"><Archive className="w-4 h-4" /></button>
                    </>
                  )}
                  {isOwner && p.isArchived && <button className="btn-ghost btn-sm" onClick={() => restore(p)}><RotateCcw className="w-4 h-4" /> Restore</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add product' : 'Edit product'}>
        {editing && <ProductForm product={editing === 'new' ? null : editing} onSaved={() => { setEditing(null); load(); }} />}
      </Sheet>
      <Sheet open={!!adjusting} onClose={() => setAdjusting(null)} title="Adjust stock">
        {adjusting && <AdjustForm product={adjusting} onSaved={() => { setAdjusting(null); load(); }} />}
      </Sheet>
      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || ''} wide>
        {viewing && <ProductDetail product={viewing} />}
      </Sheet>
    </div>
  );
}

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : hint && <p className="text-[13px] text-stone-500 mt-1">{hint}</p>}
    </div>
  );
}

function ProductForm({ product, onSaved }: { product: Product | null; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    category: product?.category || 'General',
    unit: (product?.unit || 'pcs') as Unit,
    cost: product ? paiseToInput(product.costPricePaise) : '',
    price: product ? paiseToInput(product.sellingPricePaise) : '',
    reorderLevel: String(product?.reorderLevel ?? 10),
    leadTimeDays: String(product?.leadTimeDays ?? 3),
    packSize: String(product?.packSize ?? 1),
    openingStock: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const cost = rupeesToPaise(f.cost);
    const price = rupeesToPaise(f.price);
    if (!f.name.trim()) errs.name = 'Enter a product name';
    if (!f.sku.trim()) errs.sku = 'Enter a SKU';
    if (cost === null) errs.cost = 'Enter an amount like 110 or 110.50';
    if (price === null) errs.price = 'Enter an amount like 135 or 135.00';
    const whole = (v: string) => /^\d+$/.test(v.trim());
    if (!/^\d+(\.\d{1,3})?$/.test(f.reorderLevel.trim())) errs.reorderLevel = 'Enter 0 or more';
    if (!whole(f.leadTimeDays) || Number(f.leadTimeDays) > 90) errs.leadTimeDays = 'Whole days, 0–90';
    if (!whole(f.packSize) || Number(f.packSize) < 1) errs.packSize = 'At least 1';
    const opening = Number(f.openingStock);
    if (!product && (!Number.isFinite(opening) || opening < 0 || ((f.unit === 'pcs' || f.unit === 'box') && !Number.isInteger(opening)))) errs.openingStock = f.unit === 'pcs' || f.unit === 'box' ? 'Whole number, 0 or more' : '0 or more';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const data: Record<string, unknown> = {
      name: f.name, sku: f.sku, category: f.category, unit: f.unit,
      costPricePaise: cost, sellingPricePaise: price,
      reorderLevel: Number(f.reorderLevel), leadTimeDays: Number(f.leadTimeDays), packSize: Number(f.packSize),
    };
    if (!product) data.openingStock = opening;
    setBusy(true);
    try {
      product ? await api.updateProduct(product.id, data) : await api.createProduct(data);
      toast(product ? 'Product updated' : 'Product added');
      onSaved();
    } catch (err: any) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Product name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} placeholder="e.g. Sunflower Oil 1L" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" error={errors.sku}><input className="input uppercase" value={f.sku} onChange={set('sku')} placeholder="OIL-1L" /></Field>
        <Field label="Category"><input className="input" value={f.category} onChange={set('category')} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Unit">
          <select className="input" value={f.unit} onChange={set('unit')}>{['pcs', 'kg', 'litre', 'box'].map((u) => <option key={u}>{u}</option>)}</select>
        </Field>
        <Field label="Cost ₹" error={errors.cost}><input className="input tabular" inputMode="decimal" value={f.cost} onChange={set('cost')} placeholder="0.00" /></Field>
        <Field label="Price ₹" error={errors.price}><input className="input tabular" inputMode="decimal" value={f.price} onChange={set('price')} placeholder="0.00" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Reorder at" error={errors.reorderLevel}><input className="input tabular" inputMode="decimal" value={f.reorderLevel} onChange={set('reorderLevel')} /></Field>
        <Field label="Lead time" error={errors.leadTimeDays} hint="days"><input className="input tabular" inputMode="numeric" value={f.leadTimeDays} onChange={set('leadTimeDays')} /></Field>
        <Field label="Pack size" error={errors.packSize}><input className="input tabular" inputMode="numeric" value={f.packSize} onChange={set('packSize')} /></Field>
      </div>
      {!product && (
        <Field label="Opening stock" error={errors.openingStock} hint="Recorded as an 'Opening stock' movement.">
          <input className="input tabular" inputMode="decimal" value={f.openingStock} onChange={set('openingStock')} />
        </Field>
      )}
      {product && <p className="text-[13px] text-stone-500">Stock can't be edited here — use Adjust, a sale, or an invoice so every change is recorded.</p>}
      {errors.form && <ErrorBox message={errors.form} />}
      <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="w-4 h-4 text-white" /> : product ? 'Save changes' : 'Add product'}</button>
    </form>
  );
}

const REASONS = ['Damaged', 'Expired', 'Counting error', 'Other'];

function AdjustForm({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const toast = useToast();
  const [dir, setDir] = useState<'remove' | 'add'>('remove');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(qty);
    if (!qty || !Number.isFinite(n) || n <= 0) return setError('Enter a quantity greater than zero.');
    if (!reason) return setError('Choose a reason.');
    if (reason === 'Other' && !note.trim()) return setError('Add a note explaining the adjustment.');
    setBusy(true);
    setError('');
    try {
      await api.adjust(product.id, dir === 'add' ? n : -n, reason.toLowerCase(), note);
      toast('Stock adjusted');
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-stone-600">{product.name} · <span className="tabular font-medium">{formatQty(product.currentStock, product.unit)}</span> in stock</p>
      <div className="inline-flex rounded-xl bg-stone-100 p-1 w-full">
        {(['remove', 'add'] as const).map((d) => (
          <button type="button" key={d} onClick={() => setDir(d)} className={`flex-1 h-10 rounded-lg text-sm font-medium ${dir === d ? 'bg-white shadow-card' : 'text-stone-500'}`}>{d === 'remove' ? 'Remove stock' : 'Add stock'}</button>
        ))}
      </div>
      <div>
        <label className="label">Quantity ({product.unit})</label>
        <input className="input tabular" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      <div>
        <label className="label">Reason</label>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button type="button" key={r} onClick={() => setReason(r)} className={`px-3.5 h-9 rounded-lg border text-sm ${reason === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-600'}`}>{r}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Note {reason !== 'Other' && <span className="text-stone-400 font-normal">(optional)</span>}</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 bottles leaked in transit" />
      </div>
      {error && <ErrorBox message={error} />}
      <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="w-4 h-4 text-white" /> : 'Save adjustment'}</button>
    </form>
  );
}

const MV_TONE: Record<Movement['movementType'], string> = {
  PURCHASE: 'text-brand-700 bg-brand-50',
  SALE: 'text-stone-700 bg-stone-100',
  RETURN: 'text-sky-800 bg-sky-50',
  ADJUSTMENT: 'text-amber-800 bg-amber-50',
};

function ProductDetail({ product }: { product: Product }) {
  const [mv, setMv] = useState<Movement[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.productMovements(product.id).then((r) => setMv(r.movements)).catch((e) => setError(e.message));
  }, [product.id]);
  const r = product.restockRecommendation;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          ['In stock', formatQty(product.currentStock, product.unit)],
          ['Sells / day', product.salesVelocity.toFixed(1)],
          ['Days of cover', product.daysOfCover === null ? '—' : String(product.daysOfCover)],
          ['Stock-out', formatDate(product.predictedStockOutDate)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-stone-200 p-3"><p className="text-[13px] text-stone-500">{l}</p><p className="font-semibold tabular mt-0.5">{v}</p></div>
        ))}
      </div>
      <div className="rounded-xl bg-stone-50 p-4 text-[15px]">
        <p className="font-medium">Forecast</p>
        <p className="text-stone-600 mt-1">{r.explanation}</p>
        {r.alertReason && <p className="text-amber-700 mt-1 text-sm">Alert: {r.alertReason}</p>}
      </div>
      <div>
        <p className="font-medium mb-2">Stock movements</p>
        {error ? <ErrorBox message={error} /> : !mv ? <Skeleton className="h-32" /> : mv.length === 0 ? <p className="text-stone-500">No movements yet.</p> : (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl">
            {mv.slice(0, 60).map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${MV_TONE[m.movementType]}`}>{m.movementType.toLowerCase()}</span>
                <div className="flex-1 min-w-0"><p className="truncate">{m.reason}</p><p className="text-stone-500 text-[13px]">{m.createdByName} · {formatDate(m.timestamp, true)}</p></div>
                <span className={`tabular font-medium ${m.quantity > 0 ? 'text-brand-700' : 'text-stone-700'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
