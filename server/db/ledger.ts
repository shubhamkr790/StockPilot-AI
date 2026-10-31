import { 
  Business, 
  User, 
  Product, 
  InventoryMovement, 
  Invoice, 
  SaleTransaction, 
  ProductStockSummary,
  SaleItem
} from './schema.ts';
import { 
  INITIAL_BUSINESSES, 
  INITIAL_USERS, 
  INITIAL_PRODUCTS, 
  generateSeedMovements 
} from './seed.ts';

// In-Memory Mutex Lock for concurrency race-condition prevention
class KeyedMutex {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(key, lockPromise);

    return () => {
      this.locks.delete(key);
      resolveLock();
    };
  }
}

export class InventoryLedgerEngine {
  private businesses: Map<string, Business> = new Map();
  private users: Map<string, User> = new Map();
  private products: Map<string, Product> = new Map();
  private movements: InventoryMovement[] = [];
  private invoices: Map<string, Invoice> = new Map();
  private sales: Map<string, SaleTransaction> = new Map();
  private idempotencyCache: Map<string, SaleTransaction> = new Map();
  private mutex = new KeyedMutex();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults() {
    this.businesses.clear();
    this.users.clear();
    this.products.clear();
    this.movements = [];
    this.invoices.clear();
    this.sales.clear();
    this.idempotencyCache.clear();

    INITIAL_BUSINESSES.forEach((b) => this.businesses.set(b.id, { ...b }));
    INITIAL_USERS.forEach((u) => this.users.set(u.id, { ...u }));
    INITIAL_PRODUCTS.forEach((p) => this.products.set(p.id, { ...p }));
    this.movements = generateSeedMovements();
  }

  // --- Multi-Tenant & RBAC Verification Helpers ---
  public getBusiness(businessId: string): Business | undefined {
    return this.businesses.get(businessId);
  }

  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  public verifyTenantOwnership(businessId: string, productId: string): Product {
    const product = this.products.get(productId);
    if (!product || product.businessId !== businessId) {
      const error: any = new Error(`Access Denied: Product '${productId}' does not belong to business '${businessId}'.`);
      error.statusCode = 403;
      error.code = 'TENANT_ISOLATION_BREACH';
      throw error;
    }
    return product;
  }

  // --- Product Management (Owner Only) ---
  public listProducts(
    businessId: string, 
    filter?: { category?: string; query?: string; includeArchived?: boolean }
  ): ProductStockSummary[] {
    const list: ProductStockSummary[] = [];

    for (const prod of this.products.values()) {
      if (prod.businessId !== businessId) continue;
      if (!filter?.includeArchived && prod.isArchived) continue;

      if (filter?.category && filter.category !== 'ALL' && prod.category !== filter.category) {
        continue;
      }

      if (filter?.query) {
        const q = filter.query.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesSku = prod.sku.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) continue;
      }

      list.push(this.getProductSummary(businessId, prod.id));
    }

