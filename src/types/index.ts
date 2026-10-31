export type BusinessType = 'KIRANA' | 'PHARMACY' | 'GENERAL';
export type UserRole = 'OWNER' | 'STAFF';
export type UnitOfMeasure = 'pcs' | 'kg' | 'litre' | 'box';
export type MovementType = 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  type: BusinessType;
  currency: string;
  address: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  role: UserRole;
  businessId: string;
  businessName?: string;
  businessType?: BusinessType;
  avatarInitials: string;
}

export interface ProductStockSummary {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  costPricePaise: number;
  sellingPricePaise: number;
  reorderLevel: number;
  leadTimeDays: number;
  packSize: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  currentStock: number;
  totalPurchased: number;
  totalSold: number;
  totalAdjusted: number;
  salesVelocity: number;
  daysOfCover: number;
  predictedStockOutDate: string | null;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  restockRecommendation: {
    needsRestock: boolean;
    recommendedQuantity: number;
    targetDaysCover: number;
    packSize: number;
    explanation: string;
    hasEnoughHistory: boolean;
  };
}

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  movementType: MovementType;
  quantity: number;
  unitCostPaise?: number;
  unitPricePaise?: number;
  reason: string;
  referenceId?: string;
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
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  confidence: number;
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

export interface DashboardMetrics {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValuePaise: number;
  todaySalesPaise: number;
  todayOrdersCount: number;
  reorderNeededCount: number;
}
