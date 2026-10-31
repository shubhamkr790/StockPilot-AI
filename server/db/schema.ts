export type BusinessType = 'KIRANA' | 'PHARMACY' | 'GENERAL';
export type UserRole = 'OWNER' | 'STAFF';
export type UnitOfMeasure = 'pcs' | 'kg' | 'litre' | 'box';
export type MovementType = 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
export type AdjustmentReason = 'damaged' | 'expired' | 'counting error' | 'initial_stock' | 'reconciliation';

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  type: BusinessType;
  currency: string;
  address: string;
  targetCoverDays: number;     // Days of stock to hold beyond supplier lead time
}

export interface User {
  id: string;
  businessId: string;
  username: string;
  name: string;
  role: UserRole;
  pin: string;
}

export interface Product {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  costPricePaise: number;      // Stored in paise (integer)
  sellingPricePaise: number;   // Stored in paise (integer)
  reorderLevel: number;        // Threshold for low stock warning
  leadTimeDays: number;        // Supplier delivery time in days
  packSize: number;            // Wholesaler carton/pack size (e.g. 12, 24)
  isArchived: boolean;         // Soft delete: products with history are archived
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  movementType: MovementType;
  quantity: number;            // Signed: positive for in, negative for out
  unitCostPaise?: number;
  unitPricePaise?: number;
  reason: string;              // Mandatory explanation (e.g. "Invoice #INV-92", "POS Sale #S-102", "damaged")
  referenceId?: string;        // Invoice ID, Receipt ID, etc.
  createdByUserId: string;
  createdByName: string;
  timestamp: string;
}

export interface InvoiceLineItem {
  id: string;
  rawProductName: string;
  matchedProductId?: string;
  matchedProductName?: string;
  isNewProduct: boolean;
  newProductUnit?: UnitOfMeasure;
  quantity: number;
  unitPricePaise: number;      // Cost per unit in paise
  lineTotalPaise: number;      // Qty * UnitPrice
  confidence: number;          // 0.0 to 1.0 match confidence
  matchType: 'SKU' | 'EXACT' | 'FUZZY' | 'NEW';
  uncertainFields: string[];   // Fields the OCR engine was unsure about
  isArithmeticMismatch?: boolean;
}

export interface Invoice {
  id: string;
  businessId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmountPaise: number;
  status: 'DRAFT' | 'CONFIRMED';
  items: InvoiceLineItem[];
  createdByUserId: string;
  createdAt: string;
  confirmedAt?: string;
  confirmedByUserId?: string;
  uncertainFields: string[];
  source: 'OCR' | 'MANUAL' | 'SAMPLE';
  fileName?: string;
}

export interface HistoricalSale {
  businessId: string;
  productId: string;
  date: string;                // YYYY-MM-DD (IST)
  quantity: number;
}

export interface AuditLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  action: string;              // e.g. PRODUCT_CREATED, SALE_RECORDED, INVOICE_CONFIRMED
  entityType: 'PRODUCT' | 'SALE' | 'INVOICE' | 'ADJUSTMENT' | 'SETTINGS' | 'IMPORT' | 'AUTH';
  entityId: string;
  summary: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
}

export interface SaleTransaction {
  id: string;
  businessId: string;
  receiptNumber: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    unit: UnitOfMeasure;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }[];
  totalAmountPaise: number;
  createdByUserId: string;
  createdByName: string;
  timestamp: string;
  idempotencyKey?: string;
}

export interface ProductStockSummary extends Product {
  currentStock: number;
  totalPurchased: number;
  totalSold: number;
  totalAdjusted: number;
  salesVelocity: number;       // Average units sold per day
  daysOfCover: number | null;  // Current stock / velocity (null if no sales)
  predictedStockOutDate: string | null;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  restockRecommendation: {
    needsRestock: boolean;
    recommendedQuantity: number | null;
    targetDaysCover: number;
    packSize: number;
    explanation: string;
    calculation: string | null;
    hasEnoughHistory: boolean;
    historyDays: number;
    alertReason: string | null;
  };
}
