import { useState } from 'react';
import { CheckCircle2, XCircle, Play, Circle } from 'lucide-react';
import { api, ApiError, newKey } from '../lib/api';
import { PageHeader, Spinner } from '../components/ui';

type Result = { pass: boolean; detail: string };

/**
 * Each test makes real HTTP requests from this browser against the live API — the same
 * calls an attacker or a flaky network would make. Nothing is simulated on the server.
 */
const TESTS: { id: string; title: string; what: string; run: () => Promise<Result> }[] = [
  {
    id: 'race',
    title: 'Two staff sell the last units at the same moment',
    what: 'Creates an item with 3 in stock, then fires two "sell 3" requests in parallel (as Ramesh and as Priya).',
    run: async () => {
      const { product } = await api.createProduct({ name: `Test Lab item ${Date.now().toString().slice(-5)}`, sku: `LAB-${newKey().slice(0, 6)}`, unit: 'pcs', costPricePaise: 1000, sellingPricePaise: 1500, openingStock: 3, category: 'Test lab' });
      const priya = (await api.login('priya', '5678')).token;
      const sell = (asToken?: string) =>
        api.request('/api/sales', { method: 'POST', json: { items: [{ productId: product.id, quantity: 3 }] }, headers: { 'Idempotency-Key': newKey() }, asToken }).then(() => 201, (e: ApiError) => e.status);
      const codes = await Promise.all([sell(), sell(priya)]);
      const stock = (await api.product(product.id)).product.currentStock;
      await api.archiveProduct(product.id).catch(() => {});
      const ok = codes.filter((c) => c === 201).length === 1 && codes.includes(409) && stock === 0;
      return { pass: ok, detail: `Responses: ${codes.join(' and ')}. Final stock: ${stock}.` };
    },
  },
  {
    id: 'tenant',
    title: "Anita changes the URL to open Ramesh's product",
    what: "Signs in as Anita and requests Ramesh's sunflower oil by its ID.",
    run: async () => {
      const anita = (await api.login('anita', '9999')).token;
      const status = await api.request('/api/products/prod_oil_01', { asToken: anita }).then(() => 200, (e: ApiError) => e.status);
      return { pass: status === 404, detail: `Server answered ${status}${status === 404 ? ' — no data exposed.' : ''}` };
    },
  },
  {
    id: 'staff',
    title: 'Staff tries to change a price',
    what: 'Signs in as Priya and sends a price edit directly to the API (no button needed).',
    run: async () => {
      const priya = (await api.login('priya', '5678')).token;
      const status = await api.request('/api/products/prod_oil_01', { method: 'PUT', json: { sellingPricePaise: 1 }, asToken: priya }).then(() => 200, (e: ApiError) => e.status);
      return { pass: status === 403, detail: `Server answered ${status}.` };
    },
  },
  {
    id: 'dup',
    title: 'The same invoice is imported twice',
    what: 'Confirms a 5-unit invoice for Tata Salt, then submits the same supplier + invoice number again.',
    run: async () => {
      const no = `LAB-${Date.now()}`;
      const body = { supplierName: 'Test Lab Supplier', invoiceNumber: no, invoiceDate: new Date().toISOString().slice(0, 10), totalAmountPaise: 10500, lines: [{ rawName: 'Tata Salt', qty: 5, unitCostPaise: 2100, totalPaise: 10500 }] };
      const confirmBody = { ...body, items: [{ rawProductName: 'Tata Salt', matchedProductId: 'prod_salt_06', quantity: 5, unitPricePaise: 2100 }] };
      const before = (await api.product('prod_salt_06')).product.currentStock;
      const d1 = await api.manualDraft(body);
      await api.confirmInvoice(d1.draftInvoice.id, confirmBody);
      const d2 = await api.manualDraft(body);
      const status = await api.confirmInvoice(d2.draftInvoice.id, confirmBody).then(() => 200, (e: ApiError) => e.status);
      const replay = await api.confirmInvoice(d1.draftInvoice.id, confirmBody);
      const after = (await api.product('prod_salt_06')).product.currentStock;
      return {
        pass: !!d2.validation.duplicateOf && status === 409 && replay.alreadyConfirmed && after - before === 5,
        detail: `Warned before import: ${d2.validation.duplicateOf ? 'yes' : 'no'}. Second confirm: ${status}. Stock went ${before} → ${after} (+${after - before}).`,
      };
    },
  },
  {
    id: 'neg',
    title: 'Selling more than is in stock',
    what: 'Tries to sell 9,999 units of sunflower oil.',
    run: async () => {
      const before = (await api.product('prod_oil_01')).product.currentStock;
      const err = await api.sell([{ productId: 'prod_oil_01', quantity: 9999 }], newKey()).then(() => null, (e: ApiError) => e);
      const after = (await api.product('prod_oil_01')).product.currentStock;
      return { pass: err?.status === 409 && before === after, detail: err ? `${err.status}: ${err.message} Stock unchanged at ${after}.` : 'Sale was accepted!' };
    },
  },
  {
    id: 'retry',
    title: 'A sale request is sent twice (network retry)',
    what: 'Sends the same sale three times with one idempotency key.',
    run: async () => {
      const before = (await api.product('prod_salt_06')).product.currentStock;
      const key = newKey();
      const res = await Promise.all([1, 2, 3].map(() => api.sell([{ productId: 'prod_salt_06', quantity: 1 }], key)));
      const after = (await api.product('prod_salt_06')).product.currentStock;
      const receipts = new Set(res.map((r) => r.sale.receiptNumber));
      return { pass: receipts.size === 1 && before - after === 1, detail: `${receipts.size} receipt for 3 requests. Stock ${before} → ${after}.` };
    },
  },
  {
    id: 'file',
    title: 'Uploading a file that is not an invoice',
    what: 'Uploads a text file renamed to .png.',
    run: async () => {
      const err = await api.uploadInvoice(new File(['not an image'], 'invoice.png', { type: 'image/png' })).then(() => null, (e: ApiError) => e);
      return { pass: err?.status === 415, detail: err ? `${err.status}: ${err.message}` : 'File was accepted!' };
    },
  },
];

