import fs from 'node:fs';
import path from 'node:path';
import {
  Business,
  User,
  Product,
  InventoryMovement,
  Invoice,
  InvoiceLineItem,
  SaleTransaction,
  ProductStockSummary,
  SaleItem,
  AuditLog,
  HistoricalSale,
  UnitOfMeasure,
} from './schema.ts';
import { INITIAL_BUSINESSES, INITIAL_USERS, INITIAL_PRODUCTS, generateSeedMovements } from './seed.ts';
import { hashPassword } from '../middleware/password.ts';

// ---------------------------------------------------------------------------
// Errors & validation helpers
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

const UNITS: UnitOfMeasure[] = ['pcs', 'kg', 'litre', 'box'];
const FRACTIONAL_UNITS: UnitOfMeasure[] = ['kg', 'litre'];
const FORECAST_WINDOW_DAYS = 14;
const MIN_HISTORY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date (YYYY-MM-DD) in India Standard Time, so "today" matches the shop's day. */
export function istDate(d: Date | string = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(d));
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function assertPaise(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1e11) {
    throw new AppError(400, 'INVALID_PRICE', `${field} must be a positive amount in rupees with at most two decimals.`);
  }
  return value;
}

/** Quantities must be positive; pcs/box must be whole numbers, kg/litre allow up to 3 decimals. */
export function assertQuantity(value: unknown, unit: UnitOfMeasure, label = 'Quantity'): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new AppError(400, 'INVALID_QUANTITY', `${label} must be a number greater than zero.`);
  }
  if (!FRACTIONAL_UNITS.includes(unit) && !Number.isInteger(value)) {
    throw new AppError(400, 'INVALID_QUANTITY', `${label} must be a whole number for items sold in ${unit}.`);
  }
  if (round3(value) !== value) {
    throw new AppError(400, 'INVALID_QUANTITY', `${label} can have at most 3 decimal places.`);
  }
  return value;
}

