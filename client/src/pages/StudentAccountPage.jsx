import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { uiText, getUiLanguage } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminUrl } from '@/lib/config';
import { Seo } from '@/components/site/Seo.jsx';

// Kept only for the admin password recovery links. Student account screens are disabled.
export default function AdminRecoveryPage() {
  useUiLanguage();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(location.search);
  const isAdminRecovery = params.get('kind') === 'admin';
  const reset = location.pathname === '/reset-password';
  const forgot = location.pathname === '/forgot-password';
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!isAdminRecovery || (!forgot && !reset)) return <Navigate to="/" replace />;

  const title = uiText(reset ? 'Reset password' : 'Forgot password');
  const change = key => e => setForm(previous => ({ ...previous, [key]: e.target.value }));
  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (reset && form.password !== form.confirm) { setError(uiText('Passwords do not match.')); return; }
    setBusy(true);
    try {
      if (forgot) {
        await api.post('/auth/forgot-password', { email: form.email, language: getUiLanguage() }, { skipAuthRedirect: true });
        setNotice(uiText('If an active account exists, a reset link has been sent. Check your email.'));
      } else {
        await api.post('/auth/reset-password', { token: params.get('token') || '', password: form.password }, { skipAuthRedirect: true });
        queryClient.removeQueries({ queryKey: ['admin-me'] });
        setNotice(uiText('Password updated. Please sign in with your new password.'));
      }
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }

  return <section className="container-page py-12"><Seo title={title} robots="noindex,nofollow" /><div className="mx-auto max-w-md rounded-2xl border bg-card p-6 shadow-sm">
    <h1 className="mb-6 font-heading text-2xl font-bold">{title}</h1>
    {error && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg bg-muted p-3 text-sm">{notice}</p>}
    <form onSubmit={submit} className="space-y-4">
      {forgot && <label className="block text-sm">{uiText('Email')}<Input required type="email" autoComplete="email" maxLength={200} value={form.email} onChange={change('email')} /></label>}
      {reset && <><label className="block text-sm">{uiText('Password')}<Input required type="password" autoComplete="new-password" minLength={10} maxLength={200} value={form.password} onChange={change('password')} /></label><p className="text-xs text-muted-foreground">{uiText('Use at least 10 characters with uppercase, lowercase, a number and a symbol.')}</p><label className="block text-sm">{uiText('Confirm password')}<Input required type="password" autoComplete="new-password" value={form.confirm} onChange={change('confirm')} /></label></>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? uiText('Saving…') : title}</Button>
    </form>
    <Link className="mt-5 inline-block text-sm text-brand" to={adminUrl('/login')}>{uiText('Admin login')}</Link>
  </div></section>;
}
