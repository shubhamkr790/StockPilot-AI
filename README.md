# StockPilot AI — Smart Inventory & Replenishment Operating System
> **MedaVida Intern Hackathon Challenge: 4-Hour AI-Assisted Development**  
> *Target: 1st Place Submission | Vadodara Retail Context (Kirana & Pharmacy)*

StockPilot AI is an institutional-grade retail inventory operating system designed specifically for Indian small businesses (Ramesh General Store & Anita Medical). It enforces an **immutable double-entry stock movement ledger**, eliminates floating-point drift with **Paise-integer accounting**, protects against overselling via **concurrency mutex locks**, and implements **explainable predictive replenishment**.

---

## 🌟 Key Capabilities & Architectural Pillars

### 1. Strict Stock Movement Ledger (§02)
- Stock is **never** a mutable scalar number that someone types over.
- Quantity changes strictly through recorded movements: `PURCHASE`, `SALE`, `RETURN`, or `ADJUSTMENT`.
- Every movement records **who, when, quantity, and reason**.
- **No Negative Stock**: Sales exceeding available inventory are aborted and rolled back before writing.
- **Fractional Quantities**: Supported only for continuous units like `kg` or `litre`; discrete units (`pcs`, `box`) enforce integer quantities.
- **Paise Integer Financial Accounting**: All currency is stored in **paise as integers** (e.g. ₹135.00 = `13500` paise). Formatted with ₹ and two decimals. Zero IEEE-754 floating-point drift.

### 2. High-Concurrency & Race-Condition Defense (§02, §06)
- When two staff members attempt to sell the last unit of a product simultaneously, atomic check-and-decrement mutex locks ensure **exactly one transaction commits** with `200 OK`, while the competitor receives an explicit `409 Conflict: Insufficient stock`.
- **Idempotency Keys**: POS sales and invoice imports verify idempotency keys to prevent repeated-request double-stocking.

### 3. Server-Enforced Multi-Tenancy & RBAC (§01, §05, §06)
- **Tenant Isolation**: Ramesh General Store (`biz_ramesh_01`) and Anita Medical (`biz_anita_02`) share one database, but queries are strictly scoped on the server. Tampering with product IDs across businesses triggers an immediate `403 Forbidden: Tenant Isolation Violation`.
- **Role-Based Access Control**:
  - `OWNER` (Ramesh, Anita): Add/edit/archive products, modify prices, set lead times, perform manual stock adjustments with mandatory reason, upload and confirm invoices.
  - `STAFF` (Priya): High-speed POS counter checkout (<15s) and stock view. Server denies attempts by staff to modify prices or confirm invoices.

### 4. Human-in-the-Loop OCR Invoice Import (§03)
- *"OCR suggests; the owner confirms."*
- Uploads purchase invoices (JPG, PNG, PDF up to 5MB).
- Extracts supplier name, invoice number, date, and line items.
- **Fuzzy SKU Matching**: Automatically matches extracted lines to catalog items via token-sort similarity or flags as a new product.
- **Arithmetic Cross-Check**: Flags discrepancies where $\text{Qty} \times \text{Unit Cost} \ne \text{Line Total}$ or $\sum \text{Line Totals} \ne \text{Invoice Total}$.
- **Duplicate Protection**: Alerts if the invoice was previously confirmed, blocking double inventory crediting.
- **Atomic Confirmation**: All approved lines are added to the stock ledger in a single atomic transaction.

### 5. Explainable Predictive Forecasting & Replenishment (§04)
- **Sales Velocity ($V$)**: Rolling daily average over a 14-day window:
  $$V = \frac{\sum_{t=1}^{14} \text{Units Sold}}{14}$$
- **Days of Cover ($DoC$)**:
  $$\text{Days of Cover} = \frac{\text{Current Stock}}{V}$$
