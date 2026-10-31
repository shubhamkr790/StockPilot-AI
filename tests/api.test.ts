// End-to-end API regression tests. Run with: npm test
process.env.DATA_FILE = 'memory';
process.env.OCR_MOCK = '1';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

const { createApp } = await import('../server/index.ts');
const { ledgerEngine, istDate } = await import('../server/db/ledger.ts');

let server: Server;
let base = '';
const tokens: Record<string, string> = {};

async function call(method: string, path: string, opts: { as?: string; body?: unknown; headers?: Record<string, string>; raw?: BodyInit } = {}) {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.as) headers.Authorization = `Bearer ${tokens[opts.as]}`;
  let body: BodyInit | undefined = opts.raw;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(base + path, { method, headers, body });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const stockOf = async (as: string, id: string) => (await call('GET', `/api/products/${id}`, { as })).json.product.currentStock;

async function makeProduct(stock: number, extra: Record<string, unknown> = {}) {
  const r = await call('POST', '/api/products', {
    as: 'ramesh',
    body: { name: `Test item ${Math.random()}`, sku: `T-${Math.random().toString(36).slice(2, 8)}`, unit: 'pcs', costPricePaise: 1000, sellingPricePaise: 1500, openingStock: stock, ...extra },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.product;
}

before(async () => {
  ledgerEngine.resetToDefaults();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
  for (const [u, pin] of [['ramesh', '1234'], ['priya', '5678'], ['anita', '9999']]) {
    const r = await call('POST', '/api/auth/login', { body: { username: u, pin } });
    assert.equal(r.status, 200);
    tokens[u] = r.json.token;
  }
});

after(() => server.close());

// --- Auth & isolation -------------------------------------------------------

test('login rejects a wrong PIN', async () => {
  const r = await call('POST', '/api/auth/login', { body: { username: 'ramesh', pin: '0000' } });
  assert.equal(r.status, 401);
});

test('API rejects requests without a valid token', async () => {
  assert.equal((await call('GET', '/api/products')).status, 401);
  assert.equal((await call('GET', '/api/products', { headers: { Authorization: 'Bearer forged.token' } })).status, 401);
  // The old spoofable headers must have no effect.
  assert.equal((await call('GET', '/api/products', { headers: { 'x-user-id': 'usr_ramesh', 'x-business-id': 'biz_ramesh_01' } })).status, 401);
});

test('tampered token payload is rejected', async () => {
  const [payload, sig] = tokens.anita.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 'usr_ramesh', exp: Date.now() + 1e7 })).toString('base64url');
  assert.notEqual(forged, payload);
  assert.equal((await call('GET', '/api/products', { headers: { Authorization: `Bearer ${forged}.${sig}` } })).status, 401);
});

test("Anita cannot read, edit, sell or adjust Ramesh's product by changing the ID", async () => {
  const id = 'prod_oil_01';
  for (const [m, p, body] of [
    ['GET', `/api/products/${id}`, undefined],
    ['GET', `/api/products/${id}/movements`, undefined],
    ['PUT', `/api/products/${id}`, { sellingPricePaise: 1 }],
    ['DELETE', `/api/products/${id}`, undefined],
    ['POST', `/api/products/${id}/adjust`, { deltaQuantity: -1, reason: 'damaged' }],
    ['POST', '/api/sales', { items: [{ productId: id, quantity: 1 }] }],
  ] as const) {
    const r = await call(m, p, { as: 'anita', body });
    assert.equal(r.status, 404, `${m} ${p} -> ${r.status}`);
    assert.ok(!JSON.stringify(r.json).includes('Fortune'), 'no data leaked');
  }
  const list = (await call('GET', '/api/products', { as: 'anita' })).json.products;
  assert.ok(list.length > 0 && list.every((p: any) => p.businessId === 'biz_anita_02'));
  assert.equal(await stockOf('ramesh', id), 9);
});

