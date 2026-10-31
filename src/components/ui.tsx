import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import type { StockStatus } from '../lib/api';

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.svg" width={size} height={size} alt="" className="rounded-[10px]" />
      {withText && (
        <span className="whitespace-nowrap text-[17px] sm:text-[19px] font-semibold tracking-tight text-stone-900">
          StockPilot <span className="text-brand-600">AI</span>
        </span>
      )}
    </div>
  );
}

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-stone-400 ${className}`} />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS: Record<StockStatus, { label: string; cls: string }> = {
  IN_STOCK: { label: 'In stock', cls: 'bg-brand-50 text-brand-700 border-brand-100' },
  LOW_STOCK: { label: 'Low stock', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  OUT_OF_STOCK: { label: 'Out of stock', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export function StatusBadge({ status, qty }: { status: StockStatus; qty?: string }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[13px] font-medium ${s.cls}`}>
      {qty !== undefined && <span className="tabular font-semibold">{qty}</span>}
      {qty !== undefined && <span className="opacity-50">·</span>}
      {s.label}
    </span>
  );
}

export function Chip({ children, tone = 'stone' }: { children: React.ReactNode; tone?: 'stone' | 'brand' | 'amber' | 'red' }) {
  const tones = {
    stone: 'bg-stone-100 text-stone-600',
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card border-dashed flex flex-col items-center text-center px-6 py-12">
      <div className="text-stone-300 mb-4">{icon}</div>
      <p className="text-lg font-medium text-stone-700">{title}</p>
      {body && <p className="text-stone-500 mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">{message}</div>
      {onRetry && (
        <button className="text-sm font-medium underline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Notice({ tone = 'amber', children }: { tone?: 'amber' | 'brand' | 'red'; children: React.ReactNode }) {
  const cls = { amber: 'border-amber-200 bg-amber-50 text-amber-900', brand: 'border-brand-200 bg-brand-50 text-brand-800', red: 'border-red-200 bg-red-50 text-red-800' }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${cls}`}>
      <AlertTriangle className="w-5 h-5 shrink-0 mt-px" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-200/60 ${className}`} />;
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stone-900/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl shadow-pop`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-lg text-stone-500 hover:bg-stone-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

// --- Toasts ------------------------------------------------------------------

type Toast = { id: number; tone: 'success' | 'error'; text: string };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[60] left-1/2 -translate-x-1/2 top-4 flex flex-col gap-2 w-[min(92vw,420px)] pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-pop">
            {t.tone === 'success' ? <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
            <p className="text-sm text-stone-800">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
