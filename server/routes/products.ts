import { Router, Response } from 'express';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.ts';
import { ledgerEngine } from '../db/ledger.ts';

const router = Router();

// GET /api/products - List all products for current tenant with real-time stock & forecasts
router.get('/', (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const category = req.query.category as string | undefined;
    const query = req.query.q as string | undefined;
    const includeArchived = req.query.archived === 'true';

    const products = ledgerEngine.listProducts(authReq.tenantId, {
      category,
      query,
      includeArchived,
    });

    res.json({
      success: true,
      tenantId: authReq.tenantId,
      count: products.length,
      products,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/products/:id - Single product with strict tenant ownership check
router.get('/:id', (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const product = ledgerEngine.getProductSummary(authReq.tenantId, req.params.id);
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/products - Create product (OWNER only)
router.post('/', requireRole(['OWNER']), (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const {
      name,
      sku,
      category,
      unit,
      costPricePaise,
      sellingPricePaise,
      reorderLevel,
      leadTimeDays,
      packSize,
      initialQuantity,
    } = req.body;

    if (!name || !sku || !unit || costPricePaise === undefined || sellingPricePaise === undefined) {
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: 'Name, SKU, Unit, Cost Price, and Selling Price are required.',
      });
    }

    const created = ledgerEngine.addProduct(
      authReq.tenantId,
      authReq.userId,
      {
        name,
        sku,
        category: category || 'General',
        unit,
        costPricePaise: Number(costPricePaise),
        sellingPricePaise: Number(sellingPricePaise),
        reorderLevel: Number(reorderLevel || 10),
        leadTimeDays: Number(leadTimeDays || 3),
        packSize: Number(packSize || 1),
      },
      Number(initialQuantity || 0)
    );

    res.status(201).json({ success: true, product: created });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

// PUT /api/products/:id - Update product settings (OWNER only)
router.put('/:id', requireRole(['OWNER']), (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const updated = ledgerEngine.updateProduct(authReq.tenantId, req.params.id, req.body);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

// DELETE /api/products/:id - Archive product (OWNER only; past ledger history stays intact)
router.delete('/:id', requireRole(['OWNER']), (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    ledgerEngine.archiveProduct(authReq.tenantId, req.params.id);
    res.json({ success: true, message: 'Product archived successfully. Past stock and sales history remain intact.' });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/products/:id/adjust - Manual stock adjustment with required reason (OWNER only)
router.post('/:id/adjust', requireRole(['OWNER']), (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { deltaQuantity, reason } = req.body;

    if (deltaQuantity === undefined || deltaQuantity === 0) {
      return res.status(400).json({ error: 'INVALID_DELTA', message: 'Delta quantity must be non-zero.' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'REASON_REQUIRED',
        message: "A mandatory reason is required (e.g. 'damaged', 'expired', 'counting error').",
      });
    }

    const updated = ledgerEngine.manualStockAdjustment(
      authReq.tenantId,
      authReq.userId,
      req.params.id,
      Number(deltaQuantity),
      reason
    );

    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

export default router;