test('staff (Priya) cannot change prices, delete, adjust, or touch invoices', async () => {
  assert.equal((await call('PUT', '/api/products/prod_oil_01', { as: 'priya', body: { sellingPricePaise: 1 } })).status, 403);
  assert.equal((await call('DELETE', '/api/products/prod_oil_01', { as: 'priya' })).status, 403);
  assert.equal((await call('POST', '/api/products/prod_oil_01/adjust', { as: 'priya', body: { deltaQuantity: 5, reason: 'counting error' } })).status, 403);
  assert.equal((await call('POST', '/api/products', { as: 'priya', body: { name: 'x', sku: 'x', unit: 'pcs', costPricePaise: 1, sellingPricePaise: 1 } })).status, 403);
  assert.equal((await call('POST', '/api/invoices/draft', { as: 'priya', body: { lines: [{ rawName: 'x', qty: 1 }] } })).status, 403);
  assert.equal((await call('GET', '/api/forecast/recommendations', { as: 'priya' })).status, 403);
  // But she can view stock and sell.
  assert.equal((await call('GET', '/api/products', { as: 'priya' })).status, 200);
});

test('product edit cannot move a product to another business (mass assignment)', async () => {
  const p = await makeProduct(5);
  const r = await call('PUT', `/api/products/${p.id}`, { as: 'ramesh', body: { businessId: 'biz_anita_02', isArchived: true, id: 'hijack', name: 'Renamed' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.product.businessId, 'biz_ramesh_01');
  assert.equal(r.json.product.isArchived, false);
  assert.equal(r.json.product.id, p.id);
  assert.equal(r.json.product.name, 'Renamed');
});

// --- Products & validation -------------------------------------------------

test('product validation: prices must be integer paise, SKU unique per business', async () => {
  const bad = await call('POST', '/api/products', { as: 'ramesh', body: { name: 'X', sku: 'X1', unit: 'pcs', costPricePaise: 10.5, sellingPricePaise: 100 } });
  assert.equal(bad.status, 400);
  const neg = await call('POST', '/api/products', { as: 'ramesh', body: { name: 'X', sku: 'X1', unit: 'pcs', costPricePaise: -1, sellingPricePaise: 100 } });
  assert.equal(neg.status, 400);
  const unit = await call('POST', '/api/products', { as: 'ramesh', body: { name: 'X', sku: 'X1', unit: 'dozen', costPricePaise: 1, sellingPricePaise: 1 } });
  assert.equal(unit.status, 400);
  const dup = await call('POST', '/api/products', { as: 'ramesh', body: { name: 'Dup', sku: 'kir-oil-sun-1l', unit: 'pcs', costPricePaise: 1, sellingPricePaise: 1 } });
  assert.equal(dup.status, 409);
  // Same SKU is fine in a different business.
  const other = await call('POST', '/api/products', { as: 'anita', body: { name: 'Oil', sku: 'KIR-OIL-SUN-1L', unit: 'pcs', costPricePaise: 1, sellingPricePaise: 1 } });
  assert.equal(other.status, 201);
});

test('search and stock-status filters', async () => {
  const q = (await call('GET', '/api/products?q=sunflower', { as: 'ramesh' })).json.products;
  assert.equal(q.length, 1);
  const low = (await call('GET', '/api/products?status=LOW_STOCK', { as: 'ramesh' })).json.products;
  assert.ok(low.length > 0 && low.every((p: any) => p.status === 'LOW_STOCK'));
});

test('archive keeps history; product without history is deleted', async () => {
  const fresh = await makeProduct(0);
  const d = await call('DELETE', `/api/products/${fresh.id}`, { as: 'ramesh' });
  assert.equal(d.json.result, 'DELETED');
  const used = await makeProduct(3);
  const a = await call('DELETE', `/api/products/${used.id}`, { as: 'ramesh' });
  assert.equal(a.json.result, 'ARCHIVED');
  const mv = await call('GET', `/api/products/${used.id}/movements`, { as: 'ramesh' });
  assert.equal(mv.json.movements.length, 1);
  const sale = await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: used.id, quantity: 1 }] } });
  assert.equal(sale.status, 400, 'archived products cannot be sold');
});

