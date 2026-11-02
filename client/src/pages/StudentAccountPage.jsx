import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { uiText, getUiLanguage } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminUrl } from '@/lib/config';
import { Seo } from '@/components/site/Seo.jsx';

export default function StudentAccountPage() {
  useUiLanguage();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(location.search);
  const reset = location.pathname === '/reset-password';
  const forgot = location.pathname === '/forgot-password';
  const register = location.pathname === '/register';
  const kind = params.get('kind') === 'admin' ? 'admin' : 'student';
  const endpoint = kind === 'admin' && (reset || forgot) ? '/auth' : '/student/auth';
  const me = useQuery({ queryKey: ['student-me'], queryFn: () => api.get('/student/auth/me', { skipAuthRedirect: true }).then(r => r.data), retry: false, enabled: !forgot && !reset });
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const title = uiText(reset ? 'Reset password' : forgot ? 'Forgot password' : register ? 'Create student account' : 'Student login');
  const change = key => e => setForm(previous => ({ ...previous, [key]: e.target.value }));
  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('');
    if ((register || reset) && form.password !== form.confirm) { setError(uiText('Passwords do not match.')); return; }
    setBusy(true);
    try {
      if (forgot) {
        await api.post(`${endpoint}/forgot-password`, { email: form.email, language: getUiLanguage() }, { skipAuthRedirect: true });
        setNotice(uiText('If an active account exists, a reset link has been sent. Check your email.'));
      } else if (reset) {
        await api.post(`${endpoint}/reset-password`, { token: params.get('token') || '', password: form.password }, { skipAuthRedirect: true });
        queryClient.removeQueries({ queryKey: [kind === 'admin' ? 'admin-me' : 'student-me'] });
        setNotice(uiText('Password updated. Please sign in with your new password.'));
      } else {
        const { data } = await api.post(`/student/auth/${register ? 'register' : 'login'}`, { ...form, preferredLanguage: getUiLanguage() }, { skipAuthRedirect: true });
        queryClient.setQueryData(['student-me'], data);
        setForm({ name: '', email: '', password: '', confirm: '' });
      }
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await api.post('/student/auth/logout', {}, { headers: { 'X-CSRF-Token': me.data.csrfToken }, skipAuthRedirect: true }); queryClient.setQueryData(['student-me'], null); }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  return <section className="container-page py-12"><Seo title={title} robots="noindex,nofollow" /><div className="mx-auto max-w-md rounded-2xl border bg-card p-6 shadow-sm">
    <h1 className="mb-6 font-heading text-2xl font-bold">{me.data?.user && !reset && !forgot ? uiText('Student account') : title}</h1>
    {error && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg bg-muted p-3 text-sm">{notice}</p>}
    {me.data?.user && !reset && !forgot ? <div className="space-y-4"><p>{me.data.user.name}</p><p>{me.data.user.email}</p><Button disabled={busy} onClick={logout}>{uiText('Logout')}</Button><Link className="ml-4 text-brand" to="/">{uiText('Home')}</Link></div> : <>
      <form onSubmit={submit} className="space-y-4">
        {register && <label className="block text-sm">{uiText('Name')}<Input required maxLength={120} autoComplete="name" value={form.name} onChange={change('name')} /></label>}
        {!reset && <label className="block text-sm">{uiText('Email')}<Input required type="email" autoComplete="email" maxLength={200} value={form.email} onChange={change('email')} /></label>}
        {!forgot && <label className="block text-sm">{uiText('Password')}<Input required type="password" autoComplete={register || reset ? 'new-password' : 'current-password'} minLength={register || reset ? 10 : 1} maxLength={200} value={form.password} onChange={change('password')} /></label>}
        {(register || reset) && <><p className="text-xs text-muted-foreground">{uiText('Use at least 10 characters with uppercase, lowercase, a number and a symbol.')}</p><label className="block text-sm">{uiText('Confirm password')}<Input required type="password" autoComplete="new-password" value={form.confirm} onChange={change('confirm')} /></label></>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? uiText('Saving…') : title}</Button>
      </form>
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-brand"><Link to={kind === 'admin' && (reset || forgot) ? adminUrl('/login') : '/login'}>{uiText('Login')}</Link>{!reset && !forgot && <><Link to="/register">{uiText('Register')}</Link><Link to="/forgot-password">{uiText('Forgot password')}</Link></>}</div>
    </>}
  </div></section>;
}
