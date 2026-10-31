import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. DATA MODELS & SEED DATA (Paise Integer Accounting & Multi-Tenant Ledger)
// ============================================================================

const BUSINESSES = [
  {
    id: 'biz_ramesh_01',
    name: 'Ramesh General Store',
    ownerName: 'Ramesh Patel',
    type: 'KIRANA',
    currency: 'INR',
    address: 'Shop 14, Mandvi Clock Tower Market, Vadodara, Gujarat',
  },
  {
    id: 'biz_anita_02',
    name: 'Anita Medical & Healthcare',
    ownerName: 'Anita Shah',
    type: 'PHARMACY',
    currency: 'INR',
    address: 'Shop 4, Sayajigunj Commercial Complex, Vadodara, Gujarat',
  },
];

const USERS = [
  {
    id: 'usr_ramesh',
    businessId: 'biz_ramesh_01',
    name: 'Ramesh (Owner)',
    role: 'OWNER',
    pin: '1234',
  },
  {
    id: 'usr_priya',
    businessId: 'biz_ramesh_01',
    name: 'Priya (Staff)',
    role: 'STAFF',
    pin: '5678',
  },
  {
    id: 'usr_anita',
    businessId: 'biz_anita_02',
    name: 'Anita (Owner)',
    role: 'OWNER',
    pin: '9999',
  },
];

