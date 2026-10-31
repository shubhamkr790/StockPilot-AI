import { Router } from 'express';
import { requireRole } from '../middleware/auth.ts';
import { ledgerEngine, nameSimilarity, istDate } from '../db/ledger.ts';
import { geminiJson, FAST_MODELS } from '../ai/gemini.ts';
import { handle } from './util.ts';
import type { ProductStockSummary } from '../db/schema.ts';

const router = Router();
const aiEnabled = () => !!process.env.GEMINI_API_KEY && process.env.OCR_MOCK !== '1';

// ---------------------------------------------------------------------------
// Quick sale: "2 parle g, 1 oil, half kg rice" -> cart lines.
// AI only fills the cart. Nothing is sold until staff tap Complete, and the
// sale endpoint re-checks stock as usual.
// ---------------------------------------------------------------------------

const WORD_NUMBERS: Record<string, number> = { half: 0.5, quarter: 0.25, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12, ek: 1, do: 2, teen: 3, char: 4, paanch: 5 };

/** Rule-based fallback: split on commas/"and", read a leading number, fuzzy-match the rest. */
function parseWithRules(text: string, catalogue: ProductStockSummary[]) {
  const items: { productId: string; quantity: number }[] = [];
  const unmatched: string[] = [];
  for (const chunk of text.toLowerCase().split(/,|\band\b|\baur\b|\n|;/).map((s) => s.trim()).filter(Boolean)) {
    const m = chunk.match(/^(\d+(?:\.\d+)?|[a-z]+)\s*(?:x\s*)?(.*)$/);
    let qty = 1;
    let rest = chunk;
    if (m && (/^\d/.test(m[1]) || WORD_NUMBERS[m[1]] !== undefined)) {
      qty = /^\d/.test(m[1]) ? Number(m[1]) : WORD_NUMBERS[m[1]];
      rest = m[2];
    }
    rest = rest.replace(/^(kg|kgs|litre|litres|liter|l|pcs|pc|packet|packets|pack|box|boxes|of)\s+/g, '').trim();
    let best: ProductStockSummary | undefined;
    let score = 0;
    for (const p of catalogue) {
      const s = Math.max(nameSimilarity(rest, p.name), nameSimilarity(rest, p.sku));
      if (s > score) {
        score = s;
        best = p;
      }
    }
    if (best && score >= 0.4) items.push({ productId: best.id, quantity: qty });
    else unmatched.push(chunk);
  }
  return { items, unmatched };
}

router.post(
  '/parse-sale',
  handle(async (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 500);
    if (!text) return res.status(400).json({ error: 'EMPTY', message: 'Type or say what the customer is buying.' });
    const catalogue = ledgerEngine.listProducts(req.tenantId);
    const byId = new Map(catalogue.map((p) => [p.id, p]));

    let parsed: { items: { productId: string; quantity: number }[]; unmatched: string[] } | null = null;
    let source: 'ai' | 'rules' = 'rules';
    if (aiEnabled()) {
      try {
        const list = catalogue.map((p) => `${p.id} | ${p.name} | ${p.sku} | unit: ${p.unit}`).join('\n');
        const out = await geminiJson(
          [{
            text: `A shop assistant typed or spoke a customer's order (English, Hindi or Hinglish). Map it to products from this catalogue.
Only use productIds from the catalogue. Quantities are in the product's unit ("half kg" = 0.5, "dozen" = 12). If an item can't be matched confidently, put the original words in "unmatched".
Catalogue (productId | name | sku | unit):
${list}

Order: """${text}"""`,
          }],
          {
            type: 'OBJECT',
            properties: {
              items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { productId: { type: 'STRING' }, quantity: { type: 'NUMBER' } }, required: ['productId', 'quantity'] } },
              unmatched: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['items'],
          },
          FAST_MODELS,
          8_000
        );
        parsed = { items: Array.isArray(out?.items) ? out.items : [], unmatched: Array.isArray(out?.unmatched) ? out.unmatched.map(String) : [] };
        source = 'ai';
      } catch (e: any) {
        console.error('AI parse-sale failed, using rules:', e?.message);
      }
    }
    if (!parsed) parsed = parseWithRules(text, catalogue);

    // Never trust model output: keep only this business's products and sane quantities.
    const merged = new Map<string, number>();
    for (const it of parsed.items) {
      const p = byId.get(it.productId);
      const q = Number(it.quantity);
      if (!p || !(q > 0) || q > 10000) continue;
      if ((p.unit === 'pcs' || p.unit === 'box') && !Number.isInteger(q)) continue;
      merged.set(p.id, Math.round(((merged.get(p.id) || 0) + q) * 1000) / 1000);
    }
    res.json({
      source,
      items: [...merged].map(([productId, quantity]) => ({ productId, quantity })),
      unmatched: parsed.unmatched,
    });
  })
);