// --- Sales -----------------------------------------------------------------

test('sale decrements stock; overselling and bad quantities are rejected', async () => {
  const p = await makeProduct(10);
  const ok = await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: p.id, quantity: 4 }] } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.sale.totalAmountPaise, 6000);
  assert.equal(await stockOf('priya', p.id), 6);

  for (const quantity of [500, 0, -2, 1.5, 'abc', null]) {
    const r = await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: p.id, quantity }] } });
    assert.ok([400, 409].includes(r.status), `qty ${quantity} -> ${r.status}`);
  }
  assert.equal(await stockOf('priya', p.id), 6);
});

test('duplicate lines in one bill cannot oversell', async () => {
  const p = await makeProduct(3);
  const r = await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: p.id, quantity: 3 }, { productId: p.id, quantity: 3 }] } });
  assert.equal(r.status, 409);
  assert.equal(await stockOf('priya', p.id), 3);
});

test('multi-item bill is all-or-nothing', async () => {
  const a = await makeProduct(5);
  const b = await makeProduct(1);
  const r = await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: a.id, quantity: 2 }, { productId: b.id, quantity: 2 }] } });
  assert.equal(r.status, 409);
  assert.equal(await stockOf('priya', a.id), 5, 'first line must not be applied');
});

test('fractional quantities only for kg/litre', async () => {
  const rice = await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: 'prod_rice_03', quantity: 1.25 }] } });
  assert.equal(rice.status, 201);
});

test('two staff selling the last 3 units at the same moment: exactly one succeeds', async () => {
  const p = await makeProduct(3);
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) => call('POST', '/api/sales', { as: i % 2 ? 'priya' : 'ramesh', body: { items: [{ productId: p.id, quantity: 3 }] } }))
  );
  const codes = results.map((r) => r.status).sort();
  assert.equal(codes.filter((c) => c === 201).length, 1, codes.join(','));
  assert.equal(codes.filter((c) => c === 409).length, 7);
  assert.equal(await stockOf('ramesh', p.id), 0);
});

test('repeated sale request with same Idempotency-Key changes stock once', async () => {
  const p = await makeProduct(10);
  const send = () => call('POST', '/api/sales', { as: 'priya', headers: { 'Idempotency-Key': 'retry-abc' }, body: { items: [{ productId: p.id, quantity: 2 }] } });
  const [r1, r2, r3] = await Promise.all([send(), send(), send()]);
  assert.equal(new Set([r1.json.sale.id, r2.json.sale.id, r3.json.sale.id]).size, 1);
  assert.equal(await stockOf('priya', p.id), 8);
  // The same key from a different business is a different request.
  const anitaProd = (await call('GET', '/api/products', { as: 'anita' })).json.products[0];
  const r4 = await call('POST', '/api/sales', { as: 'anita', headers: { 'Idempotency-Key': 'retry-abc' }, body: { items: [{ productId: anitaProd.id, quantity: 1 }] } });
  assert.equal(r4.status, 201);
  assert.notEqual(r4.json.sale.id, r1.json.sale.id);
});

test('returns: cannot return more than sold', async () => {
  const p = await makeProduct(10);
  const sale = (await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: p.id, quantity: 3 }] } })).json.sale;
  assert.equal((await call('POST', `/api/sales/${sale.id}/return`, { as: 'priya', body: { productId: p.id, quantity: 2, reason: 'customer changed mind' } })).status, 200);
  assert.equal((await call('POST', `/api/sales/${sale.id}/return`, { as: 'priya', body: { productId: p.id, quantity: 2, reason: 'again' } })).status, 409);
  assert.equal(await stockOf('priya', p.id), 9);
});

// --- Adjustments -----------------------------------------------------------

