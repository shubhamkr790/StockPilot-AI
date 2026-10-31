import { ArrowRight, FileScan, LineChart, ShieldCheck, Smartphone, BookLock, Users } from 'lucide-react';
import { Logo } from '../components/ui';

const FEATURES = [
  { icon: FileScan, title: 'Invoices in, not typed in', body: 'Snap a supplier bill. We read the lines, match them to your products, and you confirm before stock changes.' },
  { icon: LineChart, title: 'Restock you can check', body: '"Sells 6/day, 9 left, 4-day lead time → order 48." Every suggestion shows its working.' },
  { icon: BookLock, title: 'Stock is a ledger', body: 'Every change is a recorded sale, purchase, return or adjustment — with who, when and why.' },
  { icon: Smartphone, title: 'A sale in seconds', body: 'Staff search, tap, and complete a bill on their phone. Stock updates instantly.' },
  { icon: ShieldCheck, title: 'Safe under pressure', body: 'Two staff selling the last unit at once? Only one succeeds. Stock never goes negative.' },
  { icon: Users, title: 'Owner and staff roles', body: 'Staff sell and view stock. Prices, deletions and invoice approval stay with the owner.' },
];

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <button onClick={onStart} className="btn-primary btn-sm">
            Sign in
          </button>
        </div>
      </nav>

      <section className="px-4 sm:px-6 pt-12 pb-12 md:pt-16 md:pb-16 text-center bg-gradient-to-b from-white to-canvas">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-600">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Built for kirana stores and pharmacies
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-stone-900 leading-[1.1]">
            Never run out of what <span className="text-brand-600">sells fastest</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto">
            StockPilot replaces the stock notebook: read supplier invoices with OCR, record sales in seconds, and know exactly what to reorder — and why.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onStart} className="btn-primary h-12 px-7 text-base">
              Try the demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-3 text-sm text-stone-500">Demo accounts for owner and staff are on the sign-in page.</p>
        </div>

        {/* Real screenshot of the owner dashboard, framed like a browser window */}
        <div className="max-w-5xl mx-auto mt-10 md:mt-12 rounded-2xl border border-stone-200 bg-white p-1.5 sm:p-2 shadow-pop">
          <div className="flex items-center gap-1.5 px-2.5 pt-1 pb-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            <span className="ml-3 hidden sm:block flex-1 max-w-xs rounded-md bg-stone-100 px-3 py-1 text-left text-xs text-stone-400">stockpilot · Ramesh General Store</span>
          </div>
          <img
            src="/dashboard.webp"
            width={2880}
            height={1800}
            alt="StockPilot owner dashboard: stock counts, today's sales, and a reorder list explaining each suggestion"
            className="w-full h-auto rounded-xl border border-stone-100"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="px-4 sm:px-6 py-20 bg-canvas">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center">Everything a small shop needs</h2>
          <p className="text-stone-600 text-center mt-3 max-w-xl mx-auto">No spreadsheets. No guessing. Just an accurate stock count and a clear reorder list.</p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                <p className="mt-1.5 text-stone-600 text-[15px] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-16 bg-white border-t border-stone-100 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">See it with real data</h2>
        <p className="text-stone-600 mt-2">Sign in as Ramesh (owner), Priya (staff) or Anita (a separate pharmacy).</p>
        <button onClick={onStart} className="btn-primary h-12 px-7 text-base mt-6">
          Open the demo <ArrowRight className="w-4 h-4" />
        </button>
        <p className="mt-10 text-sm text-stone-400">StockPilot · MedaVida intern hackathon 2026</p>
      </section>
    </div>
  );
}
