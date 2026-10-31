# StockPilot AI — Product Demo Video Script (2-3 Minutes)
**Challenge**: MedaVida 4-Hour AI-Assisted Hackathon  
**Target Video Duration**: 2 minutes 45 seconds  

---

## 🎬 Act 1: The Bharat Retail Crisis & Personas (0:00 - 0:35)
* **Visual**: Screen recording opens on `http://localhost:3000`. Clean, brutalist, sharp-edged industrial UI in deep emerald green and crisp white. Zero gradients. Zero border-radius.
* **Audio / Voiceover**:
  > "Meet Ramesh. He runs Ramesh General Store in Vadodara with 300 products across four suppliers, tracking everything in a notebook. Fast sellers like cooking oil run out before he notices, while slow items sit on shelves for months. Supplier bills pile up and stock counts are almost always wrong.
  >
  > Today, we built **StockPilot AI**—an institutional-grade double-entry inventory ledger with OCR invoice reconciliation and explainable predictive restocking."
* **Action**:
  - Show the top bar displaying **STORE: Ramesh General Store (KIRANA)** and **Ramesh (👑 OWNER)**.
  - Hover over the 5-column dashboard metrics showing Total Products, Low Stock alerts, and total stock valuation in ₹.

---

## 🎬 Act 2: Multi-Tenancy & Fast Staff POS (<15s Sale) (0:35 - 1:10)
* **Visual**: Click the Persona Switcher and switch to **Priya (Staff)**.
* **Audio / Voiceover**:
  > "StockPilot enforces strict server-level RBAC. Priya is staff. Notice the catalog: Priya can view stock, but cannot edit prices, delete products, or approve invoices.
  >
  > For checkout, our POS is designed for phone ergonomics—allowing staff to complete a sale in under 15 seconds."
* **Action**:
  - Click **POS SALE**.
  - Type "Oil" in the search box. Click to add 1 unit.
  - Type "Biscuits". Click to add 2 units.
  - Notice the bill summary calculating total in exact Paise (`₹155.00`).
  - Click **COMPLETE SALE (₹155.00)**.
  - Instant printable receipt modal appears with Receipt number and confirmation that the movement was written atomically to the ledger.

---

## 🎬 Act 3: Human-in-the-Loop OCR Invoice Import (1:10 - 1:50)
* **Visual**: Switch persona back to **Ramesh (👑 OWNER)**.
* **Audio / Voiceover**:
  > "Now let's solve Ramesh's invoice headache. Our rule: *OCR suggests, the owner confirms.* Nothing extracted touches the ledger until a human reviews it."
* **Action**:
  - Click **IMPORT INVOICE**.
  - Click **Gujarat Agro Foods (INV-GA-2026-981)** from the test presets.
  - Show the extracted table: Supplier, Invoice Date, and line items.
  - Highlight the fuzzy matching column: "Fortune Sunflower Oil" automatically matched to catalog SKU.
  - Point to the arithmetic cross-check: verifies $\text{Qty} \times \text{Price} = \text{Total}$ and $\sum \text{Lines} = \text{Invoice Total}$.
  - Click **CONFIRM & ADD TO STOCK**.
  - Toast appears: *"Invoice confirmed. 4 purchase ledger entries created."*
  - Show that Cooking Oil stock increased by exactly 24 units.

---

## 🎬 Act 4: Explainable Forecasting & Restock Math (1:50 - 2:20)
* **Visual**: Navigate to **Restock Forecast** tab.
* **Audio / Voiceover**:
  > "Every prediction in StockPilot comes from the product's own sales history and shows its working. Zero black-box guessing.
  >
  > Look at Cooking Oil. Our engine displays:
  > *'Sells 6.0/day, 9 left, 4-day lead time + 4-day buffer → order 48 (2 cartons of 24)'*.
  >
  > It calculates daily velocity, days of cover, predicts the exact stock-out date, and rounds up to the supplier's carton pack size. If an item has less than 7 days of history, it tags it as 'Cold Start' instead of hallucinating.
  >
  > Ramesh can export the purchase order directly to CSV or print it for his Gujarat wholesaler with one click."
* **Action**:
  - Point to the visible explanation card.
  - Click **EXPORT CSV** to show instant file generation.

---

## 🎬 Act 5: Live Test Lab — Concurrency & Security Proof (2:20 - 2:45)
* **Visual**: Click **TEST LAB** in the top navigation bar.
* **Audio / Voiceover**:
  > "Finally, let's see what happens when things go wrong. We built an embedded Verification Lab so judges can test our architecture live:
  >
  > Test 1: Concurrency Race Condition. Two workers try to sell the last single unit at the exact same millisecond. Running the test... Exactly one gets 200 OK, the other is rejected with 409 Conflict. Stock never goes negative.
  >
  > Test 2: Cross-Tenant Breach. Anita Medical attempts to fetch Ramesh's product ID. Server immediately enforces 403 Forbidden.
  >
  > Test 3: Duplicate Invoice. Re-submitting the same invoice is blocked to prevent double-crediting.
  >
  > StockPilot AI: Immutable ledger, explainable AI, zero float drift. Thank you!"

---
*End of video demonstration.*
