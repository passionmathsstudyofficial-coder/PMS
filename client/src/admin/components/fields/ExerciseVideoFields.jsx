import { uiText } from '@/lib/uiLanguage.js';
import { useState } from 'react';
import { useLang } from '@/lib/i18n';
import { api } from '@/lib/api';
import { toast } from '@/lib/notifications.jsx';
import { Button } from '@/components/ui/button';
import { YouTubeEmbed } from '@/components/content/YouTubeEmbed.jsx';
import { VideoField } from './VideoField.jsx';

export function ExerciseVideoFields({ id, form, setField, isNew }) {
  useLang();
  const [busy, setBusy] = useState(null);
  const save = async (field) => {
    setBusy(field);
    try {
      await api.put(`/exercises/${id}`, { [field]: form[field]?._id || form[field] || null });
      toast.success(uiText('Video saved'));
    } catch (error) { toast.apiError(error); }
    finally { setBusy(null); }
  };
  return <div className="space-y-6">
    {form.introVideo && <div className="rounded-xl border p-3 text-sm">
      <p>{uiText('Legacy video preserved. Confirm its spoken language and assign it below.')}</p>
      <YouTubeEmbed video={form.introVideo} showCaption={false} />
    </div>}
    {['en', 'hi'].map((language) => {
      const field = language === 'en' ? 'introVideoEn' : 'introVideoHi';
      const label = language === 'en' ? uiText('English YouTube Video URL') : uiText('Hindi YouTube Video URL');
      return <div key={field} className="space-y-3">
        <VideoField allowReplace label={label} value={form[field]} onChange={(value) => setField(field, value)} />
        {form[field]?.youtubeId && <YouTubeEmbed key={form[field].youtubeId} video={form[field]} title={label} showCaption={false} />}
        {!isNew && <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => save(field)}>{uiText('Save')} · {label}</Button>}
      </div>;
    })}
  </div>;
}
