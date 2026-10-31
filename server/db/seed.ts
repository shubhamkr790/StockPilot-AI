import { Business, User, Product, InventoryMovement } from './schema.ts';

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz_ramesh_01',
    name: 'Ramesh General Store',
    ownerName: 'Ramesh Patel',
    type: 'KIRANA',
    currency: 'INR',
    address: 'Shop 14, Mandvi Clock Tower Market, Vadodara, Gujarat',
    targetCoverDays: 4,
  },
  {
    id: 'biz_anita_02',
    name: 'Anita Medical & Healthcare',
    ownerName: 'Anita Shah',
    type: 'PHARMACY',
    currency: 'INR',
    address: 'Shop 4, Sayajigunj Commercial Complex, Vadodara, Gujarat',
    targetCoverDays: 7,
  },
];

// Demo PINs are hashed when the data is seeded; only the hash is ever stored.
export const INITIAL_USERS: (Omit<User, 'passwordHash'> & { pin: string })[] = [
  {
    id: 'usr_ramesh',
    username: 'ramesh',
    businessId: 'biz_ramesh_01',
    name: 'Ramesh Patel',
    role: 'OWNER',
    pin: '1234',
  },
  {
    id: 'usr_priya',
    username: 'priya',
    businessId: 'biz_ramesh_01',
    name: 'Priya Desai',
    role: 'STAFF',
    pin: '5678',
  },
  {
    id: 'usr_anita',
    username: 'anita',
    businessId: 'biz_anita_02',
    name: 'Anita Shah',
    role: 'OWNER',
    pin: '9999',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Ramesh General Store
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
    leadTimeDays: 4,
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

  // Anita Medical (separate business)
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

/**
 * 30 days of purchases and sales so forecasts have history on first run.
 * Sunflower oil reproduces the brief's example: sells 6/day, 9 left, 4-day lead time -> order 48.
 */
export function generateSeedMovements(): InventoryMovement[] {
  const movements: InventoryMovement[] = [];
  let movementIndex = 1;

  function addMovement(
    businessId: string,
    productId: string,
    type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN',
    quantity: number,
    reason: string,
    timestamp: string,
    userId: string = 'usr_ramesh',
    refId?: string
  ) {
    movements.push({
      id: `mvt_${movementIndex++}`,
      businessId,
      productId,
      movementType: type,
      quantity,
      reason,
      referenceId: refId || `seed_ref_${movementIndex}`,
      createdByUserId: userId,
      createdByName: INITIAL_USERS.find((u) => u.id === userId)?.name || 'System',
      // Never seed a movement in the future (server may boot early in the morning)
      timestamp: new Date(Math.min(Date.parse(timestamp), Date.now() - 60_000)).toISOString(),
    });
  }

  // Opening purchases 30 days ago
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 30);

  // Sunflower oil: 189 bought, 6 sold every day for 30 days -> 9 left
  addMovement(
    'biz_ramesh_01',
    'prod_oil_01',
    'PURCHASE',
    189,
    'Initial Wholesaler Bulk Delivery (Gujarat Agro Foods)',
    new Date(baseDate.getTime() + 1000 * 60 * 60).toISOString(),
    'usr_ramesh',
    'INV-OCT-001'
  );

  for (let day = 29; day >= 0; day--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - day);
    saleDate.setHours(11 + (day % 6), 15, 0);

    const dailyQty = 6;
    addMovement(
      'biz_ramesh_01',
      'prod_oil_01',
      'SALE',
      -dailyQty,
      `Counter POS Sale (Morning/Evening Walk-in Customers)`,
      saleDate.toISOString(),
      day % 2 === 0 ? 'usr_priya' : 'usr_ramesh'
    );
  }

  // Parle-G: fast seller, ~9/day
  addMovement(
    'biz_ramesh_01',
    'prod_bisc_02',
    'PURCHASE',
    300,
    'Initial Depot Stock (Parle Products Vadodara)',
    new Date(baseDate.getTime() + 2000 * 60 * 60).toISOString(),
    'usr_ramesh',
    'INV-OCT-002'
  );
  for (let day = 29; day >= 0; day--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - day);
    saleDate.setHours(14, 20, 0);
    addMovement(
      'biz_ramesh_01',
      'prod_bisc_02',
      'SALE',
      -9,
      'Retail Counter Sales',
      saleDate.toISOString(),
      'usr_priya'
    );
  }

  // Rice is sold by the kg, so quantities are fractional
  addMovement(
    'biz_ramesh_01',
    'prod_rice_03',
    'PURCHASE',
    250,
    'Rice Mill Inbound Batch #22',
    new Date(baseDate.getTime() + 3000 * 60 * 60).toISOString(),
    'usr_ramesh',
    'INV-OCT-003'
  );
  for (let day = 29; day >= 0; day--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - day);
    saleDate.setHours(16, 45, 0);
    addMovement(
      'biz_ramesh_01',
      'prod_rice_03',
      'SALE',
      -5.5,
      'Loose & Packaged Rice Sales (kg)',
      saleDate.toISOString(),
      'usr_priya'
    );
  }

  // Remaining Ramesh products: one delivery, then 10 days of light sales
  const remainingRamesh = [
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

  for (const item of remainingRamesh) {
    addMovement(
      'biz_ramesh_01',
      item.id,
      'PURCHASE',
      item.inStock,
      item.reason,
      new Date(baseDate.getTime() + 4000 * 60 * 60).toISOString(),
      'usr_ramesh'
    );
    for (let day = 9; day >= 0; day--) {
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - day);
      saleDate.setHours(17, 10, 0);
      addMovement(
        'biz_ramesh_01',
        item.id,
        'SALE',
        -1,
        'Daily retail walk-in sale',
        saleDate.toISOString(),
        'usr_priya'
      );
    }
  }

  // Anita Medical: stock only, no sales yet
  addMovement(
    'biz_anita_02',
    'prod_para_21',
    'PURCHASE',
    120,
    'Sayaji Pharma Distributors delivery (Batch #DOL-882)',
    new Date(baseDate.getTime() + 5000 * 60 * 60).toISOString(),
    'usr_anita',
    'INV-APO-441'
  );
  addMovement(
    'biz_anita_02',
    'prod_cough_22',
    'PURCHASE',
    40,
    'Baroda Medisupply consignment',
    new Date(baseDate.getTime() + 5000 * 60 * 60).toISOString(),
    'usr_anita',
    'INV-APO-442'
  );
  addMovement(
    'biz_anita_02',
    'prod_band_23',
    'PURCHASE',
    35,
    'Alkapuri Surgical Traders consignment',
    new Date(baseDate.getTime() + 5000 * 60 * 60).toISOString(),
    'usr_anita',
    'INV-APO-443'
  );

  return movements;
}
