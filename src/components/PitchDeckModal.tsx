import React, { useState } from 'react';
import { 
  Presentation, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  X, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  Lock, 
  Zap, 
  Bug, 
  Sparkles 
} from 'lucide-react';

interface PitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PitchDeckModal: React.FC<PitchDeckModalProps> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      slideNo: 1,
      title: 'Problem & Context',
      subtitle: 'The Kirana & Pharmacy Inventory Crisis in Vadodara',
      content: (
        <div className="space-y-4">
          <div className="border-l-4 border-[#047857] pl-3 py-1 bg-[#F9FAF9]">
            <p className="text-sm font-semibold text-[#111814]">
              Ramesh runs a general store in Vadodara with ~300 items across 4 suppliers, tracking inventory in a paper notebook.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#DC2626] block mb-1">1. Fast Sellers Stock Out</strong>
              <span>Cooking oil and biscuits run dry before anyone notices. Missed revenue daily.</span>
            </div>
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#D97706] block mb-1">2. Capital Trapped</strong>
              <span>Slow items sit on shelves for months due to blind re-ordering.</span>
            </div>
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">3. Manual Invoicing Chaos</strong>
              <span>Supplier bills pile up and are keyed in manually, guaranteeing stock errors.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      slideNo: 2,
      title: 'The Solution: StockPilot AI',
      subtitle: 'Double-Entry Retail Ledger Operating System',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#111814]">
            StockPilot AI transforms inventory from an error-prone editable number into an <strong>immutable double-entry movement ledger</strong> coupled with explainable predictive restocking.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-[#0F392B] text-white p-3 border border-[#0A251C]">
              <strong className="text-emerald-300 block mb-1">Strict Movement Ledger</strong>
              <span>Stock changes only through recorded movements (Purchase, Sale, Return, Adjustment). Stock can never be typed over or go negative.</span>
            </div>
            <div className="bg-[#0F392B] text-white p-3 border border-[#0A251C]">
              <strong className="text-emerald-300 block mb-1">Paise-Integer Accounting</strong>
              <span>Zero floating-point math. All money is stored as integer paise to prevent fractional cents drift across retail volumes.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      slideNo: 3,
      title: 'Interactive Screens & Roles',
      subtitle: 'Server-Enforced Multi-Tenancy & Role-Based Access Control',
      content: (
        <div className="space-y-3 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <div className="font-bold text-[#0F392B] mb-1">👑 Store Owner (Ramesh Patel / Anita Shah)</div>
              <ul className="list-disc list-inside space-y-1 text-[#637069]">
                <li>Executive overview & restock action board on screen 1</li>
                <li>Add/edit products, pricing, pack sizes, and supplier lead times</li>
                <li>Upload and approve purchase invoices via OCR</li>
                <li>Perform manual stock adjustments with mandatory audit reason</li>
              </ul>
            </div>
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <div className="font-bold text-[#047857] mb-1">⚡ Counter Staff (Priya)</div>
              <ul className="list-disc list-inside space-y-1 text-[#637069]">
                <li>Ultra-fast Mobile POS: Record sales in under 15 seconds</li>
                <li>Lookup catalog and check live available stock</li>
                <li>Strictly forbidden from editing prices, deleting SKUs, or approving invoices</li>
                <li>Server enforces 403 Forbidden on unauthorized mutating routes</li>
              </ul>
            </div>
          </div>
          <div className="bg-[#F0F2F0] p-2 border border-[#D8DDD8] text-[11px]">
            <strong>Tenant Isolation:</strong> Anita Medical and Ramesh General Store share one DB with strict server-level query scoping. URL tampering yields instant 403 Forbidden.
          </div>
        </div>
      ),
    },
    {
      slideNo: 4,
      title: 'OCR Invoice Pipeline',
      subtitle: '“OCR Suggests; The Owner Confirms”',
      content: (
        <div className="space-y-3 text-xs font-mono">
          <p className="text-[#111814]">
            Nothing extracted by AI modifies inventory until reviewed and approved by the store owner.
          </p>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="card-sharp p-2 bg-white border border-[#D8DDD8]">
              <strong className="block text-[#0F392B]">1. Upload</strong>
              <span>JPG, PNG, PDF (max 5MB). Invalid types rejected.</span>
            </div>
            <div className="card-sharp p-2 bg-white border border-[#D8DDD8]">
              <strong className="block text-[#0F392B]">2. Vision OCR</strong>
              <span>Extracts supplier, invoice #, date, line items.</span>
            </div>
            <div className="card-sharp p-2 bg-white border border-[#D8DDD8]">
              <strong className="block text-[#0F392B]">3. Fuzzy Match</strong>
              <span>Matches lines to catalog SKUs or flags as NEW.</span>
            </div>
            <div className="card-sharp p-2 bg-white border border-[#D8DDD8]">
              <strong className="block text-[#0F392B]">4. Atomic Batch</strong>
              <span>Confirms all items in single transaction; stock updates.</span>
            </div>
          </div>
          <div className="bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] p-2 text-[11px]">
            <strong>Safety Guards:</strong> Line totals verified (Qty × Unit Price = Total). Duplicate invoices flagged to prevent double-crediting.
          </div>
        </div>
      ),
    },
    {
      slideNo: 5,
      title: 'Forecast Logic & Restocking',
      subtitle: 'Explainable Mathematics: Zero Black-Box Guessing',
      content: (
        <div className="space-y-3 text-xs font-mono">
          <div className="bg-[#F9FAF9] p-3 border border-[#D8DDD8] space-y-1">
            <div className="font-bold text-[#0F392B]">The Replenishment Equation:</div>
            <div>• Sales Velocity (V) = Units sold ÷ 14-day rolling window</div>
            <div>• Days of Cover (DoC) = Current Stock ÷ Velocity</div>
            <div>• Target Inventory = Velocity × (Lead Time + 4-day Buffer)</div>
            <div>• Recommended Qty = Ceil(Deficit ÷ Pack Size) × Pack Size</div>
          </div>
          <div className="bg-[#0F392B] text-white p-3 border border-[#0A251C]">
            <div className="text-emerald-300 font-bold mb-1">Exact Verification Example:</div>
            <div className="text-white text-sm">
              "Sells 6.0/day, 9 left, 4-day lead time + 4-day buffer → order 48 (2 cartons of 24)"
            </div>
          </div>
          <div className="text-[#637069] text-[11px]">
            Cold Start Protection: If sales history &lt; 7 days, explicitly labeled "Not enough history".
          </div>
        </div>
      ),
    },
    {
      slideNo: 6,
      title: 'Edge Cases & Defense Architecture',
      subtitle: 'Race Conditions, Repeated Requests, and Negative Stock Defense',
      content: (
        <div className="space-y-3 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">Concurrency Mutex Locking</strong>
              <span>Two staff selling the last unit simultaneously: Only 1 transaction commits; competitor receives 409 Conflict.</span>
            </div>
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">Idempotency Keys</strong>
              <span>Network retry on slow 4G connections returns existing receipt without double-deducting stock.</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">Negative Stock Guard</strong>
              <span>Attempting to sell more than available ledger balance immediately aborts and rolls back.</span>
            </div>
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">Soft Archival</strong>
              <span>Deleting products archives them (`is_archived = 1`), preserving past audit logs and sales intact.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      slideNo: 7,
      title: 'The Hardest Bug & Architectural Pivot',
      subtitle: 'Eliminating Fractional Cents Drift and Concurrency Race Traps',
      content: (
        <div className="space-y-3 text-xs font-mono">
          <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
            <strong className="text-[#DC2626] block mb-1">The Bug: IEEE-754 Floating Point Accumulation</strong>
            <p className="text-[#637069]">
              In testing high-volume sales of fractional items (like 0.70 INR per 100g dal), standard JS/DB floats drifted (`0.70 * 100 = 69.99999999999999`). Across 10,000 monthly transactions, books failed financial reconciliation.
            </p>
          </div>
          <div className="card-sharp p-3 bg-[#F0FDF4] border border-[#047857]">
            <strong className="text-[#047857] block mb-1">The Pivot: Pure Integer Paise & Atomic Movement Ledger</strong>
            <p className="text-emerald-950">
              Shifted 100% of money storage to integer Paise (e.g. ₹10.50 = 1050 paise) and replaced mutable stock counts with an event-sourced movement journal. Zero drift. Flawless mathematical certainty.
            </p>
          </div>
        </div>
      ),
    },
    {
      slideNo: 8,
      title: 'Future Roadmap & Production Scaling',
      subtitle: 'From Single Kirana to Bharat-Wide Retail Commerce Engine',
      content: (
        <div className="space-y-3 text-xs font-mono">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">1. Supplier WhatsApp Bot</strong>
              <span>1-click dispatch of restock purchase orders via WhatsApp Business API directly to Gujarat wholesalers.</span>
            </div>
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">2. Hardware Barcode Integration</strong>
              <span>WebHID scanner integration for sub-second laser barcode scanning on counter POS.</span>
            </div>
            <div className="card-sharp p-3 bg-white border border-[#D8DDD8]">
              <strong className="text-[#0F392B] block mb-1">3. Multi-Store Stock Transfers</strong>
              <span>Inter-branch ledger transfers for regional Kirana and Pharmacy retail chains.</span>
            </div>
          </div>
          <div className="bg-[#0F392B] text-white p-3 text-center font-bold">
            Built for MedaVida • Architected for Scale • Ready for Production
          </div>
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-6 select-none">
      <div 
        className="card-sharp bg-white border border-[#0F392B] w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl"
        style={{ borderRadius: '0px' }}
      >
        {/* Pitch Deck Header */}
        <div className="bg-[#0F392B] text-white p-3.5 flex items-center justify-between border-b border-[#0A251C]">
          <div className="flex items-center space-x-2">
            <Presentation className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider">
              StockPilot AI — Pitch Deck (8 Slides)
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.print()}
              className="btn-sharp bg-white hover:bg-emerald-50 text-[#0F392B] border border-white text-xs font-mono py-1 px-3 flex items-center space-x-1.5 font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT TO PDF</span>
            </button>
            <button onClick={onClose} className="text-white hover:text-emerald-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Canvas */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between bg-white">
          <div className="space-y-4">
            <div className="border-b border-[#D8DDD8] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#047857] font-bold">
                  SLIDE {slides[currentSlide].slideNo} OF 8
                </span>
                <h1 className="text-2xl font-black text-[#0F392B] font-mono tracking-tight">
                  {slides[currentSlide].title}
                </h1>
                <h2 className="text-xs text-[#637069] font-mono mt-0.5">
                  {slides[currentSlide].subtitle}
                </h2>
              </div>
              <div className="w-8 h-8 bg-[#0F392B] text-white flex items-center justify-center font-mono font-bold text-xs">
                {slides[currentSlide].slideNo}
              </div>
            </div>

            <div className="pt-2">
              {slides[currentSlide].content}
            </div>
          </div>

          {/* Slide Navigation Controls */}
          <div className="border-t border-[#D8DDD8] pt-4 mt-6 flex items-center justify-between">
            <button
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide(currentSlide - 1)}
              className="btn-sharp bg-white hover:bg-neutral-100 text-[#111814] border border-[#D8DDD8] text-xs font-mono py-1.5 px-3 flex items-center space-x-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>PREVIOUS</span>
            </button>

            <div className="flex items-center space-x-1">
              {slides.map((s, idx) => (
                <button
                  key={s.slideNo}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-6 h-6 text-[10px] font-mono font-bold border ${
                    currentSlide === idx
                      ? 'bg-[#0F392B] text-white border-[#0F392B]'
                      : 'bg-white text-[#637069] border-[#D8DDD8] hover:border-[#0F392B]'
                  }`}
                >
                  {s.slideNo}
                </button>
              ))}
            </div>

            <button
              disabled={currentSlide === slides.length - 1}
              onClick={() => setCurrentSlide(currentSlide + 1)}
              className="btn-sharp bg-[#0F392B] hover:bg-[#0A251C] text-white border border-[#0A251C] text-xs font-mono py-1.5 px-3 flex items-center space-x-1 disabled:opacity-40"
            >
              <span>NEXT</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