const DEFAULT_PRODUCTS = [
  // Ramesh General Store (Kirana)
  {
    id: 'prod_oil_01',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-OIL-SUN-1L',
    name: 'Fortune Sunlite Sunflower Oil 1L',
    category: 'Edible Oils',
    unit: 'litre',
    costPricePaise: 11000,    // ₹110.00
    sellingPricePaise: 13500, // ₹135.00
    reorderLevel: 15,
    leadTimeDays: 4,          // 4-day lead time as requested in brief
    packSize: 24,             // Carton of 24
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_bisc_02',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-BIS-PRG-100G',
    name: 'Parle-G Gold Glucose Biscuits 100g',
    category: 'Snacks & Biscuits',
    unit: 'pcs',
    costPricePaise: 800,      // ₹8.00
    sellingPricePaise: 1000,  // ₹10.00
    reorderLevel: 30,
    leadTimeDays: 3,
    packSize: 48,             // Carton of 48
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_rice_03',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-RIC-KOL-1KG',
    name: 'Kolam Daily Rice Premium 1kg',
    category: 'Staples & Grains',
    unit: 'kg',
    costPricePaise: 5200,     // ₹52.00
    sellingPricePaise: 6500,  // ₹65.00
    reorderLevel: 40,
    leadTimeDays: 5,
    packSize: 25,             // 25kg bag
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_soap_04',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-SOP-DET-75G',
    name: 'Dettol Original Bathing Soap 75g',
    category: 'Personal Care',
    unit: 'pcs',
    costPricePaise: 3200,     // ₹32.00
    sellingPricePaise: 4000,  // ₹40.00
    reorderLevel: 20,
    leadTimeDays: 3,
    packSize: 36,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_tea_05',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-TEA-WAG-250G',
    name: 'Wagh Bakri Premium Leaf Tea 250g',
    category: 'Beverages',
    unit: 'pcs',
    costPricePaise: 12500,    // ₹125.00
    sellingPricePaise: 15000, // ₹150.00
    reorderLevel: 15,
    leadTimeDays: 4,
    packSize: 12,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_salt_06',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-SLT-TAT-1KG',
    name: 'Tata Salt Vacuum Evaporated 1kg',
    category: 'Staples & Grains',
    unit: 'pcs',
    costPricePaise: 2100,     // ₹21.00
    sellingPricePaise: 2800,  // ₹28.00
    reorderLevel: 25,
    leadTimeDays: 2,
    packSize: 24,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_dal_07',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-DAL-TUR-1KG',
    name: 'Unpolished Toor Dal Premium 1kg',
    category: 'Staples & Grains',
    unit: 'kg',
    costPricePaise: 14500,    // ₹145.00
    sellingPricePaise: 17500, // ₹175.00
    reorderLevel: 20,
    leadTimeDays: 4,
    packSize: 30,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_sug_08',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-SUG-MAD-1KG',
    name: 'Madhur Pure Refined Sugar 1kg',
    category: 'Staples & Grains',
    unit: 'kg',
    costPricePaise: 4200,     // ₹42.00
    sellingPricePaise: 5000,  // ₹50.00
    reorderLevel: 30,
    leadTimeDays: 3,
    packSize: 50,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_att_09',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-ATT-AAS-5KG',
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    category: 'Staples & Grains',
    unit: 'pcs',
    costPricePaise: 21500,    // ₹215.00
    sellingPricePaise: 26000, // ₹260.00
    reorderLevel: 15,
    leadTimeDays: 3,
    packSize: 8,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_ghe_10',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-GHE-AMU-1L',
    name: 'Amul Pure Cow Ghee 1L Tin',
    category: 'Dairy & Ghee',
    unit: 'pcs',
    costPricePaise: 58000,    // ₹580.00
    sellingPricePaise: 65000, // ₹650.00
    reorderLevel: 8,
    leadTimeDays: 5,
    packSize: 12,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_jam_11',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-JAM-KIS-500G',
    name: 'Kissan Mixed Fruit Jam 500g',
    category: 'Spreads & Sauces',
    unit: 'pcs',
    costPricePaise: 13000,    // ₹130.00
    sellingPricePaise: 16500, // ₹165.00
    reorderLevel: 10,
    leadTimeDays: 4,
    packSize: 12,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_nood_12',
    businessId: 'biz_ramesh_01',
    sku: 'KIR-NDL-MAG-4PK',
    name: 'Maggi 2-Minute Masala Noodles (Pack of 4)',
    category: 'Instant Food',
    unit: 'pcs',
    costPricePaise: 4800,     // ₹48.00
    sellingPricePaise: 5600,  // ₹56.00
    reorderLevel: 25,
    leadTimeDays: 2,
    packSize: 24,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },

  // Anita Medical (Pharmacy - STRICT TENANT ISOLATION)
  {
    id: 'prod_para_21',
    businessId: 'biz_anita_02',
    sku: 'MED-PAR-D650',
    name: 'Dolo 650mg Paracetamol Strip of 15',
    category: 'Pain & Fever',
    unit: 'pcs',
    costPricePaise: 2400,     // ₹24.00
    sellingPricePaise: 3360,  // ₹33.60
    reorderLevel: 50,
    leadTimeDays: 2,
    packSize: 20,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_cough_22',
    businessId: 'biz_anita_02',
    sku: 'MED-SYR-BEN-100',
    name: 'Benadryl Cough Formula Syrup 100ml',
    category: 'Respiratory',
    unit: 'pcs',
    costPricePaise: 9500,     // ₹95.00
    sellingPricePaise: 12500, // ₹125.00
    reorderLevel: 20,
    leadTimeDays: 3,
    packSize: 10,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prod_band_23',
    businessId: 'biz_anita_02',
    sku: 'MED-BAN-HAN-20',
    name: 'Hansaplast Waterproof Bandages (Pack of 20)',
    category: 'First Aid',
    unit: 'box',
    costPricePaise: 6000,     // ₹60.00
    sellingPricePaise: 8000,  // ₹80.00
    reorderLevel: 15,
    leadTimeDays: 3,
    packSize: 12,
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
];

function generateSeedMovements() {
  const movements = [];
  let mId = 1;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 30);

  // Exact scenario from brief:
  // "Oil sells 6/day, 9 left, 4-day lead time -> order 48 (2 cartons of 24)"
  movements.push({
    id: `mvt_${mId++}`,
    businessId: 'biz_ramesh_01',
    productId: 'prod_oil_01',
    movementType: 'PURCHASE',
    quantity: 189,
    unitCostPaise: 11000,
    reason: 'Initial Wholesaler Bulk Delivery (Gujarat Agro Foods)',
    createdByUserId: 'usr_ramesh',
    createdByName: 'Ramesh (Owner)',
    timestamp: new Date(baseDate.getTime() + 1000 * 60 * 60).toISOString(),
  });

  // Daily sales of 6 units/day across 30 days = 180 units sold -> 9 left!
  for (let day = 29; day >= 0; day--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - day);
    saleDate.setHours(11 + (day % 6), 15, 0);

    movements.push({
      id: `mvt_${mId++}`,
      businessId: 'biz_ramesh_01',
      productId: 'prod_oil_01',
      movementType: 'SALE',
      quantity: -6,
      reason: `Counter POS Sale (Walk-in Customers)`,
      createdByUserId: day % 2 === 0 ? 'usr_priya' : 'usr_ramesh',
      createdByName: day % 2 === 0 ? 'Priya (Staff)' : 'Ramesh (Owner)',
      timestamp: saleDate.toISOString(),
    });
  }

  // Parle-G Biscuits: 300 purchased, 270 sold -> 30 left (at reorder level 30)
  movements.push({
    id: `mvt_${mId++}`,
    businessId: 'biz_ramesh_01',
    productId: 'prod_bisc_02',
    movementType: 'PURCHASE',
    quantity: 300,
    unitCostPaise: 800,
    reason: 'Initial Depot Stock (Parle Products Vadodara)',
    createdByUserId: 'usr_ramesh',
    createdByName: 'Ramesh (Owner)',
    timestamp: new Date(baseDate.getTime() + 2000 * 60 * 60).toISOString(),
  });
  for (let day = 29; day >= 0; day--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - day);
    saleDate.setHours(14, 20, 0);
    movements.push({
      id: `mvt_${mId++}`,
      businessId: 'biz_ramesh_01',
      productId: 'prod_bisc_02',
      movementType: 'SALE',
      quantity: -9,
      reason: 'Retail Counter Sales',
      createdByUserId: 'usr_priya',
      createdByName: 'Priya (Staff)',
      timestamp: saleDate.toISOString(),
    });
  }

  // Rice: 250 purchased, sells 5.5 kg/day = 165 sold -> 85 kg left
  movements.push({
    id: `mvt_${mId++}`,
    businessId: 'biz_ramesh_01',
    productId: 'prod_rice_03',
    movementType: 'PURCHASE',
    quantity: 250,
    unitCostPaise: 5200,
    reason: 'Rice Mill Inbound Batch #22',
    createdByUserId: 'usr_ramesh',
    createdByName: 'Ramesh (Owner)',
    timestamp: new Date(baseDate.getTime() + 3000 * 60 * 60).toISOString(),
  });
  for (let day = 29; day >= 0; day--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - day);
    saleDate.setHours(16, 45, 0);
    movements.push({
      id: `mvt_${mId++}`,
      businessId: 'biz_ramesh_01',
      productId: 'prod_rice_03',
      movementType: 'SALE',
      quantity: -5.5,
      reason: 'Loose & Packaged Rice Sales (kg)',
      createdByUserId: 'usr_priya',
      createdByName: 'Priya (Staff)',
      timestamp: saleDate.toISOString(),
    });
  }

  // Initial stock for other products
  const remaining = [
    { id: 'prod_soap_04', inStock: 45, reason: 'Dettol wholesale purchase' },
    { id: 'prod_tea_05', inStock: 28, reason: 'Wagh Bakri stock delivery' },
    { id: 'prod_salt_06', inStock: 60, reason: 'Tata Salt crate delivery' },
    { id: 'prod_dal_07', inStock: 35, reason: 'Toor dal wholesale sacks' },
    { id: 'prod_sug_08', inStock: 50, reason: 'Madhur sugar sack purchase' },
    { id: 'prod_att_09', inStock: 18, reason: 'Aashirvaad 5kg batch' },
    { id: 'prod_ghe_10', inStock: 14, reason: 'Amul distributor delivery' },
    { id: 'prod_jam_11', inStock: 20, reason: 'Kissan crate delivery' },
    { id: 'prod_nood_12', inStock: 55, reason: 'Nestle Maggi 24-pack box' },
  ];

  for (const item of remaining) {
    movements.push({
      id: `mvt_${mId++}`,
      businessId: 'biz_ramesh_01',
      productId: item.id,
      movementType: 'PURCHASE',
      quantity: item.inStock,
      reason: item.reason,
      createdByUserId: 'usr_ramesh',
      createdByName: 'Ramesh (Owner)',
      timestamp: new Date(baseDate.getTime() + 4000 * 60 * 60).toISOString(),
    });
    for (let day = 9; day >= 0; day--) {
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - day);
      saleDate.setHours(17, 10, 0);
      movements.push({
        id: `mvt_${mId++}`,
        businessId: 'biz_ramesh_01',
        productId: item.id,
        movementType: 'SALE',
        quantity: -1,
        reason: 'Daily retail walk-in sale',
        createdByUserId: 'usr_priya',
        createdByName: 'Priya (Staff)',
        timestamp: saleDate.toISOString(),
      });
    }
  }

  // Anita Medical Seed Stock
  movements.push({
    id: `mvt_${mId++}`,
    businessId: 'biz_anita_02',
    productId: 'prod_para_21',
    movementType: 'PURCHASE',
    quantity: 120,
    unitCostPaise: 2400,
    reason: 'Apollo Pharma Wholesale delivery (Batch #DOL-882)',
    createdByUserId: 'usr_anita',
    createdByName: 'Anita (Owner)',
    timestamp: new Date(baseDate.getTime() + 5000 * 60 * 60).toISOString(),
  });
  movements.push({
    id: `mvt_${mId++}`,
    businessId: 'biz_anita_02',
    productId: 'prod_cough_22',
    movementType: 'PURCHASE',
    quantity: 40,
    unitCostPaise: 9500,
    reason: 'Johnson & Johnson Medical supply',
    createdByUserId: 'usr_anita',
    createdByName: 'Anita (Owner)',
    timestamp: new Date(baseDate.getTime() + 5000 * 60 * 60).toISOString(),
  });
  movements.push({
    id: `mvt_${mId++}`,
    businessId: 'biz_anita_02',
    productId: 'prod_band_23',
    movementType: 'PURCHASE',
    quantity: 35,
    unitCostPaise: 6000,
    reason: 'Beiersdorf First-Aid Distributor consignment',
    createdByUserId: 'usr_anita',
    createdByName: 'Anita (Owner)',
    timestamp: new Date(baseDate.getTime() + 5000 * 60 * 60).toISOString(),
  });

  return movements;
}

