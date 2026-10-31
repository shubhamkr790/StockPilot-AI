export type Unit = 'pcs' | 'kg' | 'litre' | 'box';
export type Role = 'OWNER' | 'STAFF';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface Me {
  user: { id: string; username: string; name: string; role: Role };
  business: { id: string; name: string; type: string; address: string; targetCoverDays: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: Unit;
  costPricePaise: number;
  sellingPricePaise: number;
  reorderLevel: number;
  leadTimeDays: number;
  packSize: number;
  isArchived: boolean;
  currentStock: number;
  totalSold: number;
  salesVelocity: number;
  daysOfCover: number | null;
  predictedStockOutDate: string | null;
  status: StockStatus;
  restockRecommendation: {
    needsRestock: boolean;
    recommendedQuantity: number | null;
    targetDaysCover: number;
    explanation: string;
    calculation: string | null;
    hasEnoughHistory: boolean;
    historyDays: number;
    alertReason: string | null;
  };
}

export interface Metrics {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValuePaise: number;
  todaySalesPaise: number;
  todayOrdersCount: number;
  reorderNeededCount: number;
}

export interface Recommendation {
  productId: string;
  name: string;
  sku: string;
  unit: Unit;
  status: StockStatus;
  currentStock: number;
  salesVelocity: number;
  daysOfCover: number | null;
  predictedStockOutDate: string | null;
  packSize: number;
  leadTimeDays: number;
  recommendedQuantity: number | null;
  estimatedCostPaise: number | null;
  explanation: string;
  calculation: string | null;
  alertReason: string | null;
  hasEnoughHistory: boolean;
}

export interface InvoiceLine {
  id: string;
  rawProductName: string;
  matchedProductId?: string;
  matchedProductName?: string;
  isNewProduct: boolean;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  confidence: number;
  matchType: 'SKU' | 'EXACT' | 'FUZZY' | 'NEW';
  uncertainFields: string[];
  isArithmeticMismatch?: boolean;
}

export interface Invoice {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmountPaise: number;
  status: 'DRAFT' | 'CONFIRMED';
  items: InvoiceLine[];
  createdAt: string;
  confirmedAt?: string;
  uncertainFields: string[];
  source: 'OCR' | 'MANUAL' | 'SAMPLE';
  fileName?: string;
}

export interface DraftResponse {
  draftInvoice: Invoice;
  validation: { calculatedSumPaise: number; totalAmountPaise: number; isTotalMismatch: boolean; duplicateOf: { id: string; confirmedAt: string } | null };
}

export interface Sale {
  id: string;
  receiptNumber: string;
  items: { productId: string; productName: string; unit: Unit; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
  totalAmountPaise: number;
  createdByName: string;
  timestamp: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  movementType: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  createdByName: string;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  userName: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Paise are integers end to end; we only divide for display. */
export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}

/** Exact string -> paise conversion (no floating point). Returns null if not a valid amount. */
export function rupeesToPaise(input: string): number | null {
  const m = input.trim().replace(/,/g, '').match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'));
}

export function paiseToInput(paise: number): string {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}

export function formatQty(q: number, unit: Unit) {
  return `${Number.isInteger(q) ? q : q.toFixed(3).replace(/0+$/, '')} ${unit}`;
}

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleString('en-IN', withTime ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function newKey() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) {
    super(message);
  }
}

const TOKEN_KEY = 'stockpilot_token';
let token: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
})();
let onUnauthorized: () => void = () => {};

export const session = {
  get token() {
    return token;
  },
  set(t: string | null) {
    token = t;
    try {
      t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private mode: session lasts for this tab only */
    }
  },
  onUnauthorized(fn: () => void) {
    onUnauthorized = fn;
  },
};

async function request<T>(path: string, init: RequestInit & { json?: unknown; asToken?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const t = init.asToken ?? token;
  if (t) headers.Authorization = `Bearer ${t}`;
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, body });
  } catch {
    throw new ApiError(0, 'NETWORK', "Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !init.asToken && path !== '/api/auth/login') onUnauthorized();
    throw new ApiError(res.status, data.error || 'ERROR', data.message || `Request failed (${res.status}).`, data.details);
  }
  return data as T;
}

