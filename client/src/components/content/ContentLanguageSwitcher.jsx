import { useContentLang } from '@/lib/i18n';
import { useUiTranslation } from '@/lib/useUiTranslation.jsx';
export function ContentLanguageSwitcher() {
  const {lang,setLang}=useContentLang(); const t=useUiTranslation();
  return <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" role="group" aria-label={t('Content language')}>
    <span>{t('Content language')}:</span>
    {['en','hi'].map(code=><button key={code} type="button" aria-pressed={lang===code} onClick={()=>setLang(code)} className={`rounded-full border px-3 py-1 ${lang===code?'bg-brand text-white':'bg-card text-foreground'}`}>{t(code==='en'?'English':'Hindi')}</button>)}
  </div>;
}