// ---------------------------------------------------------------------------
// Owner's daily brief: a short plain-English summary written ONLY from numbers
// the forecast engine already calculated. The AI never invents quantities.
// ---------------------------------------------------------------------------

const briefCache = new Map<string, { key: string; brief: string; source: 'ai' | 'rules'; at: number }>();

function rulesBrief(recs: ProductStockSummary[], todaySalesPaise: number, bills: number) {
  const parts: string[] = [];
  const urgent = recs.filter((r) => r.restockRecommendation.recommendedQuantity);
  if (urgent.length === 0) parts.push('Nothing needs reordering right now.');
  else {
    const top = urgent[0];
    parts.push(
      `${urgent.length} product${urgent.length > 1 ? 's need' : ' needs'} reordering. Most urgent: ${top.name} — ${top.currentStock} ${top.unit} left${top.predictedStockOutDate ? `, runs out around ${top.predictedStockOutDate}` : ''}; order ${top.restockRecommendation.recommendedQuantity}.`
    );
  }
  parts.push(`Today so far: ₹${(todaySalesPaise / 100).toFixed(2)} from ${bills} bill${bills === 1 ? '' : 's'}.`);
  return parts.join(' ');
}

router.get(
  '/brief',
  requireRole(['OWNER']),
  handle(async (req, res) => {
    const recs = ledgerEngine.listProducts(req.tenantId).filter((p) => p.restockRecommendation.needsRestock).sort((a, b) => (a.daysOfCover ?? 1e9) - (b.daysOfCover ?? 1e9));
    const m = ledgerEngine.getDashboardMetrics(req.tenantId);
    const facts = {
      today: istDate(),
      todaySalesRupees: (m.todaySalesPaise / 100).toFixed(2),
      bills: m.todayOrdersCount,
      outOfStock: m.outOfStockCount,
      needsReorder: recs.slice(0, 6).map((r) => ({
        name: r.name,
        stock: `${r.currentStock} ${r.unit}`,
        sellsPerDay: Math.round(r.salesVelocity * 10) / 10,
        runsOutAround: r.predictedStockOutDate,
        leadTimeDays: r.leadTimeDays,
        orderQuantity: r.restockRecommendation.recommendedQuantity,
      })),
    };
    const key = JSON.stringify(facts);
    const cached = briefCache.get(req.tenantId);
    if (cached && cached.key === key && Date.now() - cached.at < 10 * 60 * 1000) return res.json({ brief: cached.brief, source: cached.source });

    let brief = rulesBrief(recs, m.todaySalesPaise, m.todayOrdersCount);
    let source: 'ai' | 'rules' = 'rules';
    if (aiEnabled()) {
      try {
        const out = await geminiJson(
          [{
            text: `You are an assistant for the owner of a small Indian shop. Write a 2-3 sentence morning brief in simple English.
Lead with what to order today and why (stock-out before the supplier can deliver). Mention at most 3 products.
Use ONLY the facts below — do not invent numbers, products or advice about prices. Dates like 2026-11-01 should read "1 Nov".
Facts: ${key}`,
          }],
          { type: 'OBJECT', properties: { brief: { type: 'STRING' } }, required: ['brief'] },
          FAST_MODELS,
          8_000
        );
        if (typeof out?.brief === 'string' && out.brief.trim()) {
          brief = out.brief.trim().slice(0, 600);
          source = 'ai';
        }
      } catch (e: any) {
        console.error('AI brief failed, using rules:', e?.message);
      }
    }
    briefCache.set(req.tenantId, { key, brief, source, at: Date.now() });
    res.json({ brief, source });
  })
);

export default router;
