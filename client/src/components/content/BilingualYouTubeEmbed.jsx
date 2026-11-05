import { uiText } from '@/lib/uiLanguage.js';
import { useLang } from '@/lib/i18n';
import { extractYouTubeId } from '@/lib/youtube';
import { YouTubeEmbed } from './YouTubeEmbed.jsx';

export function BilingualYouTubeEmbed({ exercise }) {
  const { lang } = useLang();
  const video = lang === 'hi' ? exercise.introVideoHi : exercise.introVideoEn;
  if (!video || video.isVisible === false || !extractYouTubeId(video.youtubeId)) {
    return <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">{uiText('Video not available in English')}</p>;
  }
  return <YouTubeEmbed key={`${lang}-${video.youtubeId}`} video={video} title={uiText('Exercise introduction video')} showCaption={false} />;
}