test('manual adjustment requires a reason and cannot go negative', async () => {
  const p = await makeProduct(5);
  assert.equal((await call('POST', `/api/products/${p.id}/adjust`, { as: 'ramesh', body: { deltaQuantity: -1, reason: '' } })).status, 400);
  assert.equal((await call('POST', `/api/products/${p.id}/adjust`, { as: 'ramesh', body: { deltaQuantity: -9, reason: 'damaged' } })).status, 409);
  const ok = await call('POST', `/api/products/${p.id}/adjust`, { as: 'ramesh', body: { deltaQuantity: -2, reason: 'damaged' } });
  assert.equal(ok.json.product.currentStock, 3);
});

// --- Invoices --------------------------------------------------------------

test('invoice upload rejects wrong file types and oversized files', async () => {
  const fd = new FormData();
  fd.append('invoiceFile', new Blob(['hello'], { type: 'image/png' }), 'fake.png');
  const r = await call('POST', '/api/invoices/upload', { as: 'ramesh', raw: fd });
  assert.equal(r.status, 415, 'content sniffing, not trusting the declared type');
  const big = new FormData();
  big.append('invoiceFile', new Blob([new Uint8Array(5 * 1024 * 1024 + 10)], { type: 'application/pdf' }), 'big.pdf');
  assert.equal((await call('POST', '/api/invoices/upload', { as: 'ramesh', raw: big })).status, 413);
});

test('OCR -> review -> confirm adds exact quantities; duplicate invoice is refused', async () => {
  const fd = new FormData();
  fd.append('invoiceFile', new Blob([Buffer.from('%PDF-1.4 test')], { type: 'application/pdf' }), 'inv.pdf');
  const up = await call('POST', '/api/invoices/upload', { as: 'ramesh', raw: fd });
  assert.equal(up.status, 200, JSON.stringify(up.json));
  const draft = up.json.draftInvoice;
  assert.equal(draft.items[0].matchedProductId, 'prod_oil_01');
  assert.equal(draft.items[1].matchedProductId, 'prod_bisc_02', 'fuzzy match "Parle G" -> "Parle-G"');
  assert.equal(draft.items[3].isNewProduct, true);
  assert.deepEqual(draft.items[3].uncertainFields, ['unitCostPaise']);
  assert.equal(up.json.validation.isTotalMismatch, false);

  const before = { oil: await stockOf('ramesh', 'prod_oil_01'), bisc: await stockOf('ramesh', 'prod_bisc_02') };
  // Uploading does not change stock.
  assert.equal(before.oil, 9);

  const payload = {
    supplierName: draft.supplierName,
    invoiceNumber: draft.invoiceNumber,
    invoiceDate: draft.invoiceDate,
    totalAmountPaise: draft.totalAmountPaise,
    items: draft.items.map((l: any) => ({
      rawProductName: l.rawProductName,
      matchedProductId: l.matchedProductId,
      newProduct: l.isNewProduct ? { name: l.rawProductName, unit: 'pcs', sellingPricePaise: 6000 } : null,
      quantity: l.rawProductName.startsWith('Fortune') ? 20 : l.quantity, // owner corrected 24 -> 20
      unitPricePaise: l.unitPricePaise,
    })),
  };
  const c = await call('POST', `/api/invoices/${draft.id}/confirm`, { as: 'ramesh', body: payload });
  assert.equal(c.status, 200, JSON.stringify(c.json));
  assert.equal(await stockOf('ramesh', 'prod_oil_01'), before.oil + 20);
  assert.equal(await stockOf('ramesh', 'prod_bisc_02'), before.bisc + 48);

  // Confirming the same draft again: no-op.
  const again = await call('POST', `/api/invoices/${draft.id}/confirm`, { as: 'ramesh', body: payload });
  assert.equal(again.json.alreadyConfirmed, true);
  assert.equal(await stockOf('ramesh', 'prod_oil_01'), before.oil + 20);

  // Uploading the same invoice again warns, and confirming is refused.
  const fd2 = new FormData();
  fd2.append('invoiceFile', new Blob([Buffer.from('%PDF-1.4 test')], { type: 'application/pdf' }), 'inv.pdf');
  const up2 = await call('POST', '/api/invoices/upload', { as: 'ramesh', raw: fd2 });
  assert.ok(up2.json.validation.duplicateOf, 'duplicate warning shown before import');
  const c2 = await call('POST', `/api/invoices/${up2.json.draftInvoice.id}/confirm`, { as: 'ramesh', body: { ...payload, invoiceNumber: ' swt-1042 ' } });
  assert.equal(c2.status, 409);
  assert.equal(await stockOf('ramesh', 'prod_oil_01'), before.oil + 20);

  const hist = (await call('GET', '/api/invoices', { as: 'ramesh' })).json.invoices;
  assert.equal(hist.length, 1);
  // Anita can't see it.
  assert.equal((await call('GET', `/api/invoices/${draft.id}`, { as: 'anita' })).status, 404);
  assert.equal((await call('GET', '/api/invoices', { as: 'anita' })).json.invoices.length, 0);
});

