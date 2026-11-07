import { useState, useEffect } from 'react';
import { Calendar, Plus, Check, Trash2, Edit2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel } from '../components/PageHeader.jsx';
import { toast } from '@/lib/notifications.jsx';
import { get, post, patch, del } from '@/lib/api';
import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { cn } from '@/lib/utils';

export default function AcademicSessionsPage() {
  useUiLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    year: new Date().getFullYear(),
    isCurrent: false,
    isActive: true,
    description: '',
  });

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await get('/content/sessions');
      setSessions(res.items || []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(uiText('Session name is required'));
      return;
    }
    try {
      const payload = {
        ...form,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: typeof form.description === 'string' ? { en: form.description, hi: form.description } : form.description,
      };
      if (editingId) {
        await patch(`/content/sessions/${editingId}`, payload);
        toast.success(uiText('Session updated successfully'));
      } else {
        await post('/content/sessions', payload);
        toast.success(uiText('Session created successfully'));
      }
      setEditingId(null);
      setForm({
        name: '',
        slug: '',
        year: new Date().getFullYear(),
        isCurrent: false,
        isActive: true,
        description: '',
      });
      loadSessions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleEdit = (session) => {
    setEditingId(session._id);
    setForm({
      name: session.name || '',
      slug: session.slug || '',
      year: session.year || new Date().getFullYear(),
      isCurrent: Boolean(session.isCurrent),
      isActive: session.isActive !== false,
      description: session.description?.en || session.description?.hi || (typeof session.description === 'string' ? session.description : ''),
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await del(`/content/sessions/${id}`);
      toast.success(uiText('Session deleted'));
      loadSessions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      await patch(`/content/sessions/${id}`, { isCurrent: true });
      toast.success(uiText('Current session updated'));
      loadSessions();
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title={uiText("Academic Sessions Management")}
        description={uiText("Manage academic sessions (2026–27, 2025–26, etc.), set active session, and control yearly curriculum scoping.")}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Panel */}
        <div className="lg:col-span-5">
          <form onSubmit={handleSave} className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-brand" />
              <span>{editingId ? uiText("Edit Academic Session") : uiText("Add New Academic Session")}</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {uiText("Session Name")} *
              </label>
              <input
                type="text"
                placeholder={uiText("e.g. 2026–27")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {uiText("URL Slug")}{uiText(" (optional)")}</label>
              <input
                type="text"
                placeholder={uiText("e.g. 2026-27")}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {uiText("Base Year")}
              </label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {uiText("Description")}
              </label>
              <textarea
                rows={2}
                placeholder={uiText("e.g. Current session for CBSE Class 6-12")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={form.isCurrent}
                  onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
                  className="rounded border-border text-brand focus:ring-brand"
                />
                <span>{uiText("Set as Current Active Session")}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-border text-brand focus:ring-brand"
                />
                <span>{uiText("Visible to Students (Active)")}</span>
              </label>
            </div>

            <div className="flex gap-2 pt-3">
              <Button type="submit" size="sm" className="flex-1">
                {editingId ? uiText("Update Session") : uiText("Create Session")}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: '',
                      slug: '',
                      year: new Date().getFullYear(),
                      isCurrent: false,
                      isActive: true,
                      description: '',
                    });
                  }}
                >
                  {uiText("Cancel")}
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Sessions List */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {uiText("Registered Academic Sessions")} ({sessions.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">{uiText("Loading sessions...")}</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">{uiText("No academic sessions configured yet. Add your first session using the form.")}</div>
            ) : (
              <div className="divide-y divide-border/60">
                {sessions.map((s) => (
                  <div key={s._id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{s.name}</span>
                        {s.isCurrent && (
                          <span className="rounded-full bg-brand/10 text-brand px-2 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                            <Star className="size-3 fill-current" />{uiText(" Current")}</span>
                        )}
                        {!s.isActive && (
                          <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">{uiText("Inactive")}</span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.description.en || s.description.hi || (typeof s.description === 'string' ? s.description : '')}
                        </p>
                      )}
                      <span className="text-[11px] text-muted-foreground block mt-1">{uiText("Year: ")}{s.year}{uiText(" | Slug: ")}{s.slug || '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!s.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetCurrent(s._id)}
                          className="h-8 text-xs text-brand hover:text-brand"
                        >{uiText("Set Current")}</Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(s)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(s._id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