- **Predicted Stock-Out Date**: $\text{Current Date} + \lceil DoC \rceil \text{ days}$.
- **Reorder Point ($ROP$)**: Alert raised when $\text{Stock} \le \text{Reorder Level}$ OR $DoC \le \text{Lead Time}$.
- **Recommended Order Quantity ($Q$)**:
  $$Q = \left\lceil \frac{\max(0, V \times (\text{Lead Time} + \text{Safety Buffer}) - \text{Current Stock})}{\text{Pack Size}} \right\rceil \times \text{Pack Size}$$
- **Visible Math Rationale**:
  `"Sells 6.0/day, 9 left, 4-day lead time + 4-day buffer → order 48 (2 cartons of 24)"`
- **Cold Start Rule**: Products with $< 7$ days of sales history are tagged *"Not enough history"* instead of making blind guesses.
- **Judge Speed Testing**: 1-click **"Seed 30-Day Sales Data"** button and CSV export.

### 6. Design System: Brutalist Industrial Precision
- **Strictly 0px Border-Radius**: Sharp, institutional, precision-cut corners on all cards, buttons, modals, tabs, tables, and inputs.
- **Strictly Zero Gradients**: Pure solid flat high-contrast surfaces.
- **Strictly Zero Blue Branding**: Curated deep emerald (`#0F392B`), forest green (`#047857`), stark canvas white, and JetBrains Monospace accents.
- **Mobile POS Speed**: Staff can ring up a sale in under 15 seconds.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS (configured with 0px sharp edges & emerald tokens), Lucide Icons.
- **Backend**: Node.js & Express REST API, TypeScript, Multer (multipart invoice uploads).
- **Ledger Engine**: In-memory double-entry event journal with keyed async mutex locks and atomic rollback.
- **OCR Engine**: Multimodal Vision parser with heuristic token-matching and preset demonstration fallback.

---

## 🚀 Quick Setup & Run Instructions

### Prerequisites
- Node.js v18+ or Bun v1.0+
- npm or bun

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/medavida-stockpilot.git
cd medavida-stockpilot
bun install # or npm install
```

### 2. Start Dev Servers (Backend + Frontend)
```bash
# Runs Express API on :3001 and Vite UI on :3000
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## 👥 Demo Accounts for Judges

Use the **Persona Switcher** in the top navigation bar to test roles with 1 click:

| Name | Role | Business Tenant | Credentials / PIN | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Ramesh** | `OWNER` | Ramesh General Store (Kirana) | `PIN: 1234` | Full access: Add/edit products, adjust stock, upload/confirm invoices, export restock orders. |
| **Priya** | `STAFF` | Ramesh General Store (Kirana) | `PIN: 5678` | Fast POS sale (<15s), stock lookup. Cannot edit prices, delete items, or confirm invoices. |
| **Anita** | `OWNER` | Anita Medical (Pharmacy) | `PIN: 9999` | 100% isolated pharmacy inventory. Cannot access Ramesh's products. |

---

## 🧪 Live Hackathon Verification Lab (Test Suite)

Judges can click the **TEST LAB** button in the top navigation bar to execute 5 real-time server verification assertions:

1. ⚡ **High-Concurrency Race Condition**: Spawns 2 competing concurrent sale requests for a 1-unit stock item; proves one gets 200 OK and the other gets 409 Conflict.
2. 🛡️ **Cross-Tenant Security Breach**: Attempts to access Ramesh's Cooking Oil using Anita's session token; server proves instant 403 Forbidden.
3. 📋 **Duplicate Invoice Protection**: Confirms the same invoice twice; server blocks duplicate stock crediting.
4. 🛑 **Negative Stock Guard**: Attempts a 9,999-unit sale; server rolls back before writing.
5. 🪙 **Zero-Drift Paise Audit**: Proves integer Paise prevents fractional cents leakage across retail volumes.

---

## 📄 Hackathon Deliverables

- **Slides Deck**: Click **SLIDES** in the app bar to view the 8-slide presentation deck or export directly to PDF.
- **Demo Video Script**: See [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md) for the 2-3 minute timed walkthrough.
- **LinkedIn Post**: See [LINKEDIN_POST.md](LINKEDIN_POST.md) for the official submission post tagging MedaVida leadership.

---
*Built with ❤️ for MedaVida Intern Hackathon Challenge 2026.*