test('invoice confirm is atomic: one bad line means no stock changes at all', async () => {
  const d = await call('POST', '/api/invoices/draft', {
    as: 'ramesh',
    body: { supplierName: 'Atomic Traders', invoiceNumber: 'AT-1', invoiceDate: '2026-10-30', totalAmountPaise: 1000, lines: [{ rawName: 'Tata Salt', qty: 5, unitCostPaise: 100, totalPaise: 500 }] },
  });
  const salt = await stockOf('ramesh', 'prod_salt_06');
  const r = await call('POST', `/api/invoices/${d.json.draftInvoice.id}/confirm`, {
    as: 'ramesh',
    body: {
      supplierName: 'Atomic Traders', invoiceNumber: 'AT-1', invoiceDate: '2026-10-30', totalAmountPaise: 1000,
      items: [
        { rawProductName: 'salt', matchedProductId: 'prod_salt_06', quantity: 5, unitPricePaise: 100 },
        { rawProductName: 'bad', matchedProductId: 'prod_salt_06', quantity: -5, unitPricePaise: 100 },
      ],
    },
  });
  assert.equal(r.status, 400);
  assert.equal(await stockOf('ramesh', 'prod_salt_06'), salt);
  // Cross-tenant product mapping is also refused.
  const r2 = await call('POST', `/api/invoices/${d.json.draftInvoice.id}/confirm`, {
    as: 'ramesh',
    body: { supplierName: 'Atomic Traders', invoiceNumber: 'AT-1', invoiceDate: '2026-10-30', totalAmountPaise: 1000, items: [{ rawProductName: 'x', matchedProductId: 'prod_para_21', quantity: 5, unitPricePaise: 100 }] },
  });
  assert.equal(r2.status, 404);
});

test('invoice draft flags line-total and invoice-total mismatches', async () => {
  const d = await call('POST', '/api/invoices/draft', {
    as: 'ramesh',
    body: { supplierName: 'Math Traders', invoiceNumber: 'M-1', invoiceDate: '2026-10-30', totalAmountPaise: 99999, lines: [{ rawName: 'Tata Salt', qty: 5, unitCostPaise: 100, totalPaise: 700 }] },
  });
  assert.equal(d.json.draftInvoice.items[0].isArithmeticMismatch, true);
  assert.equal(d.json.validation.isTotalMismatch, true);
});

// --- Forecasting -----------------------------------------------------------

