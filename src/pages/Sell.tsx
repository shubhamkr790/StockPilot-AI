import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Minus, Plus, Trash2, ShoppingCart, CheckCircle2, Receipt, Sparkles, Mic } from 'lucide-react';
import { api, formatPaise, formatQty, newKey, Product, Sale } from '../lib/api';
import { EmptyState, ErrorBox, PageHeader, Skeleton, Spinner, useToast } from '../components/ui';

type Line = { product: Product; qty: string };

const step = (p: Product) => (p.unit === 'kg' || p.unit === 'litre' ? 0.5 : 1);

export function Sell() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Sale | null>(null);
  // One key per bill: a double-tap or network retry can't record the sale twice.
  const key = useRef(newKey());
  const search = useRef<HTMLInputElement>(null);

  const load = () => api.products().then((r) => setProducts(r.products)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const results = useMemo(() => {
    if (!products) return [];
    const s = q.trim().toLowerCase();
    const list = s ? products.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)) : products;
    return [...list].sort((a, b) => b.salesVelocity - a.salesVelocity).slice(0, s ? 20 : 8);
  }, [products, q]);

  const add = (p: Product) => {
    setDone(null);
    setError('');
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i < 0) return [...c, { product: p, qty: String(step(p)) }];
      const next = [...c];
      next[i] = { ...next[i], qty: String(Number(next[i].qty || 0) + step(p)) };
      return next;
    });
    setQ('');
    search.current?.focus();
  };

  // --- AI quick sale: "2 parle g, 1 oil, half kg rice" fills the bill ---
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [listening, setListening] = useState(false);
  const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const runAi = async (text = aiText) => {
    if (!text.trim() || !products) return;
    setAiBusy(true);
    setAiNote('');
    setError('');
    setDone(null);
    try {
      const r = await api.parseSale(text);
      const byId = new Map(products.map((p) => [p.id, p]));
      setCart((c) => {
        const next = [...c];
        for (const it of r.items) {
          const p = byId.get(it.productId);
          if (!p) continue;
          const i = next.findIndex((l) => l.product.id === p.id);
          if (i >= 0) next[i] = { ...next[i], qty: String(Number(next[i].qty || 0) + it.quantity) };
          else next.push({ product: p, qty: String(it.quantity) });
        }
        return next;
      });
      setAiNote(
        r.items.length === 0
          ? "Couldn't match any products. Try names like \"2 parle g, 1 oil\"."
          : `Added ${r.items.length} item${r.items.length > 1 ? 's' : ''} — check quantities, then complete the sale.${r.unmatched.length ? ` Not found: ${r.unmatched.join(', ')}.` : ''}`
      );
      if (r.items.length) setAiText('');
    } catch (e: any) {
      setAiNote(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const listen = () => {
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const said = e.results[0][0].transcript as string;
      setAiText(said);
      runAi(said);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setAiNote("Couldn't hear that. Check microphone permission, or type instead.");
    };
    setListening(true);
    rec.start();
  };

  const setQty = (id: string, qty: string) => setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty } : l)));
  const bump = (l: Line, d: number) => {
    const n = Math.max(0, Number(l.qty || 0) + d * step(l.product));
    n === 0 ? setCart((c) => c.filter((x) => x !== l)) : setQty(l.product.id, String(n));
  };

  const lineError = (l: Line) => {
    const n = Number(l.qty);
    if (!l.qty || !Number.isFinite(n) || n <= 0) return 'Enter a quantity';
    if ((l.product.unit === 'pcs' || l.product.unit === 'box') && !Number.isInteger(n)) return 'Whole numbers only';
    if (n > l.product.currentStock) return `Only ${formatQty(l.product.currentStock, l.product.unit)} in stock`;
    return '';
  };
  const total = cart.reduce((s, l) => s + Math.round((Number(l.qty) || 0) * l.product.sellingPricePaise), 0);
  const invalid = cart.some((l) => lineError(l));

  const checkout = async () => {
    setBusy(true);
    setError('');
    try {
      const { sale } = await api.sell(cart.map((l) => ({ productId: l.product.id, quantity: Number(l.qty) })), key.current);
      setDone(sale);
      setCart([]);
      key.current = newKey();
      toast(`Sale recorded · ${formatPaise(sale.totalAmountPaise)}`);
      load();
    } catch (e: any) {
      setError(e.message);
      if (e.status === 409) load(); // stock changed under us: refresh numbers
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
      <div>
        <PageHeader title="New sale" subtitle="Type or say the order, or tap products to add them to the bill" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAi();
          }}
          className="card border-brand-100 bg-brand-50/40 p-3 sm:p-4 mb-5"
        >
          <label htmlFor="ai-order" className="flex items-center gap-1.5 text-sm font-medium text-brand-800 mb-2">
            <Sparkles className="w-4 h-4" /> AI quick sale
          </label>
          <div className="flex gap-2">
            <input id="ai-order" className="input bg-white" placeholder='e.g. "2 parle g, 1 sunflower oil, half kg rice"' value={aiText} onChange={(e) => setAiText(e.target.value)} />
            {Speech && (
              <button type="button" onClick={listen} disabled={listening || aiBusy} className={`btn-outline w-11 px-0 shrink-0 ${listening ? 'border-red-300 text-red-600' : ''}`} aria-label="Speak the order">
                <Mic className={`w-5 h-5 ${listening ? 'animate-pulse' : ''}`} />
              </button>
            )}
            <button className="btn-primary shrink-0" disabled={aiBusy || !aiText.trim()}>
              {aiBusy ? <Spinner className="w-4 h-4 text-white" /> : 'Add'}
            </button>
          </div>
          {listening && <p className="text-sm text-red-600 mt-2">Listening… say the items and quantities.</p>}
          {aiNote && <p className="text-sm text-stone-600 mt-2">{aiNote}</p>}
        </form>
        <div className="relative">
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input ref={search} className="input pl-11 h-12" placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {!q && <p className="text-sm text-stone-500 mt-4 mb-2">Best sellers</p>}
        <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
          {!products
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[68px]" />)
            : results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  disabled={p.currentStock <= 0}
                  className="card p-3.5 flex items-center justify-between gap-3 text-left hover:border-brand-200 disabled:opacity-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-sm text-stone-500 tabular">{formatPaise(p.sellingPricePaise)} · {p.currentStock <= 0 ? 'Out of stock' : `${formatQty(p.currentStock, p.unit)} left`}</p>
                  </div>
                  <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center shrink-0"><Plus className="w-5 h-5" /></span>
                </button>
              ))}
          {products && results.length === 0 && <p className="text-stone-500 py-6">No products match "{q}".</p>}
        </div>
      </div>

      <div className="mt-8 lg:mt-0">
        <div className="card p-5 lg:sticky lg:top-10">
          <h2 className="font-semibold text-lg flex items-center gap-2"><Receipt className="w-5 h-5 text-stone-400" /> Bill</h2>
          {done && cart.length === 0 && (
            <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-4">
              <p className="font-medium text-brand-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Sale {done.receiptNumber} recorded</p>
              <p className="text-sm text-brand-800/80 mt-1">{done.items.length} item(s) · {formatPaise(done.totalAmountPaise)}. Stock updated.</p>
            </div>
          )}
          {cart.length === 0 ? (
            !done && <EmptyState icon={<ShoppingCart className="w-10 h-10" />} title="Bill is empty" body="Tap a product to add it." />
          ) : (
            <div className="mt-3 divide-y divide-stone-100">
              {cart.map((l) => {
                const err = lineError(l);
                return (
                  <div key={l.product.id} className="py-3">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium leading-snug">{l.product.name}</p>
                      <button onClick={() => setCart((c) => c.filter((x) => x !== l))} className="text-stone-400 hover:text-red-600 p-1" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => bump(l, -1)} className="btn-outline btn-sm w-9 px-0" aria-label="Less"><Minus className="w-4 h-4" /></button>
                        <input className={`input input-sm w-20 text-center tabular ${err ? 'border-red-300' : ''}`} inputMode="decimal" value={l.qty} onChange={(e) => setQty(l.product.id, e.target.value)} aria-label="Quantity" />
                        <button onClick={() => bump(l, 1)} className="btn-outline btn-sm w-9 px-0" aria-label="More"><Plus className="w-4 h-4" /></button>
                        <span className="text-sm text-stone-500 ml-1">{l.product.unit}</span>
                      </div>
                      <p className="font-medium tabular">{formatPaise(Math.round((Number(l.qty) || 0) * l.product.sellingPricePaise))}</p>
                    </div>
                    {err && <p className="text-sm text-red-600 mt-1.5">{err}</p>}
                  </div>
                );
              })}
            </div>
          )}
          {error && <div className="mt-3"><ErrorBox message={error} /></div>}
          {cart.length > 0 && (
            <>
              <div className="flex justify-between items-baseline border-t border-stone-200 pt-4 mt-2">
                <span className="text-stone-600">Total</span>
                <span className="text-2xl font-bold tabular">{formatPaise(total)}</span>
              </div>
              <button className="btn-primary w-full h-12 mt-4 text-base" disabled={busy || invalid} onClick={checkout}>
                {busy ? <Spinner className="w-5 h-5 text-white" /> : `Complete sale · ${formatPaise(total)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
