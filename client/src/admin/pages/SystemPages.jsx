import { adminText } from '../lib/format.js';
import { uiTemplate } from '@/lib/uiLanguage.js';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  DatabaseBackup,
  Download,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState } from '@/components/site/States.jsx';
import { api, errorMessage, get } from '@/lib/api';
import { API_BASE } from '@/lib/config';
import { cn } from '@/lib/utils';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { Field, SelectField, TextField } from '../components/fields/Fields.jsx';
import { PageHeader, Panel } from '../components/PageHeader.jsx';
import { useAdminAuth } from '../lib/auth.jsx';
import { formatBytes, formatDate, timeAgo } from '../lib/format.js';

/* ───────────── passwords ───────────── */

const PASSWORD_RULES = [
  { test: (p) => p.length >= 10, get label() { return uiText("10+ characters"); } },
  { test: (p) => /[a-z]/.test(p), get label() { return uiText("lowercase letter"); } },
  { test: (p) => /[A-Z]/.test(p), get label() { return uiText("uppercase letter"); } },
  { test: (p) => /\d/.test(p), get label() { return uiText("number"); } },
  { test: (p) => /[^A-Za-z0-9]/.test(p), get label() { return uiText("symbol"); } },
];

export const passwordIsStrong = (password) => PASSWORD_RULES.every((rule) => rule.test(password || ''));

