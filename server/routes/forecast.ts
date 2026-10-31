import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { ledgerEngine } from '../db/ledger.ts';

const router = Router();

// GET /api/forecast/recommendations - Get replenishment list with full explainable math
router.get('/recommendations', (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const allProducts = ledgerEngine.listProducts(authReq.tenantId);

    const reorderItems = allProducts.filter(
      (p) => p.restockRecommendation.needsRestock && p.restockRecommendation.recommendedQuantity > 0
    );

    res.json({
      success: true,
      count: reorderItems.length,
      recommendations: reorderItems.map((p) => ({
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
      })),
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/forecast/export-csv - Generate printable/downloadable CSV purchase order for suppliers
router.get('/export-csv', (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const business = ledgerEngine.getBusiness(authReq.tenantId);
    const products = ledgerEngine.listProducts(authReq.tenantId);
    const reorderItems = products.filter(
      (p) => p.restockRecommendation.needsRestock && p.restockRecommendation.recommendedQuantity > 0
    );

    let csv = `StockPilot AI - Restock Purchase Order\n`;
    csv += `Business,${business?.name || 'Retail Store'}\n`;
    csv += `Date,${new Date().toISOString().slice(0, 10)}\n\n`;
    csv += `SKU,Product Name,Unit,Current Stock,Lead Time (Days),Daily Velocity,Recommended Qty,Pack Size,Est Cost (INR),Forecast Rationale\n`;

    for (const item of reorderItems) {
      const costRupees = (item.costPricePaise * item.restockRecommendation.recommendedQuantity) / 100;
      csv += `"${item.sku}","${item.name}","${item.unit}",${item.currentStock},${item.leadTimeDays},${item.salesVelocity},${item.restockRecommendation.recommendedQuantity},${item.packSize},"${costRupees.toFixed(2)}","${item.restockRecommendation.explanation.replace(/"/g, '""')}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=restock-order-${authReq.tenantId}.csv`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: 'EXPORT_FAILED', message: err.message });
  }
});

// POST /api/forecast/reset-seed - 1-Click reset to default 30-day realistic sales dataset for judges
router.post('/reset-seed', (req, res: Response) => {
  try {
    ledgerEngine.resetToDefaults();
    res.json({
      success: true,
      message: 'System reset to default 30-day sales history. Cooking Oil and Biscuits are ready for forecast demonstration.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'RESET_FAILED', message: err.message });
  }
});

export default router;
