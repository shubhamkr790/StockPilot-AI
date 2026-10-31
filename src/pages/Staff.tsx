import React, { useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { api, StaffUser } from '../lib/api';
import { ErrorBox, PageHeader, Skeleton, Spinner, useToast } from '../components/ui';

export function Staff() {
  const toast = useToast();
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [error, setError] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.staff().then((r) => setUsers(r.users)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim()) return setFormError('Enter a name and email.');
    if (f.password.length < 8) return setFormError('Starting password must be at least 8 characters.');
    setBusy(true);
    setFormError('');
    try {
      await api.addStaff(f);
      toast(`${f.name} can now log in with ${f.email}`);
      setF({ name: '', email: '', password: '' });
      load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: StaffUser) => {
    if (!confirm(`Remove ${u.name}? They won't be able to log in. Their past sales stay in the records.`)) return;
    try {
      toast((await api.removeStaff(u.id)).message);
      load();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Staff" subtitle="Staff can record sales and view stock. They can't change prices, delete products or approve invoices." />
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div>
          {error ? <ErrorBox message={error} /> : !users ? <Skeleton className="h-40" /> : (
            <div className="card divide-y divide-stone-100">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 grid place-items-center font-semibold">{u.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-stone-500 truncate">{u.email || u.username} · {u.role === 'OWNER' ? 'Owner' : u.disabled ? 'Removed' : 'Staff'}</p>
                  </div>
                  {u.role === 'STAFF' && !u.disabled && (
                    <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => remove(u)}>Remove</button>
                  )}
                </div>
              ))}
              {users.filter((u) => u.role === 'STAFF').length === 0 && (
                <div className="p-6 text-center text-stone-500 flex flex-col items-center gap-2"><Users className="w-8 h-8 text-stone-300" />No staff yet. Add someone who works at your counter.</div>
              )}
            </div>
          )}
        </div>
        <form onSubmit={add} className="card p-5 space-y-4" noValidate>
          <h2 className="font-semibold text-lg flex items-center gap-2"><UserPlus className="w-5 h-5 text-brand-600" /> Add staff member</h2>
          <div><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" type="email" autoCapitalize="none" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div>
            <label className="label">Starting password</label>
            <input className="input" type="text" autoComplete="off" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="8+ characters" />
            <p className="text-[13px] text-stone-500 mt-1">Share it with them in person. Only a scrambled (hashed) copy is stored.</p>
          </div>
          {formError && <ErrorBox message={formError} />}
          <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="w-4 h-4 text-white" /> : 'Add staff member'}</button>
        </form>
      </div>
    </div>
  );
}
