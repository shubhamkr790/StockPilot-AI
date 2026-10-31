import { AppError, ExtractedInvoice } from '../db/ledger.ts';
import { geminiJson, VISION_MODELS } from './gemini.ts';

export const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/pdf': 'PDF',
};

/** Check the file's real signature, not just the extension or browser-supplied MIME type. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 4 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}

const PROMPT = `You are reading a purchase invoice from an Indian wholesale supplier to a small shop.
Extract the data exactly as printed. Do not invent values.
- Money: return integer paise (Rs 12.50 -> 1250).
- invoiceDate: YYYY-MM-DD. If the year or day is ambiguous, give your best reading and list "invoiceDate" in uncertainFields.
- totalAmountPaise: the final invoice total as printed (grand total, including tax if shown).
- lines: one per product row. qty is the number of units.
- uncertainFields: list the field names you could not read clearly (blurry, cut off, handwritten, guessed).
  Header fields: supplierName, invoiceNumber, invoiceDate, totalAmountPaise. Line fields: rawName, qty, unitCostPaise, totalPaise.
If the file is not an invoice, return empty lines.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    supplierName: { type: 'STRING' },
    invoiceNumber: { type: 'STRING' },
    invoiceDate: { type: 'STRING' },
    totalAmountPaise: { type: 'INTEGER' },
    uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } },
    lines: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rawName: { type: 'STRING' },
          sku: { type: 'STRING' },
          qty: { type: 'NUMBER' },
          unitCostPaise: { type: 'INTEGER' },
          totalPaise: { type: 'INTEGER' },
          uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['rawName', 'qty', 'unitCostPaise', 'totalPaise'],
      },
    },
  },
  required: ['supplierName', 'invoiceNumber', 'invoiceDate', 'totalAmountPaise', 'lines'],
};

export function ocrProviderName() {
  if (process.env.OCR_MOCK === '1') return 'mock';
  return process.env.GEMINI_API_KEY ? `Gemini (${process.env.GEMINI_MODEL || 'gemini-3.8-flash'})` : null;
}

/** Sanitise model output: anything malformed becomes 0/empty and is flagged as uncertain for the reviewer. */
function normalise(raw: any): ExtractedInvoice {
  const int = (v: any) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
  const header: string[] = Array.isArray(raw?.uncertainFields) ? raw.uncertainFields.map(String) : [];
  const date = String(raw?.invoiceDate || '');
  const flag = (f: string) => !header.includes(f) && header.push(f);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) flag('invoiceDate');
  if (!raw?.supplierName) flag('supplierName');
  if (!raw?.invoiceNumber) flag('invoiceNumber');
  return {
    supplierName: String(raw?.supplierName || '').trim(),
    invoiceNumber: String(raw?.invoiceNumber || '').trim(),
    invoiceDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    totalAmountPaise: int(raw?.totalAmountPaise),
    uncertainFields: header,
    lines: (Array.isArray(raw?.lines) ? raw.lines : []).slice(0, 100).map((l: any) => {
      const unc: string[] = Array.isArray(l?.uncertainFields) ? l.uncertainFields.map(String) : [];
      const qty = Number(l?.qty);
      if (!(qty > 0)) unc.push('qty');
      return {
        rawName: String(l?.rawName || '').trim() || 'Unreadable item',
        sku: l?.sku ? String(l.sku) : undefined,
        qty: qty > 0 ? Math.round(qty * 1000) / 1000 : 0,
        unitCostPaise: int(l?.unitCostPaise),
        totalPaise: int(l?.totalPaise),
        uncertainFields: unc,
      };
    }),
  };
}

export async function extractInvoice(file: Buffer, mime: string): Promise<ExtractedInvoice> {
  if (process.env.OCR_MOCK === '1') {
    // Deterministic extraction used by the automated tests (no network).
    return normalise({
      supplierName: 'Sardar Wholesale Traders',
      invoiceNumber: 'SWT-1042',
      invoiceDate: '2026-10-29',
      totalAmountPaise: 412800,
      uncertainFields: [],
      lines: [
        { rawName: 'Fortune Sunlite Sunflower Oil 1L', qty: 24, unitCostPaise: 11000, totalPaise: 264000 },
        { rawName: 'Parle G Gold Biscuits 100g', qty: 48, unitCostPaise: 800, totalPaise: 38400 },
        { rawName: 'Tata Salt 1kg', qty: 24, unitCostPaise: 2100, totalPaise: 50400 },
        { rawName: 'Haldiram Bhujia 200g', qty: 12, unitCostPaise: 5000, totalPaise: 60000, uncertainFields: ['unitCostPaise'] },
      ],
    });
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError(503, 'OCR_NOT_CONFIGURED', 'Invoice reading is not set up on this server yet. You can still enter the invoice manually.');
  }
  try {
    const parts = [{ text: PROMPT }, { inline_data: { mime_type: mime, data: file.toString('base64') } }];
    return normalise(await geminiJson(parts, SCHEMA, VISION_MODELS, 30_000));
  } catch (err: any) {
    console.error('OCR failure', err?.message || err);
    throw new AppError(502, 'OCR_FAILED', "We couldn't read this invoice right now. Try again in a minute, or enter it manually.");
  }
}
