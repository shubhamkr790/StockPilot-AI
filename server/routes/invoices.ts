import { Router } from 'express';
import multer from 'multer';
import { requireRole } from '../middleware/auth.ts';
import { ledgerEngine, ExtractedInvoice, assertPaise } from '../db/ledger.ts';
import { extractInvoice, sniffMime, ALLOWED_TYPES, ocrProviderName } from '../ai/invoiceOcr.ts';
import { handle } from './util.ts';

const router = Router();
const MAX_BYTES = 5 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

// Uploading and confirming invoices is an owner task (staff "cannot approve invoices").
router.use(requireRole(['OWNER']));

router.get('/ocr-status', (_req, res) => res.json({ provider: ocrProviderName() }));

router.post(
  '/upload',
  (req, res, next) =>
    upload.single('invoiceFile')(req, res, (err: any) => {
      if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'That file is over 5 MB. Please upload a smaller photo or PDF.' });
      if (err) return res.status(400).json({ error: 'UPLOAD_FAILED', message: 'Upload failed. Please choose one JPG, PNG or PDF file.' });
      next();
    }),
  handle(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'NO_FILE', message: 'Choose an invoice photo or PDF to upload.' });
    const mime = sniffMime(file.buffer);
    if (!mime || !ALLOWED_TYPES[mime]) {
      return res.status(415).json({ error: 'UNSUPPORTED_FILE', message: `"${file.originalname}" isn't a JPG, PNG or PDF. Please upload an invoice photo or PDF.` });
    }
    const extracted = await extractInvoice(file.buffer, mime);
    if (extracted.lines.length === 0) {
      return res.status(422).json({ error: 'NO_LINES_FOUND', message: "We couldn't find any product lines on this file. Is it a purchase invoice?" });
    }
    res.json(ledgerEngine.createDraftInvoice(req.tenantId, req.userId, extracted, 'OCR', file.originalname));
  })
);

// Manual entry goes through the same review + confirm pipeline as OCR.
router.post(
  '/draft',
  handle((req, res) => {
    const b = req.body || {};
    const lines = Array.isArray(b.lines) ? b.lines : [];
    if (lines.length === 0) return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'Add at least one line.' });
    const ex: ExtractedInvoice = {
      supplierName: String(b.supplierName || ''),
      invoiceNumber: String(b.invoiceNumber || ''),
      invoiceDate: String(b.invoiceDate || ''),
      totalAmountPaise: assertPaise(b.totalAmountPaise ?? 0, 'Invoice total'),
      lines: lines.slice(0, 100).map((l: any) => ({
        rawName: String(l.rawName || ''),
        sku: l.sku,
        qty: Number(l.qty) || 0,
        unitCostPaise: Number.isInteger(l.unitCostPaise) ? l.unitCostPaise : 0,
        totalPaise: Number.isInteger(l.totalPaise) ? l.totalPaise : 0,
      })),
    };
    res.json(ledgerEngine.createDraftInvoice(req.tenantId, req.userId, ex, 'MANUAL'));
  })
);

router.post(
  '/:id/confirm',
  handle((req, res) => {
    const result = ledgerEngine.confirmInvoice(req.tenantId, req.userId, req.params.id, req.body || {});
    res.json({
      ...result,
      message: result.alreadyConfirmed
        ? 'This invoice was already confirmed. Stock was not changed again.'
        : `Invoice confirmed. Stock updated for ${result.movementsCreated} product(s).`,
    });
  })
);

router.get('/', handle((req, res) => res.json({ invoices: ledgerEngine.getInvoices(req.tenantId) })));
router.get('/:id', handle((req, res) => res.json({ invoice: ledgerEngine.getInvoice(req.tenantId, req.params.id) })));

export default router;