export function TestLab() {
  const [results, setResults] = useState<Record<string, Result | 'running'>>({});
  const run = async (t: (typeof TESTS)[number]) => {
    setResults((r) => ({ ...r, [t.id]: 'running' }));
    let res: Result;
    try {
      res = await t.run();
    } catch (e: any) {
      res = { pass: false, detail: `Error: ${e.message}` };
    }
    setResults((r) => ({ ...r, [t.id]: res }));
  };
  const runAll = async () => {
    for (const t of TESTS) await run(t);
  };

  return (
    <div>
      <PageHeader title="Test lab" subtitle="Run the failure cases from the brief against the live server." actions={<button className="btn-primary" onClick={runAll}><Play className="w-4 h-4" /> Run all</button>} />
      <div className="space-y-3">
        {TESTS.map((t) => {
          const r = results[t.id];
          return (
            <div key={t.id} className="card p-4 sm:p-5 flex items-start gap-4">
              <div className="mt-0.5">
                {r === 'running' ? <Spinner /> : !r ? <Circle className="w-5 h-5 text-stone-300" /> : r.pass ? <CheckCircle2 className="w-5 h-5 text-brand-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-stone-500 mt-0.5">{t.what}</p>
                {r && r !== 'running' && <p className={`text-sm mt-2 ${r.pass ? 'text-brand-700' : 'text-red-700'}`}>{r.pass ? 'Passed. ' : 'Failed. '}{r.detail}</p>}
              </div>
              <button className="btn-outline btn-sm" onClick={() => run(t)} disabled={r === 'running'}>Run</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