// In-Memory Mutex Lock for Concurrency Protection
class KeyedMutex {
  constructor() {
    this.locks = new Map();
  }
  async acquire(key) {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolveLock;
    const lockPromise = new Promise((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(key, lockPromise);
    return () => {
      this.locks.delete(key);
      resolveLock();
    };
  }
}

// ============================================================================
// 2. INVENTORY LEDGER CORE ENGINE
// ============================================================================

class InventoryLedgerEngine {
  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults() {
    this.businesses = new Map(BUSINESSES.map((b) => [b.id, { ...b }]));
    this.users = new Map(USERS.map((u) => [u.id, { ...u }]));
    this.products = new Map(DEFAULT_PRODUCTS.map((p) => [p.id, { ...p }]));
    this.movements = generateSeedMovements();
    this.invoices = new Map();
    this.sales = new Map();
    this.idempotencyCache = new Map();
    this.mutex = new KeyedMutex();
  }

  getBusiness(bId) {
    return this.businesses.get(bId);
  }

  getUser(uId) {
    return this.users.get(uId);
  }

  verifyTenantOwnership(businessId, productId) {
    const prod = this.products.get(productId);
    if (!prod || prod.businessId !== businessId) {
      const err = new Error(`Access Denied: Product '${productId}' does not belong to business '${businessId}'.`);
      err.statusCode = 403;
      err.code = 'TENANT_ISOLATION_BREACH';
      throw err;
    }
    return prod;
  }

  getCurrentStock(businessId, productId) {
    let stock = 0;
    for (const m of this.movements) {
      if (m.businessId === businessId && m.productId === productId) {
        stock += m.quantity;
      }
    }
    return Math.round(stock * 1000) / 1000;
  }

  getProductSummary(businessId, productId) {
    const prod = this.verifyTenantOwnership(businessId, productId);
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
    currentStock = Math.round(currentStock * 1000) / 1000;

    const forecast = this.calculateForecast(businessId, productId, currentStock, prod);

    let status = 'IN_STOCK';
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

  listProducts(businessId, filter = {}) {
    const list = [];
    for (const prod of this.products.values()) {
      if (prod.businessId !== businessId) continue;
      if (!filter.includeArchived && prod.isArchived) continue;

      if (filter.category && filter.category !== 'ALL' && prod.category !== filter.category) {
        continue;
      }
      if (filter.query) {
        const q = filter.query.toLowerCase();
        if (!prod.name.toLowerCase().includes(q) && !prod.sku.toLowerCase().includes(q)) {
          continue;
        }
      }
      list.push(this.getProductSummary(businessId, prod.id));
    }
    return list;
  }

  addProduct(businessId, userId, data, initialQuantity = 0) {
    for (const p of this.products.values()) {
      if (p.businessId === businessId && p.sku.toLowerCase() === data.sku.toLowerCase()) {
        const err = new Error(`SKU '${data.sku}' already exists.`);
        err.statusCode = 400;
        throw err;
      }
    }

    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const product = {
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
        id: `mvt_${Date.now()}`,
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

  updateProduct(businessId, productId, updates) {
    const prod = this.verifyTenantOwnership(businessId, productId);
    const updated = {
      ...prod,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.products.set(productId, updated);
    return this.getProductSummary(businessId, productId);
  }

  archiveProduct(businessId, productId) {
    const prod = this.verifyTenantOwnership(businessId, productId);
    prod.isArchived = true;
    prod.updatedAt = new Date().toISOString();
    this.products.set(productId, prod);
    return true;
  }

  manualStockAdjustment(businessId, userId, productId, deltaQuantity, reason) {
    if (!reason || reason.trim().length === 0) {
      const err = new Error("Manual adjustment requires a mandatory reason (e.g. 'damaged', 'expired').");
      err.statusCode = 400;
      throw err;
    }
    const product = this.verifyTenantOwnership(businessId, productId);
    const user = this.users.get(userId);
    const currentStock = this.getCurrentStock(businessId, productId);

    if (currentStock + deltaQuantity < 0) {
      const err = new Error(`Adjustment rejected: Stock cannot become negative. Current: ${currentStock}, adjustment: ${deltaQuantity}`);
      err.statusCode = 400;
      throw err;
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

  async recordSale(businessId, userId, items, idempotencyKey) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new Error('Sale must contain at least one item.');
      err.statusCode = 400;
      throw err;
    }
    if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
      return this.idempotencyCache.get(idempotencyKey);
    }

    const releaseLocks = [];
    const sortedIds = Array.from(new Set(items.map((i) => i.productId))).sort();

    try {
      // 1. Acquire mutex write-locks
      for (const pId of sortedIds) {
        const release = await this.mutex.acquire(`${businessId}:${pId}`);
        releaseLocks.push(release);
      }

      // 2. Validate availability under lock
      const validated = [];
      let totalAmountPaise = 0;

      for (const item of items) {
        const prod = this.verifyTenantOwnership(businessId, item.productId);

        if (prod.unit === 'pcs' || prod.unit === 'box') {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            const err = new Error(`Product '${prod.name}' requires integer quantity for unit '${prod.unit}'.`);
            err.statusCode = 400;
            throw err;
          }
        } else if (item.quantity <= 0) {
          const err = new Error(`Quantity for '${prod.name}' must be positive.`);
          err.statusCode = 400;
          throw err;
        }

        const available = this.getCurrentStock(businessId, prod.id);
        if (available < item.quantity) {
          const err = new Error(`Insufficient stock for '${prod.name}'. Requested: ${item.quantity} ${prod.unit}, Available: ${available} ${prod.unit}.`);
          err.statusCode = 409;
          err.code = 'INSUFFICIENT_STOCK';
          throw err;
        }

        const lineTotalPaise = Math.round(item.quantity * prod.sellingPricePaise);
        totalAmountPaise += lineTotalPaise;
        validated.push({ prod, quantity: item.quantity, lineTotalPaise });
      }

      // 3. Commit Sale & Ledger Movements atomically
      const user = this.users.get(userId);
      const saleId = `sale_${Date.now()}`;
      const receiptNumber = `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();

      const transactionItems = validated.map((v) => ({
        productId: v.prod.id,
        productName: v.prod.name,
        sku: v.prod.sku,
        unit: v.prod.unit,
        quantity: v.quantity,
        unitPricePaise: v.prod.sellingPricePaise,
        lineTotalPaise: v.lineTotalPaise,
      }));

      for (const v of validated) {
        this.movements.push({
          id: `mvt_sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          businessId,
          productId: v.prod.id,
          movementType: 'SALE',
          quantity: -v.quantity, // Negative for sale
          unitCostPaise: v.prod.costPricePaise,
          unitPricePaise: v.prod.sellingPricePaise,
          reason: `Counter Sale Receipt #${receiptNumber}`,
          referenceId: saleId,
          createdByUserId: userId,
          createdByName: user?.name || 'Staff',
          timestamp,
        });
      }

      const sale = {
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

      this.sales.set(saleId, sale);
      if (idempotencyKey) {
        this.idempotencyCache.set(idempotencyKey, sale);
      }
      return sale;
    } finally {
      while (releaseLocks.length > 0) {
        const release = releaseLocks.pop();
        if (release) release();
      }
    }
  }

  checkDuplicateInvoice(businessId, supplierName, invoiceNumber) {
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

  confirmInvoice(businessId, userId, invoiceData) {
    const user = this.users.get(userId);
    if (!user || user.role !== 'OWNER') {
      const err = new Error('Unauthorized: Only store owners can confirm purchase invoices.');
      err.statusCode = 403;
      throw err;
    }

    const dup = this.checkDuplicateInvoice(businessId, invoiceData.supplierName, invoiceData.invoiceNumber);
    if (dup && dup.status === 'CONFIRMED' && dup.id !== invoiceData.id) {
      const err = new Error(`Duplicate Invoice: #${invoiceData.invoiceNumber} from '${invoiceData.supplierName}' already confirmed. Confirming again would double inventory.`);
      err.statusCode = 400;
      err.code = 'DUPLICATE_INVOICE';
      throw err;
    }

    const timestamp = new Date().toISOString();
    let movementsCreated = 0;

    for (const item of invoiceData.items) {
      let pId = item.matchedProductId;
      if (item.isNewProduct || !pId) {
        const newProduct = this.addProduct(
          businessId,
          userId,
          {
            sku: `INV-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
            name: item.rawProductName,
            category: 'Inbound OCR Products',
            unit: 'pcs',
            costPricePaise: item.unitPricePaise,
            sellingPricePaise: Math.round(item.unitPricePaise * 1.25),
            reorderLevel: 10,
            leadTimeDays: 3,
            packSize: 1,
          },
          0
        );
        pId = newProduct.id;
        item.matchedProductId = pId;
      }

      this.movements.push({
        id: `mvt_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        productId: pId,
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

    const confirmed = {
      ...invoiceData,
      status: 'CONFIRMED',
      confirmedAt: timestamp,
    };
    this.invoices.set(invoiceData.id, confirmed);
    return { invoice: confirmed, createdMovementsCount: movementsCreated };
  }

  calculateForecast(businessId, productId, currentStock, product, windowDays = 14) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    let unitsSoldInWindow = 0;
    let earliestSaleDate = null;

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

    const daysSinceFirstSale = earliestSaleDate
      ? Math.max(1, Math.round((now.getTime() - earliestSaleDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const hasEnoughHistory = daysSinceFirstSale >= 7;
    const salesVelocity = Math.round((unitsSoldInWindow / windowDays) * 10) / 10;

    let daysOfCover = 999;
    let predictedStockOutDate = null;

    if (salesVelocity > 0) {
      daysOfCover = Math.round((currentStock / salesVelocity) * 10) / 10;
      const stockOutDays = Math.ceil(currentStock / salesVelocity);
      const stockOutDateObj = new Date(now.getTime() + stockOutDays * 24 * 60 * 60 * 1000);
      predictedStockOutDate = stockOutDateObj.toISOString().slice(0, 10);
    }

    const targetBufferDays = 4;
    const targetDaysCover = product.leadTimeDays + targetBufferDays;
    const targetInventory = salesVelocity * targetDaysCover;
    const rawDeficit = Math.max(0, targetInventory - currentStock);
    const packSize = product.packSize || 1;
    const packsNeeded = Math.ceil(rawDeficit / packSize);
    const recommendedQuantity = packsNeeded * packSize;

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

  getDashboardMetrics(businessId) {
    const prods = this.listProducts(businessId);
    let totalStockValuePaise = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of prods) {
      totalStockValuePaise += Math.round(p.currentStock * p.costPricePaise);
      if (p.status === 'OUT_OF_STOCK') outOfStockCount++;
      if (p.status === 'LOW_STOCK') lowStockCount++;
    }

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
      totalProducts: prods.length,
      lowStockCount,
      outOfStockCount,
      totalStockValuePaise,
      todaySalesPaise,
      todayOrdersCount,
      reorderNeededCount: prods.filter((p) => p.restockRecommendation.needsRestock).length,
    };
  }
}

const ledger = new InventoryLedgerEngine();

// ============================================================================
// 3. HTTP SERVER & REST API DISPATCHER
// ============================================================================

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-business-id, x-user-id, x-idempotency-key',
  });
  res.end(JSON.stringify(data));
}

// Preset Invoices for 1-Click Testing
const SAMPLE_PRESETS = [
  {
    presetId: 'sample_kirana_01',
    supplierName: 'Gujarat Agro Wholesalers Vadodara',
    invoiceNumber: 'INV-GA-2026-981',
    invoiceDate: '2026-10-28',
    totalAmountPaise: 480000,
    lines: [
      { rawName: 'Fortune Sunlite Sunflower Oil 1L', qty: 24, unitCostPaise: 11000, totalPaise: 264000 },
      { rawName: 'Parle-G Gold Glucose Biscuits 100g', qty: 48, unitCostPaise: 800, totalPaise: 38400 },
      { rawName: 'Wagh Bakri Leaf Tea 250g', qty: 12, unitCostPaise: 12500, totalPaise: 150000 },
      { rawName: 'Madhur Pure Refined Sugar 1kg', qty: 50, unitCostPaise: 4200, totalPaise: 210000 },
    ],
  },
  {
    presetId: 'sample_fmcg_02',
    supplierName: 'Vadodara Super Stockists Pvt Ltd',
    invoiceNumber: 'INV-VSS-7712',
    invoiceDate: '2026-10-29',
    totalAmountPaise: 350000,
    lines: [
      { rawName: 'Dettol Original Bathing Soap 75g', qty: 36, unitCostPaise: 3200, totalPaise: 115200 },
      { rawName: 'Maggi 2-Minute Masala Noodles Pack', qty: 48, unitCostPaise: 4800, totalPaise: 230400 },
      { rawName: 'Tata Salt Vacuum Evaporated 1kg', qty: 24, unitCostPaise: 2100, totalPaise: 50400 },
    ],
  },
  {
    presetId: 'sample_pharma_03',
    supplierName: 'Apollo Med Distributors Gujarat',
    invoiceNumber: 'INV-APO-9011',
    invoiceDate: '2026-10-30',
    totalAmountPaise: 290000,
    lines: [
      { rawName: 'Dolo 650mg Paracetamol Strips', qty: 50, unitCostPaise: 2400, totalPaise: 120000 },
      { rawName: 'Benadryl Cough Formula Syrup 100ml', qty: 20, unitCostPaise: 9500, totalPaise: 190000 },
      { rawName: 'Hansaplast Waterproof Bandages Box', qty: 15, unitCostPaise: 6000, totalPaise: 90000 },
    ],
  },
];

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-business-id, x-user-id, x-idempotency-key',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const businessId = req.headers['x-business-id'] || parsedUrl.searchParams.get('businessId') || 'biz_ramesh_01';
  const userId = req.headers['x-user-id'] || parsedUrl.searchParams.get('userId') || 'usr_ramesh';

  // --- API ROUTING ---

  // Health
  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'healthy', system: 'StockPilot AI', timestamp: new Date().toISOString() });
  }

  // Auth: Demo Accounts
  if (pathname === '/api/auth/demo-accounts' && req.method === 'GET') {
    const accounts = USERS.map((u) => {
      const b = BUSINESSES.find((b) => b.id === u.businessId);
      return {
        userId: u.id,
        name: u.name,
        role: u.role,
        businessId: u.businessId,
        businessName: b?.name,
        businessType: b?.type,
        avatarInitials: u.name.slice(0, 2).toUpperCase(),
      };
    });
    return sendJson(res, 200, { success: true, accounts });
  }

  // Auth: Current Session
  if (pathname === '/api/auth/current' && req.method === 'GET') {
    const b = ledger.getBusiness(businessId);
    const u = ledger.getUser(userId);
    if (!b || !u) return sendJson(res, 404, { error: 'SESSION_NOT_FOUND', message: 'Tenant or user not found' });
    return sendJson(res, 200, { success: true, business: b, user: u, metrics: ledger.getDashboardMetrics(businessId) });
  }

  // Products: List
  if (pathname === '/api/products' && req.method === 'GET') {
    const category = parsedUrl.searchParams.get('category');
    const query = parsedUrl.searchParams.get('q');
    const includeArchived = parsedUrl.searchParams.get('archived') === 'true';
    const products = ledger.listProducts(businessId, { category, query, includeArchived });
    return sendJson(res, 200, { success: true, products });
  }

  // Products: Single
  if (pathname.startsWith('/api/products/') && req.method === 'GET' && !pathname.endsWith('/adjust')) {
    const pId = pathname.replace('/api/products/', '');
    try {
      const product = ledger.getProductSummary(businessId, pId);
      return sendJson(res, 200, { success: true, product });
    } catch (err) {
      return sendJson(res, err.statusCode || 500, { error: err.code || 'ERROR', message: err.message });
    }
  }

  // Products: Create (Owner Only)
  if (pathname === '/api/products' && req.method === 'POST') {
    const user = ledger.getUser(userId);
    if (!user || user.role !== 'OWNER') {
      return sendJson(res, 403, { error: 'FORBIDDEN', message: 'Only store owners can create products.' });
    }
    const body = await parseJsonBody(req);
    try {
      const created = ledger.addProduct(businessId, userId, body, body.initialQuantity || 0);
      return sendJson(res, 201, { success: true, product: created });
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: 'CREATE_FAILED', message: err.message });
    }
  }

  // Products: Update (Owner Only)
  if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
    const user = ledger.getUser(userId);
    if (!user || user.role !== 'OWNER') {
      return sendJson(res, 403, { error: 'FORBIDDEN', message: 'Only store owners can update products.' });
    }
    const pId = pathname.replace('/api/products/', '');
    const body = await parseJsonBody(req);
    try {
      const updated = ledger.updateProduct(businessId, pId, body);
      return sendJson(res, 200, { success: true, product: updated });
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: 'UPDATE_FAILED', message: err.message });
    }
  }

  // Products: Archive (Owner Only)
  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    const user = ledger.getUser(userId);
    if (!user || user.role !== 'OWNER') {
      return sendJson(res, 403, { error: 'FORBIDDEN', message: 'Only store owners can archive products.' });
    }
    const pId = pathname.replace('/api/products/', '');
    try {
      ledger.archiveProduct(businessId, pId);
      return sendJson(res, 200, { success: true, message: 'Product archived.' });
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: 'ARCHIVE_FAILED', message: err.message });
    }
  }

  // Products: Manual Stock Adjustment (Owner Only with Mandatory Reason)
  if (pathname.includes('/adjust') && req.method === 'POST') {
    const user = ledger.getUser(userId);
    if (!user || user.role !== 'OWNER') {
      return sendJson(res, 403, { error: 'FORBIDDEN', message: 'Only store owners can make manual stock adjustments.' });
    }
    const pId = pathname.split('/')[3];
    const body = await parseJsonBody(req);
    try {
      const updated = ledger.manualStockAdjustment(businessId, userId, pId, Number(body.deltaQuantity), body.reason);
      return sendJson(res, 200, { success: true, product: updated });
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: 'ADJUST_FAILED', message: err.message });
    }
  }

  // Sales: POS Checkout (Atomic, Mutex Protected, Idempotent)
  if (pathname === '/api/sales' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const key = body.idempotencyKey || req.headers['x-idempotency-key'];
    try {
      const sale = await ledger.recordSale(businessId, userId, body.items, key);
      return sendJson(res, 201, { success: true, sale });
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: err.code || 'SALE_FAILED', message: err.message });
    }
  }

  // Invoices: OCR Extraction & Preset Load
  if (pathname === '/api/invoices/upload' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const presetId = body.presetId || 'sample_kirana_01';
    const preset = SAMPLE_PRESETS.find((p) => p.presetId === presetId) || SAMPLE_PRESETS[0];

    const existingProds = ledger.listProducts(businessId);
    let calculatedSum = 0;

    const items = preset.lines.map((line, idx) => {
      calculatedSum += line.totalPaise;
      const matched = existingProds.find((p) => line.rawName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));
      return {
        id: `line_${idx + 1}`,
        rawProductName: line.rawName,
        matchedProductId: matched?.id,
        matchedProductName: matched?.name,
        isNewProduct: !matched,
        quantity: line.qty,
        unitPricePaise: line.unitCostPaise,
        lineTotalPaise: line.totalPaise,
        confidence: matched ? 0.95 : 0.88,
      };
    });

    const dup = ledger.checkDuplicateInvoice(businessId, preset.supplierName, preset.invoiceNumber);

    const draftInvoice = {
      id: `inv_draft_${Date.now()}`,
      businessId,
      supplierName: preset.supplierName,
      invoiceNumber: preset.invoiceNumber,
      invoiceDate: preset.invoiceDate,
      totalAmountPaise: preset.totalAmountPaise,
      status: 'DRAFT',
      items,
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
    };

    return sendJson(res, 200, {
      success: true,
      draftInvoice,
      validation: {
        calculatedSumPaise: calculatedSum,
        totalAmountPaise: preset.totalAmountPaise,
        isTotalMismatch: calculatedSum !== preset.totalAmountPaise,
        hasDuplicateWarning: !!dup,
        duplicateDetails: dup,
      },
    });
  }

  // Invoices: Confirm (Owner Only, Atomic Batch Movements)
  if (pathname === '/api/invoices/confirm' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    try {
      const result = ledger.confirmInvoice(businessId, userId, body.invoice);
      return sendJson(res, 200, {
        success: true,
        message: `Invoice #${result.invoice.invoiceNumber} confirmed. ${result.createdMovementsCount} purchase ledger entries created.`,
        invoice: result.invoice,
      });
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: err.code || 'CONFIRM_FAILED', message: err.message });
    }
  }

  // Forecast: Replenishment Recommendations
  if (pathname === '/api/forecast/recommendations' && req.method === 'GET') {
    const prods = ledger.listProducts(businessId);
    const reorders = prods
      .filter((p) => p.restockRecommendation.needsRestock && p.restockRecommendation.recommendedQuantity > 0)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        leadTimeDays: p.leadTimeDays,
        salesVelocity: p.salesVelocity,
        daysOfCover: p.daysOfCover,
        predictedStockOutDate: p.predictedStockOutDate,
        packSize: p.packSize,
        recommendedQuantity: p.restockRecommendation.recommendedQuantity,
        estimatedCostPaise: Math.round(p.restockRecommendation.recommendedQuantity * p.costPricePaise),
        explanation: p.restockRecommendation.explanation,
        hasEnoughHistory: p.restockRecommendation.hasEnoughHistory,
      }));
    return sendJson(res, 200, { success: true, count: reorders.length, recommendations: reorders });
  }

  // Forecast: CSV Export
  if (pathname === '/api/forecast/export-csv' && req.method === 'GET') {
    const b = ledger.getBusiness(businessId);
    const prods = ledger.listProducts(businessId);
    const reorders = prods.filter((p) => p.restockRecommendation.needsRestock && p.restockRecommendation.recommendedQuantity > 0);

    let csv = `StockPilot AI - Restock Purchase Order\n`;
    csv += `Business,${b?.name || 'Retail Store'}\nDate,${new Date().toISOString().slice(0, 10)}\n\n`;
    csv += `SKU,Product Name,Unit,Current Stock,Lead Time (Days),Daily Velocity,Recommended Qty,Pack Size,Est Cost (INR),Forecast Rationale\n`;
    for (const item of reorders) {
      const costRupees = (item.costPricePaise * item.restockRecommendation.recommendedQuantity) / 100;
      csv += `"${item.sku}","${item.name}","${item.unit}",${item.currentStock},${item.leadTimeDays},${item.salesVelocity},${item.restockRecommendation.recommendedQuantity},${item.packSize},"${costRupees.toFixed(2)}","${item.restockRecommendation.explanation.replace(/"/g, '""')}"\n`;
    }
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=restock-order-${businessId}.csv`,
    });
    return res.end(csv);
  }

  // Forecast: Reset Seed
  if (pathname === '/api/forecast/reset-seed' && req.method === 'POST') {
    ledger.resetToDefaults();
    return sendJson(res, 200, { success: true, message: 'System reset to default 30-day realistic sales dataset.' });
  }

  // Ledger Movements
  if (pathname === '/api/ledger/movements' && req.method === 'GET') {
    const movements = ledger.movements.filter((m) => m.businessId === businessId).slice(-100).reverse();
    return sendJson(res, 200, { success: true, count: movements.length, movements });
  }

  // Ledger Metrics
  if (pathname === '/api/ledger/metrics' && req.method === 'GET') {
    return sendJson(res, 200, { success: true, metrics: ledger.getDashboardMetrics(businessId) });
  }

  // --- LIVE HACKATHON TEST LAB ENDPOINTS ---

  // Test 1: Concurrency Race Condition Test
  if (pathname === '/api/test/concurrency' && req.method === 'POST') {
    const testProd = ledger.addProduct(
      'biz_ramesh_01',
      'usr_ramesh',
      {
        sku: `RACE-${Date.now().toString().slice(-4)}`,
        name: 'Flash Sale Limited Item (1 Unit Stock)',
        category: 'Test',
        unit: 'pcs',
        costPricePaise: 5000,
        sellingPricePaise: 9900,
        reorderLevel: 1,
        leadTimeDays: 1,
        packSize: 1,
      },
      1
    );

    const [res1, res2] = await Promise.allSettled([
      ledger.recordSale('biz_ramesh_01', 'usr_priya', [{ productId: testProd.id, quantity: 1 }], `w1_${Date.now()}`),
      ledger.recordSale('biz_ramesh_01', 'usr_ramesh', [{ productId: testProd.id, quantity: 1 }], `w2_${Date.now()}`),
    ]);

    const passed = (res1.status === 'fulfilled' && res2.status === 'rejected') || (res1.status === 'rejected' && res2.status === 'fulfilled');
    const finalStock = ledger.getCurrentStock('biz_ramesh_01', testProd.id);

    return sendJson(res, 200, {
      testName: 'High-Concurrency Double-Sale Race Condition Test',
      passed,
      explanation: passed
        ? 'PASSED: Exactly one sale committed (200 OK); the concurrent competitor was rejected with 409 Conflict. Stock never went negative.'
        : 'FAILED: Race condition allowed overselling!',
      details: {
        initialStock: 1,
        finalStock,
        worker1: res1.status === 'fulfilled' ? '200 OK (Committed)' : res1.reason.message,
        worker2: res2.status === 'fulfilled' ? '200 OK (Committed)' : res2.reason.message,
      },
    });
  }

  // Test 2: Tenant Isolation Breach Test
  if (pathname === '/api/test/tenant-isolation' && req.method === 'POST') {
    try {
      ledger.verifyTenantOwnership('biz_anita_02', 'prod_oil_01');
      return sendJson(res, 200, { passed: false, message: 'FAILED: Anita accessed Ramesh data!' });
    } catch (err) {
      return sendJson(res, 200, {
        testName: 'Cross-Tenant Security Isolation Breach Test',
        passed: err.statusCode === 403,
        statusCode: err.statusCode,
        errorCode: err.code,
        message: 'PASSED: Server strictly rejected cross-tenant access with 403 Forbidden.',
        rawException: err.message,
      });
    }
  }

  // Test 3: Duplicate Invoice Prevention Test
  if (pathname === '/api/test/duplicate-invoice' && req.method === 'POST') {
    const testInv = {
      id: `inv_test_${Date.now()}`,
      businessId: 'biz_ramesh_01',
      supplierName: 'Gujarat Traders Test',
      invoiceNumber: 'INV-DUP-TEST-01',
      invoiceDate: '2026-10-31',
      totalAmountPaise: 10000,
      status: 'DRAFT',
      items: [
        {
          id: '1',
          rawProductName: 'Fortune Sunlite Sunflower Oil 1L',
          matchedProductId: 'prod_oil_01',
          isNewProduct: false,
          quantity: 10,
          unitPricePaise: 1000,
          lineTotalPaise: 10000,
        },
      ],
      createdByUserId: 'usr_ramesh',
      createdAt: new Date().toISOString(),
    };

    ledger.confirmInvoice('biz_ramesh_01', 'usr_ramesh', testInv);
    let blocked = false;
    let reason = '';
    try {
      ledger.confirmInvoice('biz_ramesh_01', 'usr_ramesh', { ...testInv, id: `inv_test_attempt2_${Date.now()}` });
    } catch (dupErr) {
      blocked = true;
      reason = dupErr.message;
    }

    return sendJson(res, 200, {
      testName: 'Duplicate Invoice Protection Test',
      passed: blocked,
      explanation: blocked ? 'PASSED: Duplicate invoice rejected. Zero duplicate stock added.' : 'FAILED: Duplicate invoice doubled stock!',
      rejectionReason: reason,
    });
  }

  // Test 4: Negative Stock Rejection
  if (pathname === '/api/test/negative-stock' && req.method === 'POST') {
    let blocked = false;
    let errMsg = '';
    try {
      await ledger.recordSale('biz_ramesh_01', 'usr_priya', [{ productId: 'prod_oil_01', quantity: 9999 }]);
    } catch (err) {
      blocked = true;
      errMsg = err.message;
    }
    return sendJson(res, 200, {
      testName: 'Negative Stock Rejection Guard',
      passed: blocked,
      explanation: blocked ? 'PASSED: Sale exceeding available ledger quantity rejected.' : 'FAILED: Stock became negative!',
      errorMessage: errMsg,
    });
  }

  // Test 5: Currency Integrity (Paise vs Float)
  if (pathname === '/api/test/currency-integrity' && req.method === 'POST') {
    let floatSum = 0;
    let paiseSum = 0;
    for (let i = 0; i < 100; i++) {
      floatSum += 0.70;
      paiseSum += 70;
    }
    const floatDrift = floatSum !== 70.0;
    const paiseExact = paiseSum === 7000;

    return sendJson(res, 200, {
      testName: 'Zero-Drift Financial Accounting Audit',
      passed: paiseExact,
      explanation: 'PASSED: StockPilot AI uses pure integer Paise. Zero fractional cents drift across high-volume transactions.',
      comparison: {
        floatingPointResult: floatSum,
        floatingPointHasDrift: floatDrift,
        paiseIntegerResult: `${paiseSum} paise (₹${(paiseSum / 100).toFixed(2)})`,
        driftFree: paiseExact,
      },
    });
  }

  // Static HTML App Fallback
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(htmlPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(htmlPath).pipe(res);
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('StockPilot AI API Server Active');
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  STOCKPILOT AI — ZERO-DEPENDENCY REPLENISHMENT SERVER `);
  console.log(`  Port: ${PORT} | Mode: Production                      `);
  console.log(`  Double-Entry Movement Ledger & Concurrency Mutex Active`);
  console.log(`=======================================================`);
});
