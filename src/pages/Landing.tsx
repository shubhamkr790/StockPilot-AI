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

export function Landing({ onStart, onSignup }: { onStart: () => void; onSignup: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-20 bg-[#FBF8F3]/85 backdrop-blur border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <button onClick={onStart} className="btn-ghost btn-sm">Log in</button>
            <button onClick={onSignup} className="btn-primary btn-sm">Get started</button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 sm:px-6 pt-12 pb-14 md:pt-16 md:pb-20 text-center bg-[#FBF8F3]">
        {/* Soft cool glow behind the headline, warm glow behind the screenshot */}
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-[70%] w-[720px] h-[520px] rounded-full bg-brand-200/45 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-[42%] left-1/2 -translate-x-[10%] w-[760px] h-[520px] rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-600">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Built for kirana stores and pharmacies
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-stone-900 leading-[1.1]">
            Never run out of what <span className="text-brand-600">sells fastest</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto">
            StockPilot replaces the stock notebook. AI reads your supplier invoices, staff ring up a sale by typing or saying it, and you see exactly what to reorder and why.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onSignup} className="btn-primary h-12 px-7 text-base">
              Get started <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onStart} className="btn-outline h-12 px-7 text-base">
              Try the demo
            </button>
          </div>
          <p className="mt-3 text-sm text-stone-500">Create your shop in a minute, or use the demo accounts on the login page.</p>
        </div>

        {/* Real screenshot of the owner dashboard, framed like a browser window */}
        <div className="hero-shot relative max-w-5xl mx-auto mt-10 md:mt-12">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-1.5 sm:p-2 shadow-[0_30px_80px_-20px_rgba(30,91,79,0.35)]">
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
        </div>
      </section>

      <section className="px-4 sm:px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center">Everything a small shop needs</h2>
          <p className="text-stone-600 text-center mt-3 max-w-xl mx-auto">No spreadsheets. No guessing. Just an accurate stock count and a clear reorder list.</p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`card p-6 ${i % 2 ? 'bg-[#FFFCF7]' : 'bg-[#F7FBFA]'}`}>
                <div className={`w-11 h-11 rounded-xl grid place-items-center ${i % 2 ? 'bg-amber-100/70 text-amber-700' : 'bg-brand-100/70 text-brand-700'}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                <p className="mt-1.5 text-stone-600 text-[15px] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 sm:px-6 py-16 sm:py-20 bg-brand-800 text-center">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-[640px] h-[360px] rounded-full bg-brand-500/35 blur-3xl" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">See it with real data</h2>
          <p className="text-brand-100 mt-2">Sign in as Ramesh (owner), Priya (staff) or Anita (a separate pharmacy).</p>
          <button onClick={onStart} className="btn h-12 px-7 text-base mt-6 bg-white text-brand-800 hover:bg-brand-50">
            Open the demo <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-10 text-sm text-brand-200/70">StockPilot AI · MedaVida intern hackathon 2026</p>
        </div>
      </section>
    </div>
  );
}