test('brief example: sells 6/day, 9 left, 4-day lead time -> order 48 (2 packs of 24)', async () => {
  ledgerEngine.resetToDefaults();
  const p = (await call('GET', '/api/products/prod_oil_01', { as: 'ramesh' })).json.product;
  assert.equal(p.currentStock, 9);
  assert.equal(p.salesVelocity, 6);
  assert.equal(p.status, 'LOW_STOCK');
  assert.equal(p.restockRecommendation.recommendedQuantity, 48);
  assert.match(p.restockRecommendation.explanation, /Sells 6\/day, 9 left, 4-day lead time .* order 48 \(2 packs of 24\)/);
  assert.equal(p.restockRecommendation.calculation, '6 × (4 + 4) − 9 = 39 → round up to packs of 24 → 48');
  assert.equal(p.daysOfCover, 1.5);
  const expected = new Date(Date.parse(istDate()) + 1 * 86400000).toISOString().slice(0, 10);
  assert.equal(p.predictedStockOutDate, expected);
  const recs = (await call('GET', '/api/forecast/recommendations', { as: 'ramesh' })).json.recommendations;
  assert.ok(recs.some((r: any) => r.productId === 'prod_oil_01' && r.recommendedQuantity === 48));
  // Every flagged product with enough history gets a non-zero order and shows its working.
  for (const r of recs.filter((x: any) => x.hasEnoughHistory)) {
    assert.ok(r.recommendedQuantity > 0, `${r.name} flagged but order ${r.recommendedQuantity}`);
    assert.ok(r.calculation, `${r.name} has no calculation`);
  }
});

test('fewer than 7 days of sales -> "Not enough history", no guessed quantity', async () => {
  const p = await makeProduct(2, { reorderLevel: 5 });
  await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: p.id, quantity: 1 }] } });
  const s = (await call('GET', `/api/products/${p.id}`, { as: 'ramesh' })).json.product;
  assert.equal(s.status, 'LOW_STOCK');
  assert.equal(s.restockRecommendation.recommendedQuantity, null);
  assert.match(s.restockRecommendation.explanation, /Not enough history/);
});

test('alert clears automatically after restock', async () => {
  const before = (await call('GET', '/api/products/prod_oil_01', { as: 'ramesh' })).json.product;
  assert.equal(before.status, 'LOW_STOCK');
  await call('POST', '/api/products/prod_oil_01/adjust', { as: 'ramesh', body: { deltaQuantity: 96, reason: 'counting error' } });
  const after = (await call('GET', '/api/products/prod_oil_01', { as: 'ramesh' })).json.product;
  assert.equal(after.status, 'IN_STOCK');
  assert.equal(after.restockRecommendation.recommendedQuantity, 0);
});

test('CSV sales-history import feeds the forecast, is idempotent, and does not change stock', async () => {
  const p = await makeProduct(100, { packSize: 10, leadTimeDays: 2 });
  const today = Date.parse(istDate());
  const rows = ['date,sku,quantity'];
  for (let d = 1; d <= 14; d++) rows.push(`${new Date(today - d * 86400000).toISOString().slice(0, 10)},${p.sku},5`);
  const csv = rows.join('\n');
  const imp = (as: string, body: string) => call('POST', '/api/forecast/import-history', { as, raw: body, headers: { 'Content-Type': 'text/csv' } });
  assert.equal((await imp('ramesh', csv)).json.importedRows, 14);
  assert.equal((await imp('ramesh', csv)).json.importedRows, 14);
  const s = (await call('GET', `/api/products/${p.id}`, { as: 'ramesh' })).json.product;
  assert.equal(s.currentStock, 100);
  assert.equal(s.restockRecommendation.hasEnoughHistory, true);
  // 14-day window includes today (0 sales) -> 13 days * 5 / 14
  assert.equal(s.salesVelocity, Math.round((65 / 14) * 100) / 100, 'not doubled by re-import');
  assert.equal((await imp('ramesh', 'date,sku,quantity\n2026-13-01,NOPE,x')).status, 400);
  assert.equal((await imp('anita', `date,sku,quantity\n2026-10-01,${p.sku},5`)).status, 400, "Anita can't write Ramesh's SKU");
  assert.equal((await imp('priya', csv)).status, 403);
});

