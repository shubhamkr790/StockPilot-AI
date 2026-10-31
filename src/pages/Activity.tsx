import { useEffect, useState } from 'react';
import { api, formatDate, AuditEntry, Movement } from '../lib/api';
import { ErrorBox, PageHeader, Skeleton } from '../components/ui';

const TONE: Record<string, string> = {
  PRODUCT: 'bg-stone-100 text-stone-700',
  SALE: 'bg-brand-50 text-brand-700',
  INVOICE: 'bg-violet-50 text-violet-700',
  ADJUSTMENT: 'bg-amber-50 text-amber-800',
  SETTINGS: 'bg-stone-100 text-stone-700',
  IMPORT: 'bg-sky-50 text-sky-800',
};

export function Activity() {
  const [tab, setTab] = useState<'audit' | 'ledger'>('audit');
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [mv, setMv] = useState<Movement[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    if (tab === 'audit') api.audit().then((r) => setAudit(r.audit)).catch((e) => setError(e.message));
    else api.movements(200).then((r) => setMv(r.movements)).catch((e) => setError(e.message));
  }, [tab]);

  return (
    <div>
      <PageHeader title="Activity" subtitle="Every edit, sale, adjustment and invoice — who did it and when." />
      <div className="inline-flex rounded-xl bg-stone-100 p-1 mb-5">
        {(['audit', 'ledger'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 h-9 rounded-lg text-sm font-medium ${tab === t ? 'bg-white shadow-card' : 'text-stone-500'}`}>{t === 'audit' ? 'Audit log' : 'Stock ledger'}</button>
        ))}
      </div>
      {error ? <ErrorBox message={error} /> : tab === 'audit' ? (
        !audit ? <Skeleton className="h-64" /> : audit.length === 0 ? <p className="text-stone-500">No activity yet. Actions you take will appear here.</p> : (
          <div className="card divide-y divide-stone-100">
            {audit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium mt-0.5 ${TONE[a.entityType] || TONE.PRODUCT}`}>{a.entityType.toLowerCase()}</span>
                <div className="flex-1 min-w-0"><p className="text-[15px]">{a.summary}</p><p className="text-[13px] text-stone-500">{a.userName} · {formatDate(a.timestamp, true)}</p></div>
              </div>
            ))}
          </div>
        )
      ) : !mv ? <Skeleton className="h-64" /> : (
        <div className="card divide-y divide-stone-100">
          {mv.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{m.productName}</p>
                <p className="text-[13px] text-stone-500 truncate">{m.movementType.toLowerCase()} · {m.reason} · {m.createdByName} · {formatDate(m.timestamp, true)}</p>
              </div>
              <span className={`tabular font-semibold ${m.quantity > 0 ? 'text-brand-700' : 'text-stone-700'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