export const api = {
  request,
  demoAccounts: () => request<{ accounts: { username: string; name: string; role: Role; businessName: string }[] }>('/api/auth/demo-accounts'),
  login: (username: string, pin: string) => request<{ token: string }>('/api/auth/login', { method: 'POST', json: { username, pin } }),
  me: () => request<Me>('/api/auth/me'),

  metrics: () => request<{ metrics: Metrics }>('/api/ledger/metrics'),
  movements: (limit = 100) => request<{ movements: Movement[] }>(`/api/ledger/movements?limit=${limit}`),
  audit: (limit = 150) => request<{ audit: AuditEntry[] }>(`/api/ledger/audit?limit=${limit}`),
  updateSettings: (targetCoverDays: number) => request<{ business: Me['business'] }>('/api/ledger/settings', { method: 'PUT', json: { targetCoverDays } }),

  products: (p: { q?: string; status?: string; category?: string; archived?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (p.q) qs.set('q', p.q);
    if (p.status && p.status !== 'ALL') qs.set('status', p.status);
    if (p.category && p.category !== 'ALL') qs.set('category', p.category);
    if (p.archived) qs.set('archived', 'true');
    return request<{ products: Product[] }>(`/api/products?${qs}`);
  },
  product: (id: string) => request<{ product: Product }>(`/api/products/${id}`),
  productMovements: (id: string) => request<{ movements: Movement[] }>(`/api/products/${id}/movements`),
  createProduct: (data: Record<string, unknown>) => request<{ product: Product }>('/api/products', { method: 'POST', json: data }),
  updateProduct: (id: string, data: Record<string, unknown>) => request<{ product: Product }>(`/api/products/${id}`, { method: 'PUT', json: data }),
  archiveProduct: (id: string) => request<{ result: 'ARCHIVED' | 'DELETED'; message: string }>(`/api/products/${id}`, { method: 'DELETE' }),
  restoreProduct: (id: string) => request<{ product: Product }>(`/api/products/${id}/restore`, { method: 'POST' }),
  adjust: (id: string, deltaQuantity: number, reason: string, note: string) =>
    request<{ product: Product }>(`/api/products/${id}/adjust`, { method: 'POST', json: { deltaQuantity, reason, note } }),

  sell: (items: { productId: string; quantity: number }[], key: string) =>
    request<{ sale: Sale; replayed: boolean }>('/api/sales', { method: 'POST', json: { items }, headers: { 'Idempotency-Key': key } }),
  sales: () => request<{ sales: Sale[] }>('/api/sales?limit=30'),
  returnItem: (saleId: string, productId: string, quantity: number, reason: string) =>
    request<{ product: Product }>(`/api/sales/${saleId}/return`, { method: 'POST', json: { productId, quantity, reason } }),

  ocrStatus: () => request<{ provider: string | null }>('/api/invoices/ocr-status'),
  uploadInvoice: (file: File) => {
    const fd = new FormData();
    fd.append('invoiceFile', file);
    return request<DraftResponse>('/api/invoices/upload', { method: 'POST', body: fd });
  },
  manualDraft: (data: unknown) => request<DraftResponse>('/api/invoices/draft', { method: 'POST', json: data }),
  confirmInvoice: (id: string, data: unknown) => request<{ invoice: Invoice; alreadyConfirmed: boolean; message: string }>(`/api/invoices/${id}/confirm`, { method: 'POST', json: data }),
  invoices: () => request<{ invoices: Invoice[] }>('/api/invoices'),

  parseSale: (text: string) => request<{ source: 'ai' | 'rules'; items: { productId: string; quantity: number }[]; unmatched: string[] }>('/api/ai/parse-sale', { method: 'POST', json: { text } }),
  brief: () => request<{ brief: string; source: 'ai' | 'rules' }>('/api/ai/brief'),
  recommendations: () => request<{ recommendations: Recommendation[] }>('/api/forecast/recommendations'),
  importHistory: (csv: string) => request<{ importedRows: number }>('/api/forecast/import-history', { method: 'POST', body: csv, headers: { 'Content-Type': 'text/csv' } }),
  async downloadRestockCsv() {
    const res = await fetch('/api/forecast/export-csv', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError(res.status, 'EXPORT_FAILED', 'Could not export the list.');
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'restock.csv';
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