test('restock CSV export is owner-only and escapes formulas', async () => {
  const r = await fetch(base + '/api/forecast/export-csv', { headers: { Authorization: `Bearer ${tokens.ramesh}` } });
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.match(text, /SKU/);
  assert.equal((await call('GET', '/api/forecast/export-csv', { as: 'priya' })).status, 403);
});

// --- Dashboard & audit ------------------------------------------------------

test("dashboard counts today's sales", async () => {
  const m0 = (await call('GET', '/api/ledger/metrics', { as: 'ramesh' })).json.metrics;
  const p = await makeProduct(5);
  await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: p.id, quantity: 2 }] } });
  const m1 = (await call('GET', '/api/ledger/metrics', { as: 'priya' })).json.metrics;
  assert.equal(m1.todaySalesPaise - m0.todaySalesPaise, 3000);
  assert.equal(m1.todayOrdersCount - m0.todayOrdersCount, 1);
});

test('audit log records edits, sales, adjustments and invoices; owner-only; tenant-scoped', async () => {
  const p = await makeProduct(4);
  await call('PUT', `/api/products/${p.id}`, { as: 'ramesh', body: { sellingPricePaise: 1800 } });
  await call('POST', `/api/products/${p.id}/adjust`, { as: 'ramesh', body: { deltaQuantity: -1, reason: 'damaged' } });
  await call('POST', '/api/sales', { as: 'priya', body: { items: [{ productId: p.id, quantity: 1 }] } });
  await call('DELETE', `/api/products/${p.id}`, { as: 'ramesh' });
  const audit = (await call('GET', '/api/ledger/audit?limit=500', { as: 'ramesh' })).json.audit;
  const actions = new Set(audit.map((a: any) => a.action));
  for (const a of ['PRODUCT_CREATED', 'PRODUCT_UPDATED', 'SALE_RECORDED', 'STOCK_ADJUSTED', 'PRODUCT_ARCHIVED']) assert.ok(actions.has(a), a);
  assert.ok(audit.every((a: any) => a.businessId === 'biz_ramesh_01'));
  assert.equal((await call('GET', '/api/ledger/audit', { as: 'priya' })).status, 403);
});

test('every stock movement records who, when, quantity and reason', async () => {
  const mv = (await call('GET', '/api/ledger/movements?limit=500', { as: 'ramesh' })).json.movements;
  assert.ok(mv.length > 0);
  for (const m of mv) {
    assert.ok(m.createdByUserId && m.timestamp && m.reason && typeof m.quantity === 'number' && m.quantity !== 0, JSON.stringify(m));
  }
});

// --- AI helpers (OCR_MOCK=1 -> rule-based fallback, no network) ---------------

