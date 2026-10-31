import React, { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, ShoppingCart, Package, FileText, PackagePlus, History, FlaskConical, LogOut, Users, Menu } from 'lucide-react';
import { api, session, Me } from './lib/api';
import { Logo, Spinner, ToastProvider } from './components/ui';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sell } from './pages/Sell';
import { Products } from './pages/Products';
import { Invoices } from './pages/Invoices';
import { Restock } from './pages/Restock';
import { Activity } from './pages/Activity';
import { TestLab } from './pages/TestLab';
import { Signup } from './pages/Signup';
import { Staff } from './pages/Staff';

export type Route = 'dashboard' | 'sell' | 'products' | 'invoices' | 'restock' | 'staff' | 'activity' | 'testlab';

const NAV: { id: Route; label: string; icon: React.ElementType; ownerOnly?: boolean; mobile?: boolean }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutGrid, mobile: true },
  { id: 'sell', label: 'Sell', icon: ShoppingCart, mobile: true },
  { id: 'products', label: 'Products', icon: Package, mobile: true },
  { id: 'invoices', label: 'Invoices', icon: FileText, ownerOnly: true, mobile: true },
  { id: 'restock', label: 'Restock', icon: PackagePlus, ownerOnly: true, mobile: true },
  { id: 'staff', label: 'Staff', icon: Users, ownerOnly: true },
  { id: 'activity', label: 'Activity', icon: History, ownerOnly: true },
  { id: 'testlab', label: 'Test lab', icon: FlaskConical, ownerOnly: true },
];

function useHashRoute(): [string, (r: string) => void] {
  const read = () => window.location.hash.replace(/^#\/?/, '') || '';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (r: string) => (window.location.hash = `/${r}`)];
}

export default function App() {
  return (
    <ToastProvider>
      <Root />
    </ToastProvider>
  );
}

function Root() {
  const [route, go] = useHashRoute();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!session.token);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('stockpilot_sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('stockpilot_sidebar', c ? 'open' : 'collapsed');
      } catch {
        /* storage blocked: keep it for this visit only */
      }
      return !c;
    });

  const logout = useCallback(() => {
    session.set(null);
    setMe(null);
    go('login');
  }, []);

  const loadMe = useCallback(async () => {
    if (!session.token) return setLoading(false);
    try {
      setMe(await api.me());
    } catch {
      session.set(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    session.onUnauthorized(logout);
    loadMe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner className="w-7 h-7" />
      </div>
    );
  }

  if (!me) {
    if (route === 'login') return <Login onLoggedIn={async () => { await loadMe(); go('dashboard'); }} />;
    if (route === 'signup') return <Signup onSignedUp={async () => { await loadMe(); go('dashboard'); }} />;
    return <Landing onStart={() => go('login')} onSignup={() => go('signup')} />;
  }

  const isOwner = me.user.role === 'OWNER';
  const nav = NAV.filter((n) => isOwner || !n.ownerOnly);
  let current = (nav.find((n) => n.id === route)?.id || 'dashboard') as Route;

  const page = {
    dashboard: <Dashboard me={me} go={go} />,
    sell: <Sell />,
    products: <Products me={me} />,
    invoices: <Invoices />,
    restock: <Restock me={me} onSettingsChanged={loadMe} />,
    staff: <Staff />,
    activity: <Activity />,
    testlab: <TestLab />,
  }[current];

  return (
    <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
      {/* Desktop sidebar; the ☰ button collapses it to icons only */}
      <aside className={`no-print hidden lg:flex fixed inset-y-0 left-0 flex-col border-r border-stone-200 bg-white transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <div className={`h-16 flex items-center border-b border-stone-200 ${collapsed ? 'justify-center' : 'justify-between pl-5 pr-3'}`}>
          {!collapsed && <Logo />}
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              title={collapsed ? n.label : undefined}
              className={`w-full flex items-center rounded-xl h-11 text-[15px] transition-colors ${collapsed ? 'justify-center' : 'gap-3 px-3'} ${
                current === n.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <n.icon className="w-5 h-5 shrink-0" />
              {!collapsed && n.label}
            </button>
          ))}
        </nav>
        <div className={`border-t border-stone-200 ${collapsed ? 'p-3' : 'p-4'}`}>
          {!collapsed && (
            <>
              <p className="text-sm font-medium text-stone-900 truncate">{me.user.name}</p>
              <p className="text-[13px] text-stone-500 truncate">
                {isOwner ? 'Owner' : 'Staff'} · {me.business.name}
              </p>
            </>
          )}
          <button onClick={logout} title="Sign out" className={`btn-outline btn-sm w-full ${collapsed ? 'px-0' : 'mt-3'}`}>
            <LogOut className="w-4 h-4" /> {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="no-print lg:hidden sticky top-0 z-30 h-16 flex items-center justify-between px-4 border-b border-stone-200 bg-canvas/95 backdrop-blur">
        <Logo size={34} />
        <div className="flex items-center gap-1">
          <span className="text-[13px] text-stone-500 mr-1 max-w-[9rem] truncate">{me.user.name.split(' ')[0]} · {isOwner ? 'Owner' : 'Staff'}</span>
          <button onClick={logout} className="p-2.5 rounded-xl text-stone-600 hover:bg-stone-100" aria-label="Sign out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 lg:pt-10 pb-28 lg:pb-12">{page}</main>

      {/* Mobile bottom tabs */}
      <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {nav.filter((n) => n.mobile).map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={`flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[12px] ${current === n.id ? 'text-brand-600 font-medium' : 'text-stone-500'}`}
            >
              <n.icon className="w-6 h-6" strokeWidth={current === n.id ? 2.2 : 1.8} />
              {n.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
