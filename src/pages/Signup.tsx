import React, { useState } from 'react';
import { api, session } from '../lib/api';
import { Logo, Spinner } from '../components/ui';

export function Signup({ onSignedUp }: { onSignedUp: () => void }) {
  const [f, setF] = useState({ name: '', businessName: '', businessType: 'KIRANA', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.businessName.trim() || !f.email.trim()) return setError('Fill in your name, business name and email.');
    if (f.password.length < 8) return setError('Password must be at least 8 characters.');
    if (f.password !== f.confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError('');
    try {
      const { token } = await api.register({ name: f.name, businessName: f.businessName, businessType: f.businessType, email: f.email, password: f.password });
      session.set(token);
      onSignedUp();
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
        <h1 className="text-2xl font-bold tracking-tight">Create your business account</h1>
        <p className="text-stone-500 mt-1">You'll be the owner. Add your staff from the Staff page after signing in.</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="n">Your name</label>
            <input id="n" className="input" autoComplete="name" value={f.name} onChange={set('name')} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="label" htmlFor="b">Business name</label>
              <input id="b" className="input" autoComplete="organization" value={f.businessName} onChange={set('businessName')} placeholder="e.g. Sharma Kirana" />
            </div>
            <div>
              <label className="label" htmlFor="t">Type</label>
              <select id="t" className="input" value={f.businessType} onChange={set('businessType')}>
                <option value="KIRANA">Kirana</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="GENERAL">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="e">Email</label>
            <input id="e" className="input" type="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={set('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p">Password</label>
              <input id="p" className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} placeholder="8+ characters" />
            </div>
            <div>
              <label className="label" htmlFor="c">Confirm</label>
              <input id="c" className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner className="w-4 h-4 text-white" /> : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-stone-500 mt-5 text-center">
          Already have an account? <a href="#/login" className="text-brand-700 font-medium">Log in</a>
        </p>
      </div>
    </div>
  );
}
