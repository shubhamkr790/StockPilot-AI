import { Router } from 'express';
import express from 'express';
import { requireRole } from '../middleware/auth.ts';
import { ledgerEngine, istDate } from '../db/ledger.ts';
import { handle } from './util.ts';

const router = Router();
const ownerOnly = requireRole(['OWNER']);

function reorderList(businessId: string) {
  return ledgerEngine
    .listProducts(businessId)
    .filter((p) => p.restockRecommendation.needsRestock)
    .sort((a, b) => (a.daysOfCover ?? 1e9) - (b.daysOfCover ?? 1e9));
}

router.get(
  '/recommendations',
  ownerOnly,
  handle((req, res) => {
    const items = reorderList(req.tenantId);
    res.json({
      count: items.length,
      recommendations: items.map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        category: p.category,
        status: p.status,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        leadTimeDays: p.leadTimeDays,
        salesVelocity: p.salesVelocity,
        daysOfCover: p.daysOfCover,
        predictedStockOutDate: p.predictedStockOutDate,
        packSize: p.packSize,
        costPricePaise: p.costPricePaise,
        recommendedQuantity: p.restockRecommendation.recommendedQuantity,
        estimatedCostPaise: p.restockRecommendation.recommendedQuantity === null ? null : Math.round(p.restockRecommendation.recommendedQuantity * p.costPricePaise),
        explanation: p.restockRecommendation.explanation,
        calculation: p.restockRecommendation.calculation,
        alertReason: p.restockRecommendation.alertReason,
        hasEnoughHistory: p.restockRecommendation.hasEnoughHistory,
      })),
    });
  })
);

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  // Quote everything and neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

router.get(
  '/export-csv',
  ownerOnly,
  handle((req, res) => {
    const business = ledgerEngine.getBusiness(req.tenantId)!;
    const rows = [['SKU', 'Product', 'Unit', 'In stock', 'Sells per day', 'Stock-out date', 'Order quantity', 'Pack size', 'Est. cost (INR)', 'Why']];
    for (const p of reorderList(req.tenantId)) {
      const q = p.restockRecommendation.recommendedQuantity;
      rows.push([
        p.sku, p.name, p.unit, String(p.currentStock), p.salesVelocity.toFixed(1), p.predictedStockOutDate || '',
        q === null ? 'Not enough history' : String(q), String(p.packSize),
        q === null ? '' : ((q * p.costPricePaise) / 100).toFixed(2), p.restockRecommendation.explanation,
      ]);
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="restock-${business.name.replace(/\W+/g, '-').toLowerCase()}-${istDate()}.csv"`);
    res.send('\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'));
  })
);

router.post(
  '/import-history',
  ownerOnly,
  express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }),
  handle((req, res) => {
    if (typeof req.body !== 'string') return res.status(400).json({ error: 'EMPTY_CSV', message: 'Upload a CSV file with columns: date, sku, quantity.' });
    res.json(ledgerEngine.importSalesHistory(req.tenantId, req.userId, req.body));
  })
);

export default router;