    return list;
  }

  public getProductSummary(businessId: string, productId: string): ProductStockSummary {
    const prod = this.verifyTenantOwnership(businessId, productId);
    
    // Calculate stock strictly by summing all historical movements
    let currentStock = 0;
    let totalPurchased = 0;
    let totalSold = 0;
    let totalAdjusted = 0;

    for (const m of this.movements) {
      if (m.businessId === businessId && m.productId === productId) {
        currentStock += m.quantity;
        if (m.movementType === 'PURCHASE') totalPurchased += m.quantity;
        if (m.movementType === 'SALE') totalSold += Math.abs(m.quantity);
        if (m.movementType === 'ADJUSTMENT') totalAdjusted += m.quantity;
      }
    }

    // Floating-point precision guard for fractional units (kg, litre)
    currentStock = Math.round(currentStock * 1000) / 1000;

    // Forecast Calculation
    const forecast = this.calculateForecast(businessId, productId, currentStock, prod);

    let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
    if (currentStock <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (currentStock <= prod.reorderLevel || forecast.daysOfCover <= prod.leadTimeDays) {
      status = 'LOW_STOCK';
    }

    return {
      ...prod,
      currentStock,
      totalPurchased,
      totalSold,
      totalAdjusted,
      salesVelocity: forecast.salesVelocity,
      daysOfCover: forecast.daysOfCover,
      predictedStockOutDate: forecast.predictedStockOutDate,
      status,
      restockRecommendation: {
        needsRestock: status !== 'IN_STOCK' || forecast.daysOfCover <= prod.leadTimeDays,
        recommendedQuantity: forecast.recommendedQuantity,
        targetDaysCover: forecast.targetDaysCover,
        packSize: prod.packSize,
        explanation: forecast.explanation,
        hasEnoughHistory: forecast.hasEnoughHistory,
      },
    };
  }

  public addProduct(
    businessId: string,
    userId: string,
    data: Omit<Product, 'id' | 'businessId' | 'isArchived' | 'createdAt' | 'updatedAt'>,
    initialQuantity: number = 0
  ): ProductStockSummary {
    // Check SKU uniqueness per business
    for (const p of this.products.values()) {
      if (p.businessId === businessId && p.sku.toLowerCase() === data.sku.toLowerCase()) {
        const error: any = new Error(`SKU '${data.sku}' already exists for this business.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const product: Product = {
      ...data,
      id,
      businessId,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(id, product);

    if (initialQuantity > 0) {
      const user = this.users.get(userId);
      this.movements.push({
        id: `mvt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        productId: id,
        movementType: 'ADJUSTMENT',
        quantity: initialQuantity,
        unitCostPaise: data.costPricePaise,
        unitPricePaise: data.sellingPricePaise,
        reason: 'Initial Opening Inventory',
        createdByUserId: userId,
        createdByName: user?.name || 'Owner',
        timestamp: now,
      });
    }

    return this.getProductSummary(businessId, id);
  }

  public updateProduct(
    businessId: string,
    productId: string,
    updates: Partial<Omit<Product, 'id' | 'businessId' | 'createdAt' | 'isArchived'>>
  ): ProductStockSummary {
    const product = this.verifyTenantOwnership(businessId, productId);
    
    // Check SKU collision if SKU changed
    if (updates.sku && updates.sku.toLowerCase() !== product.sku.toLowerCase()) {
      for (const p of this.products.values()) {
        if (p.businessId === businessId && p.id !== productId && p.sku.toLowerCase() === updates.sku.toLowerCase()) {
          const error: any = new Error(`SKU '${updates.sku}' already in use.`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    const updated: Product = {
      ...product,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.products.set(productId, updated);

    return this.getProductSummary(businessId, productId);
  }

  public archiveProduct(businessId: string, productId: string): boolean {
    const product = this.verifyTenantOwnership(businessId, productId);
    product.isArchived = true;
    product.updatedAt = new Date().toISOString();
    this.products.set(productId, product);
    return true;
  }

  // --- Manual Stock Adjustment (Owner Only with Mandatory Reason) ---
  public manualStockAdjustment(
    businessId: string,
    userId: string,
    productId: string,
    deltaQuantity: number,
    reason: string
  ): ProductStockSummary {
    if (!reason || reason.trim().length === 0) {
      const error: any = new Error("Manual adjustment requires a mandatory reason (e.g., 'damaged', 'expired', 'counting error').");
      error.statusCode = 400;
      throw error;
    }

    const product = this.verifyTenantOwnership(businessId, productId);
    const user = this.users.get(userId);
    const currentStock = this.getCurrentStock(businessId, productId);

    if (currentStock + deltaQuantity < 0) {
      const error: any = new Error(`Adjustment rejected: Stock cannot become negative. Current: ${currentStock}, adjustment: ${deltaQuantity}`);
      error.statusCode = 400;
      throw error;
    }

    this.movements.push({
      id: `mvt_adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      productId,
      movementType: 'ADJUSTMENT',
      quantity: deltaQuantity,
      unitCostPaise: product.costPricePaise,
      unitPricePaise: product.sellingPricePaise,
      reason: `Manual Adjustment: ${reason.trim()}`,
      createdByUserId: userId,
      createdByName: user?.name || 'Owner',
      timestamp: new Date().toISOString(),
    });

    return this.getProductSummary(businessId, productId);
  }

  // --- Current Stock Calculation (Ledger Sum) ---
  public getCurrentStock(businessId: string, productId: string): number {
    let stock = 0;
    for (const m of this.movements) {
      if (m.businessId === businessId && m.productId === productId) {
        stock += m.quantity;
      }
    }
    return Math.round(stock * 1000) / 1000;
  }

  // --- Fast POS & Atomic Sales Execution (With Concurrency Lock & Idempotency) ---
  public async recordSale(
    businessId: string,
    userId: string,
    items: SaleItem[],
    idempotencyKey?: string
  ): Promise<SaleTransaction> {
    // 1. Idempotency Check
    if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
      return this.idempotencyCache.get(idempotencyKey)!;
    }

    if (!items || items.length === 0) {
      const error: any = new Error('Sale must include at least one item.');
      error.statusCode = 400;
      throw error;
    }

    const user = this.users.get(userId);
    const releaseLocks: (() => void)[] = [];

    try {
      // 2. Concurrency Lock: acquire locks in sorted order of productId to prevent deadlocks
      const sortedProductIds = Array.from(new Set(items.map((i) => i.productId))).sort();
      for (const pId of sortedProductIds) {
        const release = await this.mutex.acquire(`${businessId}:${pId}`);
        releaseLocks.push(release);
      }

      // 3. Pre-Commit Verification under Lock: Check stock availability for all items
      const validatedItems: {
        product: Product;
        quantity: number;
        lineTotalPaise: number;
      }[] = [];
      let totalAmountPaise = 0;

      for (const item of items) {
        const product = this.verifyTenantOwnership(businessId, item.productId);

        // Validate continuous vs discrete unit quantities
        if (product.unit === 'pcs' || product.unit === 'box') {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            const error: any = new Error(`Product '${product.name}' has unit '${product.unit}' and requires integer quantity.`);
            error.statusCode = 400;
            throw error;
          }
        } else {
          if (item.quantity <= 0) {
            const error: any = new Error(`Quantity for '${product.name}' must be greater than zero.`);
            error.statusCode = 400;
            throw error;
          }
        }

        const availableStock = this.getCurrentStock(businessId, product.id);
        if (availableStock < item.quantity) {
          const error: any = new Error(
            `Insufficient stock for '${product.name}'. Requested: ${item.quantity} ${product.unit}, Available: ${availableStock} ${product.unit}.`
          );
          error.statusCode = 409; // Conflict
          error.code = 'INSUFFICIENT_STOCK';
          error.details = {
            productId: product.id,
            productName: product.name,
            requested: item.quantity,
            available: availableStock,
          };
          throw error;
        }

        const lineTotalPaise = Math.round(item.quantity * product.sellingPricePaise);
        totalAmountPaise += lineTotalPaise;
        validatedItems.push({
          product,
          quantity: item.quantity,
          lineTotalPaise,
        });
      }

      // 4. Commit: Atomic insertion of transaction and ledger movements
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const receiptNumber = `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();

      const transactionItems = validatedItems.map((vi) => ({
        productId: vi.product.id,
        productName: vi.product.name,
        sku: vi.product.sku,
        unit: vi.product.unit,
        quantity: vi.quantity,
        unitPricePaise: vi.product.sellingPricePaise,
        lineTotalPaise: vi.lineTotalPaise,
      }));

      // Post Double-Entry Ledger Movement for each item (Negative quantity = OUT)
      for (const vi of validatedItems) {
        this.movements.push({
          id: `mvt_sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          businessId,
          productId: vi.product.id,
          movementType: 'SALE',
          quantity: -vi.quantity, // Negative for sale
          unitCostPaise: vi.product.costPricePaise,
          unitPricePaise: vi.product.sellingPricePaise,
          reason: `Counter Sale Receipt #${receiptNumber}`,
          referenceId: saleId,
          createdByUserId: userId,
          createdByName: user?.name || 'Staff',
          timestamp,
        });
      }

      const saleTransaction: SaleTransaction = {
        id: saleId,
        businessId,
        receiptNumber,
        items: transactionItems,
        totalAmountPaise,
        createdByUserId: userId,
        createdByName: user?.name || 'Staff',
        timestamp,
        idempotencyKey,
      };

      this.sales.set(saleId, saleTransaction);
      if (idempotencyKey) {
        this.idempotencyCache.set(idempotencyKey, saleTransaction);
      }

      return saleTransaction;
    } finally {
      // Always release all acquired concurrency locks in reverse order
      while (releaseLocks.length > 0) {
        const release = releaseLocks.pop();
        if (release) release();
      }
    }
  }

  // --- OCR Invoice Pipeline & Atomic Import ---
  public checkDuplicateInvoice(businessId: string, supplierName: string, invoiceNumber: string): Invoice | undefined {
    for (const inv of this.invoices.values()) {
      if (
        inv.businessId === businessId &&
        inv.supplierName.trim().toLowerCase() === supplierName.trim().toLowerCase() &&
        inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.trim().toLowerCase()
      ) {
        return inv;
      }
    }
    return undefined;
  }

  public saveDraftInvoice(invoice: Invoice): Invoice {
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  public confirmInvoice(
    businessId: string,
    userId: string,
    invoiceData: Invoice
  ): { invoice: Invoice; createdMovementsCount: number } {
    // 1. Verify user is OWNER (Staff cannot approve invoices!)
    const user = this.users.get(userId);
    if (!user || user.role !== 'OWNER') {
      const error: any = new Error('Unauthorized: Only business owners can approve and confirm purchase invoices.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Duplicate Check
    const existing = this.checkDuplicateInvoice(businessId, invoiceData.supplierName, invoiceData.invoiceNumber);
    if (existing && existing.status === 'CONFIRMED' && existing.id !== invoiceData.id) {
      const error: any = new Error(
        `Duplicate Invoice Warning: Invoice #${invoiceData.invoiceNumber} from '${invoiceData.supplierName}' was already confirmed on ${new Date(existing.confirmedAt || '').toLocaleDateString()}. Confirming again would double inventory.`
      );
      error.statusCode = 400;
      error.code = 'DUPLICATE_INVOICE';
      throw error;
    }

    const timestamp = new Date().toISOString();
    let movementsCreated = 0;

    // 3. Process line items in an atomic batch
    for (const item of invoiceData.items) {
      let productId = item.matchedProductId;

      // Create new product if designated
      if (item.isNewProduct || !productId) {
        const newProduct = this.addProduct(
          businessId,
          userId,
          {
            sku: `INV-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
            name: item.rawProductName,
            category: 'Inbound OCR Products',
            unit: 'pcs',
            costPricePaise: item.unitPricePaise,
            sellingPricePaise: Math.round(item.unitPricePaise * 1.25), // 25% default markup
            reorderLevel: 10,
            leadTimeDays: 3,
            packSize: 1,
          },
          0
        );
        productId = newProduct.id;
        item.matchedProductId = productId;
      }

      // Add Purchase Movement to Ledger
      this.movements.push({
        id: `mvt_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        productId,
        movementType: 'PURCHASE',
        quantity: item.quantity,
        unitCostPaise: item.unitPricePaise,
        reason: `Purchase Invoice #${invoiceData.invoiceNumber} (${invoiceData.supplierName})`,
        referenceId: invoiceData.id,
        createdByUserId: userId,
        createdByName: user.name,
        timestamp,
      });

      movementsCreated++;
    }

    const confirmedInvoice: Invoice = {
      ...invoiceData,
      status: 'CONFIRMED',
      confirmedAt: timestamp,
    };
    this.invoices.set(invoiceData.id, confirmedInvoice);

    return {
      invoice: confirmedInvoice,
      createdMovementsCount: movementsCreated,
    };
  }

  // --- Explainable Predictive Forecasting Model ---
  private calculateForecast(
    businessId: string,
    productId: string,
    currentStock: number,
    product: Product,
    windowDays: number = 14
  ) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    let unitsSoldInWindow = 0;
    let earliestSaleDate: Date | null = null;

    for (const m of this.movements) {
      if (m.businessId === businessId && m.productId === productId && m.movementType === 'SALE') {
        const mDate = new Date(m.timestamp);
        if (!earliestSaleDate || mDate < earliestSaleDate) {
          earliestSaleDate = mDate;
        }
        if (mDate >= windowStart) {
          unitsSoldInWindow += Math.abs(m.quantity);
        }
      }
    }

    // Cold start rule: Check if product has at least 7 days of sales history
    const daysSinceFirstSale = earliestSaleDate 
      ? Math.max(1, Math.round((now.getTime() - earliestSaleDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const hasEnoughHistory = daysSinceFirstSale >= 7;

    // Sales velocity in units per day
    const salesVelocity = Math.round((unitsSoldInWindow / windowDays) * 10) / 10;

    // Days of Cover
    let daysOfCover = 999;
    let predictedStockOutDate: string | null = null;

    if (salesVelocity > 0) {
      daysOfCover = Math.round((currentStock / salesVelocity) * 10) / 10;
      const stockOutDays = Math.ceil(currentStock / salesVelocity);
      const stockOutDateObj = new Date(now.getTime() + stockOutDays * 24 * 60 * 60 * 1000);
      predictedStockOutDate = stockOutDateObj.toISOString().slice(0, 10);
    }

    // Replenishment Calculation
    const targetBufferDays = 4; // Safety stock buffer
    const targetDaysCover = product.leadTimeDays + targetBufferDays;
    const targetInventory = salesVelocity * targetDaysCover;
    const rawDeficit = Math.max(0, targetInventory - currentStock);

    // Round up to supplier pack size (e.g. carton of 24)
    const packSize = product.packSize || 1;
    const packsNeeded = Math.ceil(rawDeficit / packSize);
    const recommendedQuantity = packsNeeded * packSize;

    // Construct plain-English explainable math string
    let explanation = '';
    if (!hasEnoughHistory) {
      explanation = `Not enough history (requires ≥ 7 days of sales, only ${daysSinceFirstSale} days recorded).`;
    } else if (salesVelocity === 0) {
      explanation = `Zero sales recorded in the last ${windowDays} days. Current stock (${currentStock} ${product.unit}) is sufficient.`;
    } else {
      const cartonsText = packSize > 1 ? ` (${packsNeeded} carton${packsNeeded > 1 ? 's' : ''} of ${packSize})` : '';
      explanation = `Sells ${salesVelocity}/day, ${currentStock} left, ${product.leadTimeDays}-day lead time + ${targetBufferDays}-day buffer → order ${recommendedQuantity}${cartonsText}`;
    }

    return {
      salesVelocity,
      daysOfCover,
      predictedStockOutDate,
      targetDaysCover,
      recommendedQuantity,
      explanation,
      hasEnoughHistory,
    };
  }

  // --- Audit & Ledger History Log ---
  public getMovementHistory(businessId: string, limit: number = 50): InventoryMovement[] {
    return this.movements
      .filter((m) => m.businessId === businessId)
      .slice(-limit)
      .reverse();
  }

  public getInvoices(businessId: string): Invoice[] {
    return Array.from(this.invoices.values())
      .filter((inv) => inv.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSalesHistory(businessId: string, limit: number = 50): SaleTransaction[] {
    return Array.from(this.sales.values())
      .filter((s) => s.businessId === businessId)
      .slice(-limit)
      .reverse();
  }

  public getDashboardMetrics(businessId: string) {
    const products = this.listProducts(businessId);
    let totalStockValuePaise = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalStockValuePaise += Math.round(p.currentStock * p.costPricePaise);
      if (p.status === 'OUT_OF_STOCK') outOfStockCount++;
      if (p.status === 'LOW_STOCK') lowStockCount++;
    }

    // Today's Sales
    const todayStr = new Date().toISOString().slice(0, 10);
    let todaySalesPaise = 0;
    let todayOrdersCount = 0;

    for (const s of this.sales.values()) {
      if (s.businessId === businessId && s.timestamp.startsWith(todayStr)) {
        todaySalesPaise += s.totalAmountPaise;
        todayOrdersCount++;
      }
    }

    return {
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      totalStockValuePaise,
      todaySalesPaise,
      todayOrdersCount,
      reorderNeededCount: products.filter((p) => p.restockRecommendation.needsRestock).length,
    };
  }
}

// Global Singleton Instance
export const ledgerEngine = new InventoryLedgerEngine();