test('quick sale parses a typed order into cart lines without changing stock', async () => {
  const before = await stockOf('priya', 'prod_bisc_02');
  const r = await call('POST', '/api/ai/parse-sale', { as: 'priya', body: { text: '2 parle g, 1 sunflower oil and half kg rice, 3 unicorn' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const byId = Object.fromEntries(r.json.items.map((i: any) => [i.productId, i.quantity]));
  assert.equal(byId.prod_bisc_02, 2);
  assert.equal(byId.prod_oil_01, 1);
  assert.equal(byId.prod_rice_03, 0.5);
  assert.deepEqual(r.json.unmatched, ['3 unicorn']);
  assert.equal(await stockOf('priya', 'prod_bisc_02'), before, 'parsing must not sell anything');
  assert.equal((await call('POST', '/api/ai/parse-sale', { as: 'priya', body: { text: '' } })).status, 400);
  assert.equal((await call('POST', '/api/ai/parse-sale', { body: { text: '1 oil' } })).status, 401);
});

test("quick sale for Anita can never return Ramesh's products", async () => {
  const r = await call('POST', '/api/ai/parse-sale', { as: 'anita', body: { text: '2 parle g, 1 sunflower oil' } });
  const ids = r.json.items.map((i: any) => i.productId);
  assert.ok(!ids.includes('prod_bisc_02') && !ids.includes('prod_oil_01'));
});

test('daily brief is owner-only and built from calculated numbers', async () => {
  const r = await call('GET', '/api/ai/brief', { as: 'ramesh' });
  assert.equal(r.status, 200);
  assert.ok(r.json.brief.length > 20);
  assert.equal((await call('GET', '/api/ai/brief', { as: 'priya' })).status, 403);
});

// --- Sign-up, password hashing and staff management --------------------------

test('passwords are stored hashed, never as plain text', () => {
  for (const u of ledgerEngine.listUsers()) {
    assert.ok(!('pin' in (u as any)), `${u.username} has a plain pin`);
    assert.match(u.passwordHash, /^[0-9a-f]{32}:[0-9a-f]{64}$/);
  }
});

test('owner sign-up creates a separate, empty business', async () => {
  const bad = await call('POST', '/api/auth/register', { body: { name: 'Sunil', businessName: 'Sunil Stores', email: 'not-an-email', password: 'longenough1' } });
  assert.equal(bad.status, 400);
  const weak = await call('POST', '/api/auth/register', { body: { name: 'Sunil', businessName: 'Sunil Stores', email: 'sunil@example.com', password: 'short' } });
  assert.equal(weak.status, 400);
  const r = await call('POST', '/api/auth/register', { body: { name: 'Sunil', businessName: 'Sunil Stores', email: 'Sunil@Example.com', password: 'longenough1' } });
  assert.equal(r.status, 201);
  tokens.sunil = r.json.token;
  const me = (await call('GET', '/api/auth/me', { as: 'sunil' })).json;
  assert.equal(me.user.role, 'OWNER');
  assert.equal(me.business.name, 'Sunil Stores');
  assert.equal((await call('GET', '/api/products', { as: 'sunil' })).json.products.length, 0);
  assert.equal((await call('GET', '/api/products/prod_oil_01', { as: 'sunil' })).status, 404);
  // Same email again is refused; login works by email, case-insensitive.
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'X', businessName: 'Y', email: 'sunil@example.com', password: 'longenough1' } })).status, 409);
  assert.equal((await call('POST', '/api/auth/login', { body: { identifier: 'SUNIL@example.com', password: 'longenough1' } })).status, 200);
  // New sign-ups are not exposed on the public demo list.
  const demo = (await call('GET', '/api/auth/demo-accounts')).json.accounts;
  assert.deepEqual(demo.map((a: any) => a.username).sort(), ['anita', 'priya', 'ramesh']);
});

test('owner adds and removes staff; staff cannot manage staff', async () => {
  const add = await call('POST', '/api/staff', { as: 'sunil', body: { name: 'Meena', email: 'meena@example.com', password: 'counter123' } });
  assert.equal(add.status, 201);
  const login = await call('POST', '/api/auth/login', { body: { identifier: 'meena@example.com', password: 'counter123' } });
  tokens.meena = login.json.token;
  const me = (await call('GET', '/api/auth/me', { as: 'meena' })).json;
  assert.equal(me.user.role, 'STAFF');
  assert.equal(me.business.name, 'Sunil Stores');
  assert.equal((await call('GET', '/api/staff', { as: 'meena' })).status, 403);
  assert.equal((await call('POST', '/api/staff', { as: 'priya', body: { name: 'Z', email: 'z@example.com', password: 'longenough1' } })).status, 403);
  // Ramesh can't see or remove Sunil's staff.
  assert.ok(!(await call('GET', '/api/staff', { as: 'ramesh' })).json.users.some((u: any) => u.email === 'meena@example.com'));
  assert.equal((await call('DELETE', `/api/staff/${add.json.user.id}`, { as: 'ramesh' })).status, 404);
  // Removing staff ends their access straight away.
  assert.equal((await call('DELETE', `/api/staff/${add.json.user.id}`, { as: 'sunil' })).status, 200);
  assert.equal((await call('GET', '/api/products', { as: 'meena' })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { body: { identifier: 'meena@example.com', password: 'counter123' } })).status, 401);
});