export function PasswordChecklist({ password }) {
  useUiLanguage();
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs sm:grid-cols-3">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password || '');
        return (
          <li key={rule.label} className={cn('flex items-center gap-1', ok ? 'text-success' : 'text-muted-foreground')}>
            {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export function generatePassword(length = 16) {
  const sets = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%^&*-_=+?'];
  const all = sets.join('');
  const random = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  const chars = sets.map((set) => set[random(set.length)]);
  while (chars.length < length) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function PasswordInput({ label = uiText("Password"), value, onChange, allowGenerate = true, autoComplete = 'new-password' }) {
  useUiLanguage();
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input type="text" className="h-9 font-mono" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} spellCheck={false} />
        {allowGenerate && (
          <Button type="button" variant="outline" onClick={() => onChange(generatePassword())}>{uiText("Generate")}</Button>
        )}
      </div>
      <div className="mt-1.5">
        <PasswordChecklist password={value} />
      </div>
    </Field>
  );
}

/* ───────────── admins ───────────── */

const ROLE_OPTIONS = [
  { value: 'superadmin', get label() { return uiText("Owner (superadmin)"); } },
  { value: 'admin', get label() { return uiText("Admin"); } },
  { value: 'editor', get label() { return uiText("Editor"); } },
];

function CreateAdminDialog({ open, onOpenChange, onCreated }) {
  useUiLanguage();
  const [form, setForm] = useState({ name: '', email: '', role: 'editor', password: '' });
  const mutation = useMutation({
    mutationFn: () => api.post('/admins', form).then((r) => r.data),
    onSuccess: () => {
      toast.success(uiText("Account created. Share the password securely — never by plain email or chat."));
      setForm({ name: '', email: '', role: 'editor', password: '' });
      onCreated();
      onOpenChange(false);
    },
    onError: (error) => toast.apiError(error),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{uiText("Add admin account")}</DialogTitle>
          <DialogDescription>{uiText("Give each person their own account with only the access they need.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <TextField label={uiText("Name")} value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <TextField label={uiText("Email")} type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <SelectField
            label={uiText("Role")}
            value={form.role}
            onChange={(role) => setForm({ ...form, role })}
            options={ROLE_OPTIONS}
            hint={uiText("Editor: create & edit drafts, upload images. Admin: also publish, delete, website settings, activity logs, create backups. Owner: everything, including admins, restores and ad code.")}
          />
          <PasswordInput value={form.password} onChange={(password) => setForm({ ...form, password })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{uiText("Cancel")}</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.email || !passwordIsStrong(form.password)}>
            {mutation.isPending && <Loader2 className="animate-spin" />}{uiText("Create account")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ target, onOpenChange, onDone }) {
  useUiLanguage();
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.put(`/admins/${target._id}`, { password }).then((r) => r.data),
    onSuccess: () => {
      toast.success(uiText("Password reset. Their other sessions were signed out."));
      setPassword('');
      onDone();
      onOpenChange(false);
    },
    onError: (error) => toast.apiError(error),
  });
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{uiText("Reset password")}</DialogTitle>
          <DialogDescription>{target?.email}</DialogDescription>
        </DialogHeader>
        <PasswordInput label={uiText("New password")} value={password} onChange={setPassword} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{uiText("Cancel")}</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !passwordIsStrong(password)}>
            {mutation.isPending && <Loader2 className="animate-spin" />}{uiText("Reset password")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminsPage() {
  useUiLanguage();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { admin: me } = useAdminAuth();
  const admins = useQuery({ queryKey: ['admin', 'admins'], queryFn: () => get('/admins') });
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });

  const run = async (request, success) => {
    try {
      await request();
      toast.success(success);
      refresh();
    } catch (error) {
      toast.apiError(error);
      throw error;
    }
  };

  return (
    <div>
      <PageHeader
        title={uiText("Users / Admins")}
        description={uiText("Every admin signs in with their own account. Failed sign-ins lock an account for 15 minutes; all actions are recorded in Activity Logs.")}
        actions={
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <UserPlus />{uiText("Add admin")}</Button>
        }
      />
      {admins.isError && <ErrorState error={admins.error} onRetry={admins.refetch} />}
      {admins.isPending ? (
        <Skeleton className="h-60 rounded-2xl" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText("Account")}</TableHead>
                <TableHead>{uiText("Role")}</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead className="hidden md:table-cell">{uiText("Last sign-in")}</TableHead>
                <TableHead>{uiText("Status")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{uiText("Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(admins.data?.items || []).map((row) => {
                const isMe = row._id === me?._id;
                const locked = row.lockUntil && new Date(row.lockUntil) > new Date();
                return (
                  <TableRow key={row._id}>
                    <TableCell>
                      <p className="font-semibold">
                        {row.name} {isMe && <span className="text-xs font-normal text-muted-foreground">{uiText("(you)")}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </TableCell>
                    <TableCell>
                      <select
                        value={row.role}
                        disabled={isMe}
                        onChange={(e) => run(() => api.put(`/admins/${row._id}`, { role: e.target.value }), 'Role updated').catch(() => {})}
                        className="h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-60"
                        aria-label={uiTemplate`Role for ${row.email}`}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>{row.totpEnabled ? <ShieldCheck className="size-4 text-success" aria-label={uiText("Enabled")} /> : <span className="text-xs text-muted-foreground">{uiText("Off")}</span>}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {row.lastLoginAt ? `${timeAgo(row.lastLoginAt)} · ${row.lastLoginIp || ''}` : uiText("Never")}
                      {row.activeSessions ? <span className="block">{row.activeSessions}{uiText("active session(s)")}</span> : null}
                    </TableCell>
                    <TableCell>
                      {!row.isActive ? (
                        <span className="text-xs font-semibold text-muted-foreground">{uiText("Deactivated")}</span>
                      ) : locked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                          <Lock className="size-3.5" />{uiText("Locked")}</span>
                      ) : (
                        <span className="text-xs font-semibold text-success">{uiText("Active")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={uiTemplate`Actions for ${row.email}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setResetTarget(row)}>
                            <KeyRound />{uiText("Reset password")}</DropdownMenuItem>
                          {locked && (
                            <DropdownMenuItem onSelect={() => run(() => api.post(`/admins/${row._id}/unlock`), 'Account unlocked').catch(() => {})}>
                              <Unlock />{uiText("Unlock")}</DropdownMenuItem>
                          )}
                          {row.totpEnabled && (
                            <DropdownMenuItem
                              onSelect={() =>
                                confirm({
                                  get title() { return uiTemplate`Reset two-factor for ${row.email}?`; },
                                  get description() { return uiText("Use this only if they lost their phone. They will be signed out and must set up 2FA again."); },
                                  get confirmLabel() { return uiText("Reset 2FA"); },
                                  destructive: true,
                                  onConfirm: () => run(() => api.post(`/admins/${row._id}/reset-2fa`), 'Two-factor reset'),
                                })
                              }
                            >
                              <ShieldCheck />{uiText("Reset 2FA")}</DropdownMenuItem>
                          )}
                          {!isMe && (
                            <>
                              <DropdownMenuItem
                                onSelect={() =>
                                  confirm({
                                    title: row.isActive ? uiTemplate`Deactivate ${row.email}?` : uiTemplate`Activate ${row.email}?`,
                                    description: row.isActive ? uiText("They are signed out immediately and cannot sign in until reactivated.") : undefined,
                                    confirmLabel: row.isActive ? uiText("Deactivate") : uiText("Activate"),
                                    destructive: row.isActive,
                                    onConfirm: () => run(() => api.put(`/admins/${row._id}`, { isActive: !row.isActive }), row.isActive ? 'Account deactivated' : 'Account activated'),
                                  })
                                }
                              >
                                <LogOut /> {row.isActive ? uiText("Deactivate") : uiText("Activate")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() =>
                                  confirm({
                                    get title() { return uiTemplate`Delete ${row.email}?`; },
                                    get description() { return uiText("The account is removed permanently. Content they created stays on the website."); },
                                    requireText: 'DELETE',
                                    get confirmLabel() { return uiText("Delete account"); },
                                    destructive: true,
                                    onConfirm: () => run(() => api.delete(`/admins/${row._id}`), 'Account deleted'),
                                  })
                                }
                              >
                                <Trash2 />{uiText("Delete")}</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <CreateAdminDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
      <ResetPasswordDialog target={resetTarget} onOpenChange={(open) => !open && setResetTarget(null)} onDone={refresh} />
    </div>
  );
}

/* ───────────── activity ───────────── */

const SEVERITY_STYLES = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-brand-soft text-brand',
};

const toIso = (date, endOfDay) => (date ? new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).toISOString() : undefined);

export function ActivityPage() {
  useUiLanguage();
  const [filters, setFilters] = useState({ action: '', severity: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const logs = useQuery({
    queryKey: ['admin', 'activity', filters, page],
    queryFn: () =>
      get('/activity-logs', {
        action: filters.action || undefined,
        severity: filters.severity || undefined,
        from: toIso(filters.from),
        to: toIso(filters.to, true),
        page,
        limit: 50,
      }),
    placeholderData: (previous) => previous,
  });
  const set = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const select = 'h-9 rounded-lg border bg-background px-2 text-sm';

  return (
    <div>
      <PageHeader
        title={uiText("Activity Logs")}
        description={uiText("Sign-ins, failed attempts, lockouts, content changes, publishing, media uploads, settings and backups. Kept for 400 days.")}
        actions={
          <Button variant="outline" size="lg" onClick={() => logs.refetch()}>
            <RefreshCw className={logs.isFetching ? 'animate-spin' : ''} />{uiText("Refresh")}</Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
        <select className={select} value={filters.action} onChange={(e) => set({ action: e.target.value })} aria-label={uiText("Filter by action")}>
          <option value="">{uiText("All actions")}</option>
          <option value="security">{uiText("Security events (sign-in, 2FA, password)")}</option>
          {(logs.data?.actions || []).map((a) => (
            <option key={a} value={a}>
              {uiText(a)}
            </option>
          ))}
        </select>
        <select className={select} value={filters.severity} onChange={(e) => set({ severity: e.target.value })} aria-label={uiText("Filter by severity")}>
          <option value="">{uiText("Any severity")}</option>
          <option value="info">{uiText("Info")}</option>
          <option value="warning">{uiText("Warning")}</option>
          <option value="critical">{uiText("Critical")}</option>
        </select>
        <label className="text-xs text-muted-foreground">{uiText("From")}<Input type="date" className="h-9" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">{uiText("To")}<Input type="date" className="h-9" value={filters.to} onChange={(e) => set({ to: e.target.value })} />
        </label>
      </div>

      {logs.isError ? (
        <ErrorState error={logs.error} onRetry={logs.refetch} />
      ) : logs.isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : logs.data.items.length === 0 ? (
        <EmptyState title={uiText("No activity found")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText("When")}</TableHead>
                <TableHead>{uiText("Who")}</TableHead>
                <TableHead>{uiText("Action")}</TableHead>
                <TableHead>{uiText("Content")}</TableHead>
                <TableHead className="hidden lg:table-cell">{uiText("IP address")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.items.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="text-xs whitespace-nowrap" title={formatDate(log.createdAt)}>
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{log.adminName || log.adminEmail || <span className="text-muted-foreground">{uiText("Unknown")}</span>}</TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold capitalize', SEVERITY_STYLES[log.severity])}>{uiText(log.action)}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">
                    {log.entityType && <span className="text-muted-foreground">{uiText(log.entityType)}: </span>}
                    {adminText(log.entityLabel)}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {logs.data.pages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">{logs.data.total}{uiText("events")}</span>
              <span className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{uiText("Previous")}</Button>
                {page} / {logs.data.pages}
                <Button variant="outline" size="sm" disabled={page >= logs.data.pages} onClick={() => setPage(page + 1)}>{uiText("Next")}</Button>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── backups ───────────── */

function cronText(cron) {
  const match = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(cron || '');
  return match ? `Every day at ${match[2].padStart(2, '0')}:${match[1].padStart(2, '0')}` : cron;
}

function RestoreDialog({ backup, onOpenChange }) {
  useUiLanguage();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post(`/backups/${backup._id}/restore`, { password, confirm: confirmText }).then((r) => r.data),
    onSuccess: (result) => {
      toast.success(uiTemplate`Restored ${result.restored.length} collections. A safety backup was taken first: ${result.safetyBackup}`);
      setPassword('');
      setConfirmText('');
      queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (error) => toast.apiError(error),
  });
  return (
    <Dialog open={Boolean(backup)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />{uiText("Restore website content")}</DialogTitle>
          <DialogDescription>{' '}{uiText("All website content and settings are replaced with the backup from")}{' '}{backup && formatDate(backup.createdAt)}{uiText(". Admin accounts and activity logs are kept. A safety backup of the current state is created automatically before restoring.")}{' '}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={uiText("Your password")}>
            <Input type="password" className="h-9" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label={uiText("Type RESTORE to confirm")}>
            <Input className="h-9 font-mono" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>{uiText("Cancel")}</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending || !password || confirmText !== 'RESTORE'}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}{uiText("Restore")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BackupsPage() {
  useUiLanguage();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { can, admin } = useAdminAuth();
  const isOwner = admin?.role === 'superadmin';
  const backups = useQuery({ queryKey: ['admin', 'backups'], queryFn: () => get('/backups') });
  const [restoreTarget, setRestoreTarget] = useState(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });

  const create = useMutation({
    mutationFn: () => api.post('/backups').then((r) => r.data),
    onSuccess: (backup) => {
      toast.success(uiTemplate`Backup created (${formatBytes(backup.bytes)})`);
      refresh();
    },
    onError: (error) => toast.apiError(error),
  });
  const verify = useMutation({
    mutationFn: (id) => api.post(`/backups/${id}/verify`).then((r) => r.data),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      refresh();
    },
    onError: (error) => toast.apiError(error),
  });

  const config = backups.data?.config;
  const external = config && (config.externalDirectory || config.cloudinaryCopy);

  return (
    <div>
      <PageHeader
        title={uiText("Backup & Recovery")}
        description={uiText("Database backups (all content, settings, media records and accounts) with verification and one-click restore.")}
        actions={
          can('backup:create') && (
            <Button size="lg" onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" /> : <DatabaseBackup />}{uiText("Back up now")}</Button>
          )
        }
      />

      {config && (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <Panel title={uiText("Automatic backups")}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{uiText("Schedule")}</dt>
              <dd>{config.enabled ? `${cronText(config.cron)} (${config.timezone})` : <span className="font-semibold text-warning">{uiText("Disabled (BACKUP_ENABLED=false)")}</span>}</dd>
              <dt className="text-muted-foreground">{uiText("Retention")}</dt>
              <dd>{config.retentionDays}{' '}{uiText("days (the latest 3 backups are always kept)")}</dd>
              <dt className="text-muted-foreground">{uiText("Second location")}</dt>
              <dd>
                {config.externalDirectory && uiText("External folder")}
                {config.cloudinaryCopy && uiText("Private Cloudinary copy")}
                {!external && <span className="font-semibold text-warning">{uiText("Not configured")}</span>}
              </dd>
              <dt className="text-muted-foreground">{uiText("Images")}</dt>
              <dd>{config.storageProvider === 'cloudinary' ? uiText("Stored in Cloudinary (backed up by Cloudinary)") : config.includeUploads && config.externalDirectory ? uiText("Mirrored to the external folder") : uiText("Local uploads folder — include it in server backups")}</dd>
            </dl>
            {!external && (
              <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{' '}{uiText("Keeping backups only on this server is not enough. Set")}{' '}<code>BACKUP_EXTERNAL_DIR</code>{' '}{uiText("(a mounted drive or Google Drive for desktop folder) or")}{' '}<code>BACKUP_CLOUDINARY=true</code>{' '}{uiText("in the server environment.")}{' '}</p>
            )}
          </Panel>
          <Panel title={uiText("Disaster recovery (target: under 15 minutes)")}>
            <ol className="list-decimal space-y-1.5 ps-5 text-sm text-muted-foreground">
              <li>{uiText("Start a fresh server with the same code and environment file.")}</li>
              <li>{uiText("Point MongoDB to a new empty database and start the app.")}</li>
              <li>{uiText("Create the owner account:")}{' '}<code>npm run create-admin</code>.</li>
              <li>{uiText("Copy the latest")}{' '}<code>.jsonl.gz</code>{' '}{uiText("backup into the backups folder, sign in and choose Restore — or restore from the most recent verified backup listed below.")}</li>
              <li>{uiText("Verify a few pages, then switch DNS / Cloudflare to the new server.")}</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">{uiText("Test a restore on a staging copy every month so you know backups really work.")}</p>
          </Panel>
        </div>
      )}

      {backups.isError && <ErrorState error={backups.error} onRetry={backups.refetch} />}
      {backups.isPending ? (
        <Skeleton className="h-60 rounded-2xl" />
      ) : backups.data?.items?.length === 0 ? (
        <EmptyState icon={DatabaseBackup} title={uiText("No backups yet")} description={uiText("Create the first backup now.")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText("Backup")}</TableHead>
                <TableHead>{uiText("Type")}</TableHead>
                <TableHead>{uiText("Size")}</TableHead>
                <TableHead className="hidden md:table-cell">{uiText("Second copy")}</TableHead>
                <TableHead className="hidden lg:table-cell">{uiText("Verified")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{uiText("Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(backups.data?.items || []).map((b) => (
                <TableRow key={b._id}>
                  <TableCell>
                    <p className="text-sm font-semibold">{formatDate(b.createdAt)}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{b.filename}</p>
                    {b.status !== 'completed' && <p className={cn('text-xs font-semibold', b.status === 'failed' ? 'text-destructive' : 'text-warning')}>{b.status}{b.error ? `: ${b.error}` : ''}</p>}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{uiText(b.type)}</TableCell>
                  <TableCell className="text-sm">{formatBytes(b.bytes)}</TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    {b.external?.status === 'completed' ? <span className="text-success">{uiText("Copied (")}{b.external.provider})</span> : b.external?.status === 'failed' ? <span className="text-destructive">{uiText("Failed")}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{b.verifiedAt ? `${timeAgo(b.verifiedAt)} · ${b.verifyResult}` : uiText("Not yet")}</TableCell>
                  <TableCell>
                    {b.status === 'completed' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={uiText("Backup actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => verify.mutate(b._id)}>
                            <ShieldCheck />{uiText("Verify backup")}</DropdownMenuItem>
                          {isOwner && (
                            <>
                              <DropdownMenuItem asChild>
                                <a href={`${API_BASE}/backups/${b._id}/download`}>
                                  <Download />{uiText("Download")}</a>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setRestoreTarget(b)}>
                                <RotateCcw />{uiText("Restore…")}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() =>
                                  confirm({
                                    get title() { return uiText("Delete this backup?"); },
                                    get description() { return uiTemplate`${b.filename}\nThe file is removed from this server and the external folder copy.`; },
                                    get confirmLabel() { return uiText("Delete backup"); },
                                    destructive: true,
                                    onConfirm: async () => {
                                      try {
                                        await api.delete(`/backups/${b._id}`);
                                        toast.success(uiText("Backup deleted"));
                                        refresh();
                                      } catch (error) {
                                        toast.apiError(error);
                                        throw error;
                                      }
                                    },
                                  })
                                }
                              >
                                <Trash2 />{uiText("Delete")}</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <RestoreDialog backup={restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)} />
    </div>
  );
}

/* ───────────── my account ───────────── */

function ChangePasswordCard() {
  useUiLanguage();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', repeat: '' });
  const mutation = useMutation({
    mutationFn: () => api.post('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword }).then((r) => r.data),
    onSuccess: () => {
      toast.success(uiText("Password changed. Your other devices were signed out."));
      setForm({ currentPassword: '', newPassword: '', repeat: '' });
    },
    onError: (error) => toast.apiError(error),
  });
  const valid = form.currentPassword && passwordIsStrong(form.newPassword) && form.newPassword === form.repeat;
  return (
    <Panel title={uiText("Change password")}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) mutation.mutate();
        }}
      >
        <Field label={uiText("Current password")}>
          <Input type="password" className="h-9" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        </Field>
        <Field label={uiText("New password")}>
          <Input type="password" className="h-9" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          <div className="mt-1.5">
            <PasswordChecklist password={form.newPassword} />
          </div>
        </Field>
        <Field label={uiText("Repeat new password")} error={form.repeat && form.repeat !== form.newPassword ? 'Passwords do not match' : undefined}>
          <Input type="password" className="h-9" autoComplete="new-password" value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })} />
        </Field>
        <Button type="submit" className="justify-self-start" disabled={!valid || mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" />}{uiText("Change password")}</Button>
      </form>
    </Panel>
  );
}

function TwoFactorCard() {
  useUiLanguage();
  const { admin, refresh } = useAdminAuth();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });

  const start = useMutation({ mutationFn: () => api.post('/auth/2fa/setup').then((r) => r.data), onSuccess: setSetup, onError: (e) => toast.apiError(e) });
  const enable = useMutation({
    mutationFn: () => api.post('/auth/2fa/enable', { code }).then((r) => r.data),
    onSuccess: async () => {
      toast.success(uiText("Two-factor authentication is on"));
      setSetup(null);
      setCode('');
      await refresh();
    },
    onError: (e) => toast.apiError(e),
  });
  const disable = useMutation({
    mutationFn: () => api.post('/auth/2fa/disable', disableForm).then((r) => r.data),
    onSuccess: async () => {
      toast.success(uiText("Two-factor authentication turned off"));
      setDisableForm({ password: '', code: '' });
      await refresh();
    },
    onError: (e) => toast.apiError(e),
  });

  return (
    <Panel title={uiText("Two-factor authentication (2FA)")} description={uiText("Protect your account with a 6-digit code from Google Authenticator, Microsoft Authenticator, Authy or 1Password.")}>
      {admin?.totpEnabled ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <ShieldCheck className="size-5" />{uiText("Enabled — a code is required at every sign-in.")}</p>
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-semibold">{uiText("Turn off 2FA")}</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label={uiText("Password")}>
                <Input type="password" className="h-9" value={disableForm.password} onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })} />
              </Field>
              <Field label={uiText("Current 6-digit code")}>
                <Input inputMode="numeric" maxLength={6} className="h-9 font-mono" value={disableForm.code} onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/\D/g, '') })} />
              </Field>
            </div>
            <Button variant="destructive" size="sm" className="mt-3" disabled={!disableForm.password || disableForm.code.length !== 6 || disable.isPending} onClick={() => disable.mutate()}>
              {disable.isPending && <Loader2 className="animate-spin" />}{uiText("Turn off")}</Button>
          </details>
        </div>
      ) : setup ? (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <img src={setup.qrDataUrl} alt={uiText("QR code for your authenticator app")} className="size-48 rounded-xl border bg-white p-2" />
          <div className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
              <li>{uiText("Open your authenticator app and scan the QR code.")}</li>
              <li>{uiText("Or enter this key manually:")}</li>
            </ol>
            <code className="block rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all select-all">{setup.secret}</code>
            <Field label={uiText("Enter the 6-digit code shown in the app")}>
              <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="h-11 max-w-40 text-center font-mono text-xl tracking-[0.35em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <div className="flex gap-2">
              <Button onClick={() => enable.mutate()} disabled={code.length !== 6 || enable.isPending}>
                {enable.isPending && <Loader2 className="animate-spin" />}{uiText("Turn on 2FA")}</Button>
              <Button variant="ghost" onClick={() => setSetup(null)}>{uiText("Cancel")}</Button>
            </div>
          </div>
        </div>
      ) : (
        <Button onClick={() => start.mutate()} disabled={start.isPending}>
          {start.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{uiText("Set up 2FA")}</Button>
      )}
    </Panel>
  );
}

export function AccountPage() {
  useUiLanguage();
  const { admin, mustEnroll2fa } = useAdminAuth();
  const signOutOthers = useMutation({
    mutationFn: () => api.post('/auth/logout-others').then((r) => r.data),
    onSuccess: (data) => toast.success(uiTemplate`${data.revoked} other session(s) signed out`),
    onError: (e) => toast.apiError(e),
  });
  return (
    <div>
      <PageHeader title={uiText("My Account")} description={`${admin?.name} · ${admin?.email} · ${uiText(admin?.role)}`} />
      {mustEnroll2fa && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-brand" />
          <p>
            <strong>{uiText("Two-factor authentication is required on this website.")}</strong>{' '}{uiText("Set it up below to unlock the dashboard.")}{' '}</p>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <TwoFactorCard />
        <ChangePasswordCard />
        <Panel title={uiText("Sessions")}>
          <p className="mb-3 text-sm text-muted-foreground">{' '}{uiText("Sessions end after inactivity and expire automatically. Last sign-in:")}{' '}{admin?.lastLoginAt ? uiTemplate`${formatDate(admin.lastLoginAt)} from ${admin.lastLoginIp || 'unknown IP'}` : '—'}
          </p>
          <Button variant="outline" onClick={() => signOutOthers.mutate()} disabled={signOutOthers.isPending}>
            {signOutOthers.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}{uiText("Sign out all other devices")}</Button>
        </Panel>
      </div>
    </div>
  );
}
