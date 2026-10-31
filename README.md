# StockPilot AI

An inventory app for small shops, built for the MedaVida intern hackathon. Ramesh runs a general store with about 300 products and keeps stock in a notebook. StockPilot AI keeps stock as a ledger of recorded movements, reads supplier invoices with Gemini, lets staff ring up a sale by typing or saying the order, and suggests what to reorder with the calculation shown.

## Run it

You need Node 20 or newer.

```bash
npm install
cp .env.example .env        # add GEMINI_API_KEY for the AI features
npm run dev:api             # API on http://localhost:3001
npm run dev:web             # UI on http://localhost:3000 (proxies /api)
npm test                    # API regression suite
```

For production, `npm run build && npm start` serves the built UI and the API from one process on `$PORT`. `render.yaml` deploys it to Render.

Data is saved to `data/state.json` after every change. Delete that file to reset to the demo data.

## Project layout

```
server/
  index.ts            Express app: routes, auth, serves the built UI
  db/ledger.ts        Stock ledger, sales, invoices, forecasting, audit log
  db/schema.ts        Types
  db/seed.ts          Demo businesses, users, products and 30 days of history
  middleware/auth.ts  Signed login tokens and role checks
  routes/             One file per API area (products, sales, invoices, forecast, ledger, ai)
  ai/gemini.ts        Gemini client with model fallback
  ai/invoiceOcr.ts    Invoice reading and file-type checks
src/
  pages/              One file per screen
  components/ui.tsx   Shared UI pieces
  lib/api.ts          API client and money/quantity formatting
tests/api.test.ts     End-to-end API tests
samples/              Test invoice images (made-up suppliers)
```

## Demo accounts

| User | PIN | Role | Business |
| --- | --- | --- | --- |
| `ramesh` | 1234 | Owner | Ramesh General Store |
| `priya` | 5678 | Staff | Ramesh General Store |
| `anita` | 9999 | Owner | Anita Medical (separate inventory) |

Sample invoices for testing OCR are in `samples/`. They use made-up suppliers. `invoice-2-fmcg.png` has a grand total that is ₹60 off, to show the mismatch warning.

## Where AI is used

Gemini (`gemini-3.8-flash` by default, set with `GEMINI_MODEL`) does three jobs. If that model is busy or retired, the server tries `gemini-3.5-flash` and then `gemini-flash-latest`.

1. Invoice scanning. It reads the supplier, invoice number, date, total and every line into a fixed JSON schema, in integer paise, and lists any field it could not read clearly. The owner reviews everything before stock changes.
2. Quick sale. Staff type or say an order such as "2 parle g, 1 oil, half kg rice" (English, Hindi or Hinglish) and the bill fills in. The model can only choose from that shop's own products, and the server drops anything it returns that isn't one. Filling the bill sells nothing; the sale still goes through the normal stock check when staff tap Complete.
3. Daily brief. The owner's dashboard shows a two or three sentence summary of what to order and why. It is written only from numbers the forecast already calculated.

Restock quantities are not produced by AI. They come from the formula below so anyone can check them. Every AI feature has a fallback: manual invoice entry, a rule-based order parser, and a rule-written brief.

## How the rules in the brief are enforced

Stock is a ledger. There is no stock column; current stock is the sum of movements (`PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`), and each one records who, when, quantity and reason. Editing a product cannot change its stock.

Money is stored as whole paise. The UI turns "135.50" into 13550 by parsing the text, without floating point, and shows ₹ with two decimals.

A sale or adjustment that would take stock below zero is rejected with HTTP 409. Two lines of the same product in one bill are added together before the check. `pcs` and `box` take whole numbers; `kg` and `litre` allow decimals.

Each sale checks every line first and then writes all its movements in one synchronous block. Node runs one callback at a time, so no other request can run between checking stock and writing the movement. When two requests try to buy the last 3 units, one gets 201 and the other gets 409; a test fires 8 at once to prove it. On several servers this check would move into a database transaction with a row lock.

Sales carry an `Idempotency-Key`, created once per bill in the UI, so a retried request returns the original receipt and stock changes once. Confirming the same invoice draft twice does nothing the second time, and a new upload with the same supplier and invoice number is refused.

Products with history are archived: hidden, not sellable, history kept. A product with no history is deleted. Manual adjustments are owner-only and need a reason.

The audit log records product changes, sales, returns, adjustments, invoice extraction and confirmation, CSV imports and settings changes.

Login returns an HMAC-signed token. Every request takes the user, role and business from that token only, never from headers or the URL. Another business's product returns 404, so the server doesn't even confirm the ID exists. Staff get 403 on prices, deletes, adjustments, invoices and the restock list.

## Invoice import

1. Upload a JPG, PNG or PDF up to 5 MB. The server checks the file's byte signature, not its extension.
2. Gemini extracts the invoice as described above.
3. Each line is matched to a product by SKU, then exact name, then word similarity of at least 0.5. Anything else is marked as a new product.
4. The review screen highlights unclear fields, recalculates each line, and flags lines where quantity × cost differs from the printed amount and invoices where the lines don't add up to the total. Every field is editable, including which product a line goes to.
5. Confirm checks every line before writing anything, so either all lines reach stock or none do.

Without a Gemini key, invoices can still be typed in through the same review and confirm screen.

## Forecasting

Each product uses its own sales: live sales minus returns, plus any imported history.

- Sales per day is the units sold in the last 14 days divided by 14, counting days with no sales. A newer product uses the days it has.
- Days of cover is stock divided by sales per day. The stock-out date is today plus the whole days of cover.
- A product is flagged when stock is at or below its reorder level, or when days of cover is at or below the supplier lead time. The flag clears by itself after restocking.
- Order quantity is sales per day × (lead time + target cover days) − stock, rounded up to the pack size and never negative. Target cover is a per-shop setting (4 days for Ramesh). If a product is flagged by its reorder level, the order is also large enough to keep stock above that level through the lead time.
- With less than 7 days of sales, the app says "Not enough history" and suggests no quantity.

Every suggestion shows its working. From the seed data: "Sells 6/day, 9 left, 4-day lead time + 4 days cover → order 48 (2 packs of 24)", calculated as 6 × (4 + 4) − 9 = 39, rounded up to packs of 24, which gives 48.

To load past sales, go to Restock and import a CSV with `date,sku,quantity`. Imported rows only feed the forecast and don't change current stock. Importing the same days again replaces them.

The reorder list can be downloaded as CSV or printed as a purchase order.

## Tests

`npm test` starts the API in memory with a fixed OCR result and runs end-to-end HTTP checks. They cover login and forged tokens, one business opening another's data by ID, staff permissions, editing fields that should be locked, input validation, overselling, simultaneous sales of the last units, retried requests, returns, duplicate and partly invalid invoices, the 6/day → 48 example, the not-enough-history case, CSV import, alerts clearing, the audit log, the dashboard and the AI quick-sale parser.

The owner's Test lab page runs the brief's failure cases from the browser against the live server.

## Stack

React 18, Vite and Tailwind with the Inter font. Express and TypeScript, run with `tsx`. Gemini over HTTPS. Data is kept in a JSON file, with no separate database server.

## Known limits

The app runs as a single server process (see the concurrency note above). A JSON file is fine for a demo but not for years of history across 300 products; Postgres would be next. Free hosting can wipe `data/` on redeploy, which resets the app to the demo data.
