import React, { useEffect, useState } from 'react';
import { api, session } from '../lib/api';
import { Logo, Spinner } from '../components/ui';

const DEMO_PINS: Record<string, string> = { ramesh: '1234', priya: '5678', anita: '9999' };

export function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [accounts, setAccounts] = useState<{ username: string; name: string; role: string; businessName: string }[]>([]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.demoAccounts().then((r) => setAccounts(r.accounts)).catch(() => {});
  }, []);

  const submit = async (e?: React.FormEvent, id = identifier, pw = password) => {
    e?.preventDefault();
    if (!id || !pw) return setError('Enter your email or username and your password.');
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(id, pw);
      session.set(token);
      onLoggedIn();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-[#FBF8F3]">
      <a href="#/" className="mb-8">
        <Logo size={40} />
      </a>
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
        <p className="text-stone-500 mt-1">Owners and staff sign in here.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="u">Email or username</label>
            <input id="u" className="input" autoComplete="username" autoCapitalize="none" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@shop.com" />
          </div>
          <div>
            <label className="label" htmlFor="p">Password</label>
            <input id="p" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner className="w-4 h-4 text-white" /> : 'Log in'}
          </button>
        </form>
        <p className="text-sm text-stone-500 mt-5 text-center">
          New shop? <a href="#/signup" className="text-brand-700 font-medium">Create a business account</a>
        </p>
      </div>

      {accounts.length > 0 && (
        <div className="w-full max-w-md mt-6">
          <p className="text-sm font-medium text-stone-500 mb-2 px-1">Demo accounts: tap to sign in</p>
          <div className="space-y-2">
            {accounts.map((a) => (
              <button
                key={a.username}
                disabled={busy}
                onClick={() => {
                  setIdentifier(a.username);
                  setPassword(DEMO_PINS[a.username] || '');
                  submit(undefined, a.username, DEMO_PINS[a.username] || '');
                }}
                className="card w-full flex items-center gap-3 p-3.5 text-left hover:border-brand-200 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 grid place-items-center font-semibold">{a.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-stone-500 truncate">{a.role === 'OWNER' ? 'Owner' : 'Staff'} · {a.businessName}</p>
                </div>
                <span className="text-sm text-stone-400 tabular">{a.username} / {DEMO_PINS[a.username]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
