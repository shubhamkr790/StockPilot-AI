# LinkedIn Submission Post Draft

**Copy and paste the text below directly into your LinkedIn post, attaching your recorded 2-3 minute demo video or link.**

---

Just wrapped up the intense 4-hour **MedaVida AI-Assisted Hackathon Challenge** building **StockPilot AI** — an institutional-grade retail inventory operating system engineered for Bharat commerce! 🚀

### 🛒 The Problem
In Vadodara, Ramesh runs a Kirana store with 300 products across four suppliers, tracking everything in a paper notebook. High-velocity goods like cooking oil run out before he notices, slow-moving items tie up working capital, and piles of handwritten supplier invoices cause inventory drift. 

### 💡 What I Built: StockPilot AI
Instead of building generic CRUD software, I architected StockPilot AI around financial-grade rigor:

1. **Immutable Double-Entry Movement Ledger**: Stock is never an overwritable number (`stock = stock - 5`). Every change is a recorded movement (`PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`) with an immutable reason and audit log. Stock can never go negative.
2. **Paise-Integer Financial Accounting**: All currency is stored strictly in integer Paise (₹135.00 = 13500 paise) eliminating IEEE-754 floating-point drift.
3. **High-Concurrency Race-Condition Defense**: Keyed mutex locks guarantee that if two staff members sell the last unit of Cooking Oil at the exact same millisecond, only ONE transaction commits with 200 OK while the competitor receives an explicit 409 Conflict.
4. **Human-in-the-Loop OCR Invoicing**: *"OCR suggests; the owner confirms."* Ingests supplier invoices, fuzzy-matches line items to catalog SKUs, cross-checks arithmetic totals, and detects duplicate invoices before atomic confirmation.
5. **Explainable Predictive Replenishment**: No black-box AI. Real daily velocity, days of cover, predicted stock-out dates, and supplier pack size rounding with visible plain-English rationale:
   *"Sells 6.0/day, 9 left, 4-day lead time + 4-day buffer → order 48 (2 cartons of 24)"*
6. **Zero-Slop Brutalist Precision UI**: Zero rounded corners (`border-radius: 0px`), zero gradients, zero blue, powered by a high-density emerald/forest terminal aesthetic. Staff can complete a POS sale on mobile in under 15 seconds.

### 🎥 Watch the Demo & Live Test Lab
Check out the video below where I demonstrate:
- Fast Staff POS checkout (<15 seconds)
- OCR invoice upload, reconciliation & duplicate protection
- Predictive restock recommendations with formula breakdown
- The live **Test Lab** proving atomic race-condition defense and server-enforced tenant isolation (Ramesh Kirana vs Anita Medical)!

A huge thank you to the MedaVida leadership team for putting together this exhilarating challenge!

**Tags**:
@MedaVida @Christina Camacho @Mallikarjuna Mudiam @Mahesh Das

#MedaVida #StockPilotAI #Hackathon #InventoryManagement #FinTech #HealthTech #AI #TypeScript #React #SupplyChain #RetailTech #EngineeringExcellence