function assertInt(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new AppError(400, 'VALIDATION_FAILED', `${field} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

function assertText(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, 'VALIDATION_FAILED', `${field} is required.`);
  }
  if (value.trim().length > max) {
    throw new AppError(400, 'VALIDATION_FAILED', `${field} must be at most ${max} characters.`);
  }
  return value.trim();
}

function assertUnit(value: unknown): UnitOfMeasure {
  if (!UNITS.includes(value as UnitOfMeasure)) {
    throw new AppError(400, 'VALIDATION_FAILED', `Unit must be one of: ${UNITS.join(', ')}.`);
  }
  return value as UnitOfMeasure;
}

/** Similarity score 0..1 between an invoice line and a catalogue product name. */
export function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const s1 = norm(a);
  const s2 = norm(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const t1 = new Set(s1.split(' '));
  const t2 = new Set(s2.split(' '));
  let common = 0;
  t1.forEach((t) => t2.has(t) && common++);
  const dice = (2 * common) / (t1.size + t2.size);
  const contains = s1.includes(s2) || s2.includes(s1) ? 0.85 : 0;
  return Math.round(Math.max(dice, contains) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Ledger engine
// ---------------------------------------------------------------------------

interface PersistedState {
  businesses: Business[];
  users: User[];
  products: Product[];
  movements: InventoryMovement[];
  invoices: Invoice[];
  sales: SaleTransaction[];
  history: HistoricalSale[];
  audit: AuditLog[];
  idempotency: [string, string][];
}

export interface InvoiceConfirmLine {
  rawProductName: string;
  matchedProductId?: string | null;
  newProduct?: { name: string; unit: UnitOfMeasure; sellingPricePaise: number; category?: string } | null;
  quantity: number;
  unitPricePaise: number;
}

export interface InvoiceConfirmPayload {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmountPaise: number;
  items: InvoiceConfirmLine[];
}

export interface ExtractedInvoice {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmountPaise: number;
  uncertainFields?: string[];
  lines: { rawName: string; sku?: string; qty: number; unitCostPaise: number; totalPaise: number; uncertainFields?: string[] }[];
}

/**
 * Stock is never stored as a number: it is always the sum of the movement ledger.
 * Every mutating method validates everything first and only then writes, inside one
 * synchronous block. Node runs one JavaScript callback at a time, so no other request
 * can interleave between "check stock" and "write movement" — that block is our transaction.
 */
export class InventoryLedgerEngine {
  private businesses = new Map<string, Business>();
  private users = new Map<string, User>();
  private products = new Map<string, Product>();
  private movements: InventoryMovement[] = [];
  private invoices = new Map<string, Invoice>();
  private sales = new Map<string, SaleTransaction>();
  private history: HistoricalSale[] = [];
  private audit: AuditLog[] = [];
  /** `${businessId}:${key}` -> saleId. Scoped per business so keys can't leak receipts across tenants. */
  private idempotency = new Map<string, string>();
  private receiptCounter = 0;

  constructor(private dataFile: string | null) {
    if (dataFile && fs.existsSync(dataFile)) {
      this.load(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
    } else {
      this.resetToDefaults();
    }
  }

  // --- Persistence -----------------------------------------------------------

  private load(state: PersistedState) {
    this.businesses = new Map(state.businesses.map((b) => [b.id, b]));
    // Older snapshots stored demo PINs in plain text; hash them on load.
    this.users = new Map(
      state.users.map((u: any) => {
        if (u.pin && !u.passwordHash) {
          const { pin, ...rest } = u;
          return [u.id, { ...rest, passwordHash: hashPassword(pin) }];
        }
        return [u.id, u];
      })
    );
    this.products = new Map(state.products.map((p) => [p.id, p]));
    this.movements = state.movements;
    this.invoices = new Map(state.invoices.map((i) => [i.id, i]));
    this.sales = new Map(state.sales.map((s) => [s.id, s]));
    this.history = state.history;
    this.audit = state.audit;
    this.idempotency = new Map(state.idempotency);
    this.receiptCounter = this.sales.size;
  }

  /** Write-through snapshot after every committed change, so a restart never loses the ledger. */
  private persist() {
    if (!this.dataFile) return;
    const state: PersistedState = {
      businesses: [...this.businesses.values()],
      users: [...this.users.values()],
      products: [...this.products.values()],
      movements: this.movements,
      invoices: [...this.invoices.values()],
      sales: [...this.sales.values()],
      history: this.history,
      audit: this.audit,
      idempotency: [...this.idempotency.entries()],
    };
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    const tmp = `${this.dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, this.dataFile);
  }

  public resetToDefaults() {
    this.businesses = new Map(INITIAL_BUSINESSES.map((b) => [b.id, { ...b }]));
    this.users = new Map(INITIAL_USERS.map(({ pin, ...u }) => [u.id, { ...u, passwordHash: hashPassword(pin) }]));
    this.products = new Map(INITIAL_PRODUCTS.map((p) => [p.id, { ...p }]));
    this.movements = generateSeedMovements();
    this.invoices.clear();
    this.sales.clear();
    this.history = [];
    this.audit = [];
    this.idempotency.clear();
    this.receiptCounter = 0;
    this.persist();
  }

  // --- Lookups ---------------------------------------------------------------

  public getBusiness(businessId: string) {
    return this.businesses.get(businessId);
  }

  public getUser(userId: string) {
    return this.users.get(userId);
  }

  /** Login identifier can be the username or the email address. */
  public findUserByLogin(identifier: string) {
    const id = identifier.trim().toLowerCase();
    return [...this.users.values()].find((x) => x.username === id || (x.email && x.email === id));
  }

  // --- Accounts: owner sign-up and staff management ---------------------------

  private assertNewEmail(email: unknown): string {
    const e = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 120) throw new AppError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
    if (this.findUserByLogin(e)) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    return e;
  }

  private assertPassword(password: unknown): string {
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new AppError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters.');
    }
    return password;
  }

  /** Creates a new business and its owner. Each sign-up gets its own isolated inventory. */
  public registerOwner(data: Record<string, unknown>) {
    const name = assertText(data.name, 'Your name', 60);
    const businessName = assertText(data.businessName, 'Business name', 80);
    const email = this.assertNewEmail(data.email);
    const password = this.assertPassword(data.password);
    const type = (['KIRANA', 'PHARMACY', 'GENERAL'].includes(String(data.businessType)) ? data.businessType : 'GENERAL') as Business['type'];
    const business: Business = { id: newId('biz'), name: businessName, ownerName: name, type, currency: 'INR', address: '', targetCoverDays: 4 };
    const user: User = { id: newId('usr'), businessId: business.id, username: email, email, name, role: 'OWNER', passwordHash: hashPassword(password) };
    this.businesses.set(business.id, business);
    this.users.set(user.id, user);
    this.logAudit({ businessId: business.id, userId: user.id, action: 'BUSINESS_CREATED', entityType: 'AUTH', entityId: business.id, summary: `${name} created ${businessName}` });
    this.persist();
    return user;
  }

  /** Staff can't sign themselves up; the owner creates their account inside the owner's business. */
  public createStaff(businessId: string, ownerId: string, data: Record<string, unknown>) {
    const name = assertText(data.name, 'Name', 60);
    const email = this.assertNewEmail(data.email);
    const password = this.assertPassword(data.password);
    const user: User = { id: newId('usr'), businessId, username: email, email, name, role: 'STAFF', passwordHash: hashPassword(password) };
    this.users.set(user.id, user);
    this.logAudit({ businessId, userId: ownerId, action: 'STAFF_ADDED', entityType: 'AUTH', entityId: user.id, summary: `Added staff member ${name} (${email})` });
    this.persist();
    return this.publicUser(user);
  }

  public listStaff(businessId: string) {
    return [...this.users.values()].filter((u) => u.businessId === businessId).map((u) => this.publicUser(u));
  }

  /** Removing staff disables the account; their past sales stay in the ledger. */
  public removeStaff(businessId: string, ownerId: string, userId: string) {
    const user = this.users.get(userId);
    if (!user || user.businessId !== businessId) throw new AppError(404, 'USER_NOT_FOUND', 'Staff member not found.');
    if (user.role !== 'STAFF') throw new AppError(400, 'NOT_STAFF', 'Only staff accounts can be removed here.');
    this.users.set(userId, { ...user, disabled: true });
    this.logAudit({ businessId, userId: ownerId, action: 'STAFF_REMOVED', entityType: 'AUTH', entityId: userId, summary: `Removed staff member ${user.name}` });
    this.persist();
  }

  public publicUser(u: User) {
    return { id: u.id, username: u.username, email: u.email, name: u.name, role: u.role, disabled: !!u.disabled };
  }

  public listUsers() {
    return [...this.users.values()];
  }

  /** Returns the product only if it belongs to this business. Other tenants get a plain 404 —
   *  we don't even confirm the ID exists. */
  public getOwnedProduct(businessId: string, productId: string): Product {
    const product = this.products.get(productId);
    if (!product || product.businessId !== businessId) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }
    return product;
  }

  private logAudit(entry: Omit<AuditLog, 'id' | 'timestamp' | 'userName'>) {
    this.audit.push({
      ...entry,
      id: newId('aud'),
      userName: this.users.get(entry.userId)?.name || 'System',
      timestamp: new Date().toISOString(),
    });
  }

  // --- Stock & forecasting ---------------------------------------------------

  public getCurrentStock(businessId: string, productId: string): number {
    let stock = 0;
    for (const m of this.movements) {
      if (m.productId === productId && m.businessId === businessId) stock += m.quantity;
    }
    return round3(stock);
  }

  /** Units sold per IST calendar day: live SALE movements (net of returns) plus imported history. */
  private dailySales(businessId: string, productId: string): Map<string, number> {
    const days = new Map<string, number>();
    for (const m of this.movements) {
      if (m.businessId !== businessId || m.productId !== productId) continue;
      if (m.movementType === 'SALE' || m.movementType === 'RETURN') {
        const d = istDate(m.timestamp);
        days.set(d, round3((days.get(d) || 0) - m.quantity));
      }
    }
    for (const h of this.history) {
      if (h.businessId === businessId && h.productId === productId) {
        days.set(h.date, round3((days.get(h.date) || 0) + h.quantity));
      }
    }
    return days;
  }

  private calculateForecast(product: Product, currentStock: number) {
    const business = this.businesses.get(product.businessId)!;
    const days = this.dailySales(product.businessId, product.id);
    const today = istDate();
    const todayMs = Date.parse(today);

    const saleDates = [...days.keys()].filter((d) => days.get(d)! > 0).sort();
    const firstSale = saleDates[0];
    // Days of history = calendar days from first recorded sale up to and including today.
    const historyDays = firstSale ? Math.round((todayMs - Date.parse(firstSale)) / DAY_MS) + 1 : 0;
    const hasEnoughHistory = historyDays >= MIN_HISTORY_DAYS;

    // Average over the last 14 days (or fewer if the product is newer), counting zero-sale days.
    const windowDays = Math.min(FORECAST_WINDOW_DAYS, Math.max(historyDays, 1));
    const windowStart = todayMs - (windowDays - 1) * DAY_MS;
    let unitsInWindow = 0;
    for (const [d, qty] of days) {
      const t = Date.parse(d);
      if (t >= windowStart && t <= todayMs) unitsInWindow += qty;
    }
    const salesVelocity = Math.max(0, unitsInWindow / windowDays);

    let daysOfCover: number | null = null;
    let predictedStockOutDate: string | null = null;
    if (salesVelocity > 0) {
      daysOfCover = Math.round((currentStock / salesVelocity) * 10) / 10;
      predictedStockOutDate = new Date(todayMs + Math.floor(currentStock / salesVelocity) * DAY_MS)
        .toISOString()
        .slice(0, 10);
    }

    // Alert rules from the brief: stock <= reorder level, or days of cover <= lead time.
    let alertReason: string | null = null;
    if (currentStock <= 0) alertReason = 'Out of stock';
    else if (currentStock <= product.reorderLevel) alertReason = `Stock ${currentStock} ≤ reorder level ${product.reorderLevel}`;
    else if (hasEnoughHistory && daysOfCover !== null && daysOfCover <= product.leadTimeDays)
      alertReason = `${daysOfCover} days of cover ≤ ${product.leadTimeDays}-day lead time`;

    const targetDaysCover = product.leadTimeDays + business.targetCoverDays;
    const packSize = product.packSize || 1;
    const v = Math.round(salesVelocity * 10) / 10;
    let recommendedQuantity: number | null = null;
    let explanation: string;
    let calculation: string | null = null;

    if (!hasEnoughHistory) {
      explanation = `Not enough history — ${historyDays} of ${MIN_HISTORY_DAYS} days of sales recorded.`;
    } else {
      // Cover lead time + target days of sales. If the item is flagged by its reorder level, also make
      // sure the delivery lifts stock back above that level after the lead-time sales.
      const coverTarget = salesVelocity * targetDaysCover;
      const floorTarget = alertReason ? product.reorderLevel + salesVelocity * product.leadTimeDays : 0;
      const usesFloor = floorTarget > coverTarget;
      const deficit = Math.max(0, Math.max(coverTarget, floorTarget) - currentStock);
      const packs = Math.ceil(round3(deficit / packSize));
      recommendedQuantity = packs * packSize;
      const r1 = (n: number) => Math.round(n * 10) / 10;
      calculation = usesFloor
        ? `${product.reorderLevel} + ${r1(salesVelocity)} × ${product.leadTimeDays} − ${currentStock} = ${r1(deficit)}`
        : `${r1(salesVelocity)} × (${product.leadTimeDays} + ${business.targetCoverDays}) − ${currentStock} = ${r1(deficit)}`;
      calculation += packSize > 1 ? ` → round up to packs of ${packSize} → ${recommendedQuantity}` : ` → round up → ${recommendedQuantity}`;
      const packText = packSize > 1 && packs > 0 ? ` (${packs} ${packs === 1 ? 'pack' : 'packs'} of ${packSize})` : '';
      explanation =
        salesVelocity === 0
          ? `No sales in the last ${windowDays} days — no reorder needed.`
          : usesFloor
            ? `Sells ${v}/day, ${currentStock} left, ${product.leadTimeDays}-day lead time, reorder level ${product.reorderLevel} → order ${recommendedQuantity}${packText} to stay above the reorder level`
            : `Sells ${v}/day, ${currentStock} left, ${product.leadTimeDays}-day lead time + ${business.targetCoverDays} days cover → order ${recommendedQuantity}${packText}`;
    }

    return {
      salesVelocity: Math.round(salesVelocity * 100) / 100,
      daysOfCover,
      predictedStockOutDate,
      targetDaysCover,
      recommendedQuantity,
      explanation,
      calculation,
      hasEnoughHistory,
      historyDays,
      alertReason,
    };
  }

  public getProductSummary(businessId: string, productId: string): ProductStockSummary {
    const prod = this.getOwnedProduct(businessId, productId);
    let currentStock = 0;
    let totalPurchased = 0;
    let totalSold = 0;
    let totalAdjusted = 0;
    for (const m of this.movements) {
      if (m.productId !== productId || m.businessId !== businessId) continue;
      currentStock += m.quantity;
      if (m.movementType === 'PURCHASE') totalPurchased += m.quantity;
      if (m.movementType === 'SALE') totalSold -= m.quantity;
      if (m.movementType === 'ADJUSTMENT') totalAdjusted += m.quantity;
    }
    currentStock = round3(currentStock);
    const f = this.calculateForecast(prod, currentStock);
    const status = currentStock <= 0 ? 'OUT_OF_STOCK' : f.alertReason ? 'LOW_STOCK' : 'IN_STOCK';

    return {
      ...prod,
      currentStock,
      totalPurchased: round3(totalPurchased),
      totalSold: round3(totalSold),
      totalAdjusted: round3(totalAdjusted),
      salesVelocity: f.salesVelocity,
      daysOfCover: f.daysOfCover,
      predictedStockOutDate: f.predictedStockOutDate,
      status,
      restockRecommendation: {
        needsRestock: status !== 'IN_STOCK',
        recommendedQuantity: f.recommendedQuantity,
        targetDaysCover: f.targetDaysCover,
        packSize: prod.packSize,
        explanation: f.explanation,
        calculation: f.calculation,
        hasEnoughHistory: f.hasEnoughHistory,
        historyDays: f.historyDays,
        alertReason: f.alertReason,
      },
    };
  }

  public listProducts(
    businessId: string,
    filter: { category?: string; query?: string; status?: string; includeArchived?: boolean } = {}
  ): ProductStockSummary[] {
    const q = filter.query?.trim().toLowerCase();
    const out: ProductStockSummary[] = [];
    for (const p of this.products.values()) {
      if (p.businessId !== businessId) continue;
      if (!filter.includeArchived && p.isArchived) continue;
      if (filter.category && filter.category !== 'ALL' && p.category !== filter.category) continue;
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) continue;
      const summary = this.getProductSummary(businessId, p.id);
      if (filter.status && filter.status !== 'ALL' && summary.status !== filter.status) continue;
      out.push(summary);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  // --- Products --------------------------------------------------------------

  private validateProductFields(data: Record<string, unknown>, partial: boolean) {
    const clean: Partial<Product> = {};
    const has = (k: string) => data[k] !== undefined;
    if (!partial || has('name')) clean.name = assertText(data.name, 'Product name');
    if (!partial || has('sku')) clean.sku = assertText(data.sku, 'SKU', 40).toUpperCase();
    if (!partial || has('category')) clean.category = data.category ? assertText(data.category, 'Category', 40) : 'General';
    if (!partial || has('unit')) clean.unit = assertUnit(data.unit);
    if (!partial || has('costPricePaise')) clean.costPricePaise = assertPaise(data.costPricePaise, 'Cost price');
    if (!partial || has('sellingPricePaise')) clean.sellingPricePaise = assertPaise(data.sellingPricePaise, 'Selling price');
    if (!partial || has('reorderLevel')) {
      const r = data.reorderLevel ?? 10;
      if (typeof r !== 'number' || !Number.isFinite(r) || r < 0) throw new AppError(400, 'VALIDATION_FAILED', 'Reorder level must be zero or more.');
      clean.reorderLevel = r;
    }
    if (!partial || has('leadTimeDays')) clean.leadTimeDays = assertInt(data.leadTimeDays ?? 3, 'Lead time (days)', 0, 90);
    if (!partial || has('packSize')) clean.packSize = assertInt(data.packSize ?? 1, 'Pack size', 1, 1000);
    return clean;
  }

  private assertSkuFree(businessId: string, sku: string, exceptId?: string) {
    for (const p of this.products.values()) {
      if (p.businessId === businessId && p.id !== exceptId && p.sku.toLowerCase() === sku.toLowerCase()) {
        throw new AppError(409, 'DUPLICATE_SKU', `SKU '${sku}' is already used by "${p.name}".`);
      }
    }
  }

  private createProductUnchecked(businessId: string, userId: string, data: Partial<Product>): Product {
    const now = new Date().toISOString();
    const product = { ...data, id: newId('prod'), businessId, isArchived: false, createdAt: now, updatedAt: now } as Product;
    this.products.set(product.id, product);
    this.logAudit({
      businessId,
      userId,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      summary: `Created product "${product.name}" (${product.sku})`,
    });
    return product;
  }

  public addProduct(businessId: string, userId: string, data: Record<string, unknown>, openingStock = 0): ProductStockSummary {
    const clean = this.validateProductFields(data, false);
    this.assertSkuFree(businessId, clean.sku!);
    if (openingStock !== 0) assertQuantity(openingStock, clean.unit!, 'Opening stock');

    const product = this.createProductUnchecked(businessId, userId, clean);
    if (openingStock > 0) {
      this.pushMovement(businessId, userId, product, 'ADJUSTMENT', openingStock, 'Opening stock');
    }
    this.persist();
    return this.getProductSummary(businessId, product.id);
  }

  public updateProduct(businessId: string, userId: string, productId: string, updates: Record<string, unknown>) {
    const product = this.getOwnedProduct(businessId, productId);
    // Whitelist: id, businessId, isArchived and stock can never be set through an edit.
    const clean = this.validateProductFields(updates, true);
    if (clean.sku) this.assertSkuFree(businessId, clean.sku, productId);
    if (clean.unit && clean.unit !== product.unit && !FRACTIONAL_UNITS.includes(clean.unit)) {
      const stock = this.getCurrentStock(businessId, productId);
      if (!Number.isInteger(stock)) throw new AppError(400, 'VALIDATION_FAILED', `Can't switch to ${clean.unit}: current stock ${stock} is fractional.`);
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of Object.entries(clean)) {
      const before = (product as any)[k];
      if (before !== v) changes[k] = { from: before, to: v };
    }
    if (Object.keys(changes).length === 0) return this.getProductSummary(businessId, productId);

    this.products.set(productId, { ...product, ...clean, updatedAt: new Date().toISOString() });
    this.logAudit({
      businessId,
      userId,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: productId,
      summary: `Edited "${product.name}": ${Object.keys(changes).join(', ')}`,
      details: changes,
    });
    this.persist();
    return this.getProductSummary(businessId, productId);
  }

  /** Products with any ledger history are archived; a product with no history is removed outright. */
  public archiveProduct(businessId: string, userId: string, productId: string): 'ARCHIVED' | 'DELETED' {
    const product = this.getOwnedProduct(businessId, productId);
    const hasHistory = this.movements.some((m) => m.productId === productId) || this.history.some((h) => h.productId === productId);
    if (hasHistory) {
      this.products.set(productId, { ...product, isArchived: true, updatedAt: new Date().toISOString() });
    } else {
      this.products.delete(productId);
    }
    this.logAudit({
      businessId,
      userId,
      action: hasHistory ? 'PRODUCT_ARCHIVED' : 'PRODUCT_DELETED',
      entityType: 'PRODUCT',
      entityId: productId,
      summary: `${hasHistory ? 'Archived' : 'Deleted'} "${product.name}"`,
    });
    this.persist();
    return hasHistory ? 'ARCHIVED' : 'DELETED';
  }

  public restoreProduct(businessId: string, userId: string, productId: string) {
    const product = this.getOwnedProduct(businessId, productId);
    this.products.set(productId, { ...product, isArchived: false, updatedAt: new Date().toISOString() });
    this.logAudit({ businessId, userId, action: 'PRODUCT_RESTORED', entityType: 'PRODUCT', entityId: productId, summary: `Restored "${product.name}"` });
    this.persist();
    return this.getProductSummary(businessId, productId);
  }

  // --- Movements -------------------------------------------------------------

  private pushMovement(
    businessId: string,
    userId: string,
    product: Product,
    type: InventoryMovement['movementType'],
    quantity: number,
    reason: string,
    extra: Partial<InventoryMovement> = {},
    timestamp = new Date().toISOString()
  ) {
    const m: InventoryMovement = {
      id: newId('mvt'),
      businessId,
      productId: product.id,
      movementType: type,
      quantity: round3(quantity),
      unitCostPaise: product.costPricePaise,
      unitPricePaise: product.sellingPricePaise,
      reason,
      createdByUserId: userId,
      createdByName: this.users.get(userId)?.name || 'System',
      timestamp,
      ...extra,
    };
    this.movements.push(m);
    return m;
  }

  public manualStockAdjustment(businessId: string, userId: string, productId: string, delta: unknown, reason: unknown, note?: unknown) {
    const product = this.getOwnedProduct(businessId, productId);
    const r = assertText(reason, 'Reason', 60);
    if (typeof delta !== 'number' || delta === 0) throw new AppError(400, 'INVALID_QUANTITY', 'Adjustment must be a non-zero number.');
    assertQuantity(Math.abs(delta), product.unit, 'Adjustment');
    const current = this.getCurrentStock(businessId, productId);
    if (round3(current + delta) < 0) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', `Can't remove ${Math.abs(delta)} ${product.unit} — only ${current} in stock.`);
    }
    const fullReason = typeof note === 'string' && note.trim() ? `${r} — ${note.trim().slice(0, 120)}` : r;
    const m = this.pushMovement(businessId, userId, product, 'ADJUSTMENT', delta, fullReason);
    this.logAudit({
      businessId,
      userId,
      action: 'STOCK_ADJUSTED',
      entityType: 'ADJUSTMENT',
      entityId: m.id,
      summary: `Adjusted "${product.name}" by ${delta > 0 ? '+' : ''}${delta} ${product.unit} (${fullReason})`,
      details: { productId, before: current, after: round3(current + delta) },
    });
    this.persist();
    return this.getProductSummary(businessId, productId);
  }

  // --- Sales -----------------------------------------------------------------

  public recordSale(businessId: string, userId: string, rawItems: unknown, idempotencyKey?: string) {
    // 1. Replay of a request we've already processed -> return the original receipt, no stock change.
    const idemKey = idempotencyKey ? `${businessId}:${idempotencyKey}` : null;
    if (idemKey && this.idempotency.has(idemKey)) {
      return { sale: this.sales.get(this.idempotency.get(idemKey)!)!, replayed: true };
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 100) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'A sale needs at least one item.');
    }

    // 2. Merge duplicate lines so two lines of the same product can't each pass the stock check.
    const merged = new Map<string, number>();
    for (const it of rawItems as SaleItem[]) {
      if (!it || typeof it.productId !== 'string') throw new AppError(400, 'INVALID_PAYLOAD', 'Each item needs a productId.');
      if (typeof it.quantity !== 'number' || !Number.isFinite(it.quantity)) throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be a number.');
      merged.set(it.productId, round3((merged.get(it.productId) || 0) + it.quantity));
    }

    // 3. Validate every line against current stock. Nothing has been written yet.
    const lines = [...merged.entries()].map(([productId, quantity]) => {
      const product = this.getOwnedProduct(businessId, productId);
      if (product.isArchived) throw new AppError(400, 'PRODUCT_ARCHIVED', `"${product.name}" is archived and can't be sold.`);
      assertQuantity(quantity, product.unit, `Quantity for "${product.name}"`);
      const available = this.getCurrentStock(businessId, productId);
      if (available < quantity) {
        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `Not enough stock for "${product.name}": ${available} ${product.unit} left, ${quantity} requested.`,
          { productId, productName: product.name, requested: quantity, available }
        );
      }
      return { product, quantity, lineTotalPaise: Math.round(quantity * product.sellingPricePaise) };
    });

    // 4. Commit: all movements + receipt in the same synchronous block.
    const saleId = newId('sale');
    const timestamp = new Date().toISOString();
    const receiptNumber = `R-${istDate().replace(/-/g, '').slice(2)}-${String(++this.receiptCounter).padStart(4, '0')}`;
    for (const l of lines) {
      this.pushMovement(businessId, userId, l.product, 'SALE', -l.quantity, `Sale ${receiptNumber}`, { referenceId: saleId }, timestamp);
    }
    const sale: SaleTransaction = {
      id: saleId,
      businessId,
      receiptNumber,
      items: lines.map((l) => ({
        productId: l.product.id,
        productName: l.product.name,
        sku: l.product.sku,
        unit: l.product.unit,
        quantity: l.quantity,
        unitPricePaise: l.product.sellingPricePaise,
        lineTotalPaise: l.lineTotalPaise,
      })),
      totalAmountPaise: lines.reduce((s, l) => s + l.lineTotalPaise, 0),
      createdByUserId: userId,
      createdByName: this.users.get(userId)?.name || 'Staff',
      timestamp,
      idempotencyKey,
    };
    this.sales.set(saleId, sale);
    if (idemKey) this.idempotency.set(idemKey, saleId);
    this.logAudit({
      businessId,
      userId,
      action: 'SALE_RECORDED',
      entityType: 'SALE',
      entityId: saleId,
      summary: `Sale ${receiptNumber}: ${lines.length} item(s), ₹${(sale.totalAmountPaise / 100).toFixed(2)}`,
    });
    this.persist();
    return { sale, replayed: false };
  }

  /** Return items against a receipt. Can't return more than was sold minus earlier returns. */
  public recordReturn(businessId: string, userId: string, saleId: string, productId: unknown, quantity: unknown, reason: unknown) {
    const sale = this.sales.get(saleId);
    if (!sale || sale.businessId !== businessId) throw new AppError(404, 'SALE_NOT_FOUND', 'Receipt not found.');
    const line = sale.items.find((i) => i.productId === productId);
    if (!line) throw new AppError(400, 'VALIDATION_FAILED', 'That product is not on this receipt.');
    const product = this.getOwnedProduct(businessId, line.productId);
    const qty = assertQuantity(quantity, product.unit, 'Return quantity');
    const r = assertText(reason, 'Reason', 80);
    const alreadyReturned = this.movements
      .filter((m) => m.movementType === 'RETURN' && m.referenceId === saleId && m.productId === product.id)
      .reduce((s, m) => s + m.quantity, 0);
    if (round3(alreadyReturned + qty) > line.quantity) {
      throw new AppError(409, 'RETURN_EXCEEDS_SALE', `Only ${round3(line.quantity - alreadyReturned)} ${product.unit} of "${product.name}" can still be returned.`);
    }
    const m = this.pushMovement(businessId, userId, product, 'RETURN', qty, `Return on ${sale.receiptNumber}: ${r}`, {
      referenceId: saleId,
      unitPricePaise: line.unitPricePaise,
    });
    this.logAudit({ businessId, userId, action: 'RETURN_RECORDED', entityType: 'SALE', entityId: m.id, summary: `Returned ${qty} ${product.unit} "${product.name}" on ${sale.receiptNumber}` });
    this.persist();
    return this.getProductSummary(businessId, product.id);
  }

  public getSalesHistory(businessId: string, limit = 50) {
    return [...this.sales.values()].filter((s) => s.businessId === businessId).slice(-limit).reverse();
  }

  // --- Sales history CSV import (forecast input only) ------------------------

  /**
   * Imports past daily sales from CSV (date,sku,quantity). These rows feed the forecast only —
   * they describe sales that happened before the shop used StockPilot, so they don't touch
   * current stock. Re-importing a (date, sku) pair replaces it rather than doubling it.
   */
  public importSalesHistory(businessId: string, userId: string, csv: string) {
    const rows = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rows.length === 0) throw new AppError(400, 'EMPTY_CSV', 'The CSV file is empty.');
    const header = rows[0].toLowerCase().split(',').map((h) => h.trim());
    const di = header.indexOf('date');
    const si = header.indexOf('sku');
    const qi = header.indexOf('quantity');
    if (di < 0 || si < 0 || qi < 0) throw new AppError(400, 'BAD_CSV_HEADER', 'CSV must have a header row with columns: date, sku, quantity.');

    const bySku = new Map<string, Product>();
    for (const p of this.products.values()) if (p.businessId === businessId) bySku.set(p.sku.toLowerCase(), p);

    const today = istDate();
    const errors: string[] = [];
    const parsed: HistoricalSale[] = [];
    rows.slice(1).forEach((row, i) => {
      const cols = row.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const lineNo = i + 2;
      const date = cols[di];
      const product = bySku.get((cols[si] || '').toLowerCase());
      const qty = Number(cols[qi]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) return errors.push(`Line ${lineNo}: date must be YYYY-MM-DD.`);
      if (date >= today) return errors.push(`Line ${lineNo}: ${date} is not in the past.`);
      if (!product) return errors.push(`Line ${lineNo}: unknown SKU "${cols[si]}".`);
      try {
        assertQuantity(qty, product.unit);
      } catch (e: any) {
        return errors.push(`Line ${lineNo}: ${e.message}`);
      }
      parsed.push({ businessId, productId: product.id, date, quantity: qty });
    });
    if (errors.length) throw new AppError(400, 'CSV_ROWS_INVALID', `Nothing imported. Fix these rows: ${errors.slice(0, 5).join(' ')}${errors.length > 5 ? ` (+${errors.length - 5} more)` : ''}`, { errors });

    // Collapse duplicates inside the file, then replace any existing rows for the same day+product.
    const keyed = new Map<string, HistoricalSale>();
    for (const p of parsed) {
      const k = `${p.productId}|${p.date}`;
      const prev = keyed.get(k);
      keyed.set(k, prev ? { ...prev, quantity: round3(prev.quantity + p.quantity) } : p);
    }
    this.history = this.history.filter((h) => h.businessId !== businessId || !keyed.has(`${h.productId}|${h.date}`));
    this.history.push(...keyed.values());
    this.logAudit({ businessId, userId, action: 'SALES_HISTORY_IMPORTED', entityType: 'IMPORT', entityId: newId('imp'), summary: `Imported ${keyed.size} day(s) of past sales from CSV` });
    this.persist();
    return { importedRows: keyed.size };
  }

  // --- Invoices (OCR suggests, owner confirms) --------------------------------

  public findConfirmedInvoice(businessId: string, supplierName: string, invoiceNumber: string) {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    for (const inv of this.invoices.values()) {
      if (
        inv.businessId === businessId &&
        inv.status === 'CONFIRMED' &&
        norm(inv.supplierName) === norm(supplierName) &&
        norm(inv.invoiceNumber) === norm(invoiceNumber)
      ) {
        return inv;
      }
    }
    return undefined;
  }

  /** Turn raw extraction into a reviewable draft: match each line to the catalogue and run the maths checks. */
  public createDraftInvoice(businessId: string, userId: string, ex: ExtractedInvoice, source: Invoice['source'], fileName?: string) {
    const catalogue = [...this.products.values()].filter((p) => p.businessId === businessId && !p.isArchived);
    const items: InvoiceLineItem[] = ex.lines.map((line, idx) => {
      const bySku = line.sku ? catalogue.find((p) => p.sku.toLowerCase() === line.sku!.trim().toLowerCase()) : undefined;
      let best: Product | undefined = bySku;
      let score = bySku ? 1 : 0;
      if (!bySku) {
        for (const p of catalogue) {
          const s = nameSimilarity(line.rawName, p.name);
          if (s > score) {
            score = s;
            best = p;
          }
        }
      }
      const matched = score >= 0.5 ? best : undefined;
      return {
        id: `line_${idx + 1}`,
        rawProductName: line.rawName,
        matchedProductId: matched?.id,
        matchedProductName: matched?.name,
        isNewProduct: !matched,
        newProductUnit: 'pcs',
        quantity: line.qty,
        unitPricePaise: line.unitCostPaise,
        lineTotalPaise: line.totalPaise,
        confidence: matched ? score : 0,
        matchType: bySku ? 'SKU' : !matched ? 'NEW' : score === 1 ? 'EXACT' : 'FUZZY',
        uncertainFields: line.uncertainFields || [],
        isArithmeticMismatch: Math.abs(Math.round(line.qty * line.unitCostPaise) - line.totalPaise) > 1,
      };
    });

    const draft: Invoice = {
      id: newId('inv'),
      businessId,
      supplierName: ex.supplierName,
      invoiceNumber: ex.invoiceNumber,
      invoiceDate: ex.invoiceDate,
      totalAmountPaise: ex.totalAmountPaise,
      status: 'DRAFT',
      items,
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
      uncertainFields: ex.uncertainFields || [],
      source,
      fileName,
    };
    this.invoices.set(draft.id, draft);
    this.logAudit({ businessId, userId, action: 'INVOICE_EXTRACTED', entityType: 'INVOICE', entityId: draft.id, summary: `Invoice ${ex.invoiceNumber || '(no number)'} from ${ex.supplierName || '(unknown supplier)'} extracted for review (${source})` });
    this.persist();

    const sum = items.reduce((s, i) => s + i.lineTotalPaise, 0);
    const duplicate = this.findConfirmedInvoice(businessId, draft.supplierName, draft.invoiceNumber);
    return {
      draftInvoice: draft,
      validation: {
        calculatedSumPaise: sum,
        totalAmountPaise: draft.totalAmountPaise,
        isTotalMismatch: sum !== draft.totalAmountPaise,
        duplicateOf: duplicate ? { id: duplicate.id, confirmedAt: duplicate.confirmedAt } : null,
      },
    };
  }

  /**
   * Applies a reviewed invoice. Every line is validated before anything is written, so either
   * all purchase movements are recorded or none are. Confirming the same draft twice is a
   * no-op, and a different draft with the same supplier + invoice number is refused.
   */
  public confirmInvoice(businessId: string, userId: string, draftId: string, payload: InvoiceConfirmPayload) {
    const draft = this.invoices.get(draftId);
    if (!draft || draft.businessId !== businessId) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice draft not found.');
    if (draft.status === 'CONFIRMED') return { invoice: draft, alreadyConfirmed: true, movementsCreated: 0 };

    const supplierName = assertText(payload?.supplierName, 'Supplier name');
    const invoiceNumber = assertText(payload?.invoiceNumber, 'Invoice number', 60);
    const invoiceDate = assertText(payload?.invoiceDate, 'Invoice date', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) throw new AppError(400, 'VALIDATION_FAILED', 'Invoice date must be YYYY-MM-DD.');
    const totalAmountPaise = assertPaise(payload.totalAmountPaise, 'Invoice total');
    if (!Array.isArray(payload.items) || payload.items.length === 0) throw new AppError(400, 'VALIDATION_FAILED', 'Invoice needs at least one line.');

    const dup = this.findConfirmedInvoice(businessId, supplierName, invoiceNumber);
    if (dup) {
      throw new AppError(409, 'DUPLICATE_INVOICE', `Invoice ${invoiceNumber} from ${supplierName} was already imported on ${istDate(dup.confirmedAt!)}. Stock was not changed.`, { duplicateOf: dup.id });
    }

    // Validate every line first.
    const newSkus = new Set<string>();
    const plan = payload.items.map((line, i) => {
      const label = `Line ${i + 1}`;
      const unitPricePaise = assertPaise(line.unitPricePaise, `${label} unit price`);
      if (line.matchedProductId) {
        const product = this.getOwnedProduct(businessId, line.matchedProductId);
        if (product.isArchived) throw new AppError(400, 'PRODUCT_ARCHIVED', `${label}: "${product.name}" is archived. Restore it or map the line elsewhere.`);
        assertQuantity(line.quantity, product.unit, `${label} quantity`);
        return { line, product, unitPricePaise, create: null as Partial<Product> | null };
      }
      const np = line.newProduct;
      if (!np) throw new AppError(400, 'VALIDATION_FAILED', `${label}: choose an existing product or create a new one.`);
      const unit = assertUnit(np.unit);
      assertQuantity(line.quantity, unit, `${label} quantity`);
      const prefix = (np.category || 'GEN').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'GEN';
      const taken = (s: string) => newSkus.has(s) || [...this.products.values()].some((p) => p.businessId === businessId && p.sku === s);
      let sku: string;
      do sku = `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      while (taken(sku));
      newSkus.add(sku);
      return {
        line,
        product: null as Product | null,
        unitPricePaise,
        create: {
          name: assertText(np.name, `${label} product name`),
          sku,
          category: np.category?.trim() || 'General',
          unit,
          costPricePaise: unitPricePaise,
          sellingPricePaise: assertPaise(np.sellingPricePaise, `${label} selling price`),
          reorderLevel: 10,
          leadTimeDays: 3,
          packSize: 1,
        },
      };
    });

    // Everything is valid — now write.
    const timestamp = new Date().toISOString();
    const confirmedItems: InvoiceLineItem[] = plan.map((p, i) => {
      const product = p.product ?? this.createProductUnchecked(businessId, userId, p.create!);
      this.pushMovement(businessId, userId, product, 'PURCHASE', p.line.quantity, `Invoice ${invoiceNumber} (${supplierName})`, { referenceId: draft.id, unitCostPaise: p.unitPricePaise }, timestamp);
      return {
        ...(draft.items[i] || { id: `line_${i + 1}`, confidence: 1, matchType: 'EXACT', uncertainFields: [] }),
        rawProductName: p.line.rawProductName,
        matchedProductId: product.id,
        matchedProductName: product.name,
        isNewProduct: !p.product,
        quantity: p.line.quantity,
        unitPricePaise: p.unitPricePaise,
        lineTotalPaise: Math.round(p.line.quantity * p.unitPricePaise),
      } as InvoiceLineItem;
    });

    const confirmed: Invoice = {
      ...draft,
      supplierName,
      invoiceNumber,
      invoiceDate,
      totalAmountPaise,
      items: confirmedItems,
      status: 'CONFIRMED',
      confirmedAt: timestamp,
      confirmedByUserId: userId,
    };
    this.invoices.set(draft.id, confirmed);
    this.logAudit({
      businessId,
      userId,
      action: 'INVOICE_CONFIRMED',
      entityType: 'INVOICE',
      entityId: draft.id,
      summary: `Confirmed invoice ${invoiceNumber} from ${supplierName}: ${plan.length} line(s), ₹${(totalAmountPaise / 100).toFixed(2)}`,
    });
    this.persist();
    return { invoice: confirmed, alreadyConfirmed: false, movementsCreated: plan.length };
  }

  public getInvoice(businessId: string, id: string) {
    const inv = this.invoices.get(id);
    if (!inv || inv.businessId !== businessId) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found.');
    return inv;
  }

  public getInvoices(businessId: string) {
    return [...this.invoices.values()]
      .filter((inv) => inv.businessId === businessId && inv.status === 'CONFIRMED')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- Settings, history & dashboard -----------------------------------------

  public updateSettings(businessId: string, userId: string, data: Record<string, unknown>) {
    const b = this.businesses.get(businessId)!;
    const targetCoverDays = assertInt(data.targetCoverDays, 'Target cover days', 0, 60);
    this.businesses.set(businessId, { ...b, targetCoverDays });
    this.logAudit({ businessId, userId, action: 'SETTINGS_UPDATED', entityType: 'SETTINGS', entityId: businessId, summary: `Target cover changed from ${b.targetCoverDays} to ${targetCoverDays} days` });
    this.persist();
    return this.businesses.get(businessId)!;
  }

  public getMovementHistory(businessId: string, limit = 100, productId?: string) {
    return this.movements
      .filter((m) => m.businessId === businessId && (!productId || m.productId === productId))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit)
      .map((m) => ({ ...m, productName: this.products.get(m.productId)?.name || 'Unknown', unit: this.products.get(m.productId)?.unit }));
  }

  public getAuditLog(businessId: string, limit = 100) {
    return this.audit.filter((a) => a.businessId === businessId).slice(-limit).reverse();
  }

  public getDashboardMetrics(businessId: string) {
    const products = this.listProducts(businessId);
    const today = istDate();
    let todaySalesPaise = 0;
    const todayBills = new Set<string>();
    for (const m of this.movements) {
      if (m.businessId !== businessId || istDate(m.timestamp) !== today) continue;
      if (m.movementType === 'SALE' || m.movementType === 'RETURN') {
        const price = m.unitPricePaise ?? this.products.get(m.productId)?.sellingPricePaise ?? 0;
        todaySalesPaise -= Math.round(m.quantity * price);
        if (m.movementType === 'SALE') todayBills.add(m.referenceId || m.id);
      }
    }
    return {
      totalProducts: products.length,
      lowStockCount: products.filter((p) => p.status === 'LOW_STOCK').length,
      outOfStockCount: products.filter((p) => p.status === 'OUT_OF_STOCK').length,
      totalStockValuePaise: products.reduce((s, p) => s + Math.round(Math.max(0, p.currentStock) * p.costPricePaise), 0),
      todaySalesPaise,
      todayOrdersCount: todayBills.size,
      reorderNeededCount: products.filter((p) => p.restockRecommendation.needsRestock).length,
    };
  }
}

const dataFile = process.env.DATA_FILE === 'memory' ? null : process.env.DATA_FILE || path.resolve('data', 'state.json');
export const ledgerEngine = new InventoryLedgerEngine(dataFile);
