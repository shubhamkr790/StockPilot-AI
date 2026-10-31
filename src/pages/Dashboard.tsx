import { useEffect, useState } from 'react';
import { Package, AlertTriangle, XCircle, IndianRupee, ShoppingCart, FileText, PackagePlus, ChevronRight, CalendarClock, Sparkles } from 'lucide-react';
import { api, formatPaise, formatDate, formatQty, Me, Metrics, Recommendation, Product } from '../lib/api';
import { ErrorBox, PageHeader, Skeleton, StatusBadge } from '../components/ui';

export function Dashboard({ me, go }: { me: Me; go: (r: string) => void }) {
  const isOwner = me.user.role === 'OWNER';
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [low, setLow] = useState<Product[] | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [m, r] = await Promise.all([
        api.metrics(),
        isOwner ? api.recommendations().then((x) => x.recommendations) : api.products({ status: 'LOW_STOCK' }).then((x) => x.products),
      ]);
      setMetrics(m.metrics);
      isOwner ? setRecs(r as Recommendation[]) : setLow(r as Product[]);
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const stats = metrics && [
    { label: 'Total products', value: metrics.totalProducts, icon: Package, tile: 'bg-stone-100 text-stone-600' },
    { label: 'Low stock', value: metrics.lowStockCount, icon: AlertTriangle, tile: 'bg-amber-50 text-amber-600' },
    { label: 'Out of stock', value: metrics.outOfStockCount, icon: XCircle, tile: metrics.outOfStockCount ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-600' },
    { label: "Today's sales", value: formatPaise(metrics.todaySalesPaise), sub: `${metrics.todayOrdersCount} bills`, icon: IndianRupee, tile: 'bg-brand-50 text-brand-600' },
  ];

  return (
    <div>
      <PageHeader title={`Namaste, ${me.user.name.split(' ')[0]}`} subtitle={me.business.name} />
      {error && <div className="mb-6"><ErrorBox message={error} onRetry={load} /></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats
          ? stats.map((s) => (
              <div key={s.label} className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className={`icon-tile ${s.tile}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className={`${typeof s.value === 'string' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[28px]'} font-bold leading-tight tabular break-all`}>{s.value}</p>
                  <p className="text-sm text-stone-500 leading-snug">{s.label}{s.sub ? ` · ${s.sub}` : ''}</p>
                </div>
              </div>
            ))
          : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[88px]" />)}
      </div>

      {isOwner && <AiBrief />}

      {isOwner ? (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Reorder now</h2>
            <button onClick={() => go('restock')} className="text-brand-600 font-medium text-[15px]">View all</button>
          </div>
          {!recs ? (
            <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
          ) : recs.length === 0 ? (
            <div className="card p-6 text-stone-600">Nothing needs reordering right now. Stock alerts show up here automatically.</div>
          ) : (
            <div className="space-y-3">
              {recs.slice(0, 4).map((r) => (
                <button key={r.productId} onClick={() => go('restock')} className="card w-full text-left p-4 sm:p-5 flex items-start gap-4 hover:border-stone-300 transition-colors">
                  <div className="icon-tile"><Package className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-[17px] leading-snug">{r.name}</p>
                      <StatusBadge status={r.status} qty={formatQty(r.currentStock, r.unit)} />
                    </div>
                    <p className="text-[15px] text-stone-600 mt-1">{r.explanation}</p>
                    {r.predictedStockOutDate && (
                      <p className="text-sm text-amber-700 mt-1.5 flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4" /> Runs out around {formatDate(r.predictedStockOutDate)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 self-center hidden sm:block" />
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Running low</h2>
          {!low ? <Skeleton className="h-24" /> : low.length === 0 ? (
            <div className="card p-6 text-stone-600">Nothing is running low.</div>
          ) : (
            <div className="card divide-y divide-stone-100">
              {low.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0"><p className="font-medium truncate">{p.name}</p><p className="text-sm text-stone-500">{p.sku}</p></div>
                  <StatusBadge status={p.status} qty={formatQty(p.currentStock, p.unit)} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <QuickAction icon={ShoppingCart} title="New sale" sub="Type or say the order" tone="brand" onClick={() => go('sell')} />
          <QuickAction icon={Package} title="Products" sub="View stock" onClick={() => go('products')} />
          {isOwner && <QuickAction icon={FileText} title="Add invoice" sub="AI reads the bill" tone="amber" onClick={() => go('invoices')} />}
          {isOwner && <QuickAction icon={PackagePlus} title="Restock list" sub="Export for supplier" onClick={() => go('restock')} />}
        </div>
      </section>
    </div>
  );
}

/** Plain-English summary written from the forecast numbers. Falls back to a rule-based summary. */
function AiBrief() {
  const [brief, setBrief] = useState<{ brief: string; source: 'ai' | 'rules' } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api.brief().then(setBrief).catch(() => setFailed(true));
  }, []);
  if (failed) return null;
  return (
    <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 sm:p-5 flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-white text-brand-600 grid place-items-center shrink-0"><Sparkles className="w-5 h-5" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-800">{brief?.source === 'rules' ? "Today's brief" : "AI brief for today"}</p>
        {brief ? <p className="text-[15px] text-stone-800 mt-0.5 leading-relaxed">{brief.brief}</p> : <Skeleton className="h-5 mt-1.5 w-3/4" />}
        {brief && <p className="text-xs text-stone-500 mt-1.5">Written from the forecast numbers below — the quantities come from the calculation, not the AI.</p>}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, sub, onClick, tone }: { icon: React.ElementType; title: string; sub: string; onClick: () => void; tone?: 'brand' | 'amber' }) {
  const bg = tone === 'brand' ? 'bg-brand-50/70 border-brand-100' : tone === 'amber' ? 'bg-amber-50/60 border-amber-100' : 'bg-white';
  const ic = tone === 'brand' ? 'text-brand-600' : tone === 'amber' ? 'text-amber-600' : 'text-stone-600';
  return (
    <button onClick={onClick} className={`card ${bg} p-5 flex flex-col items-center text-center hover:shadow-pop transition-shadow`}>
      <div className={`w-12 h-12 rounded-xl bg-white grid place-items-center ${ic}`}><Icon className="w-6 h-6" /></div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="text-sm text-stone-500">{sub}</p>
    </button>
  );
}
