import { Calendar, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { uiText } from '@/lib/uiLanguage.js';
import { cn } from '@/lib/utils';

export function AcademicSessionSelector({ sessions = [], currentSession, onSelectSession, className }) {
  useUiLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const list = sessions.length > 0 ? sessions : [
    { name: '2026–27', slug: '2026-27', isCurrent: true },
    { name: '2025–26', slug: '2025-26', isCurrent: false },
    { name: '2024–25', slug: '2024-25', isCurrent: false },
  ];
  const selected = list.find((s) => (s.slug || s.name) === searchParams.get('session'))
    || list.find((s) => s.name === currentSession)
    || list.find((s) => s.isCurrent)
    || list[0];
  const activeSessionName = selected?.name || currentSession || '2026–27';

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (session) => {
    setIsOpen(false);
    if (onSelectSession) {
      onSelectSession(session);
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('session', session.slug || session.name || session);
        return next;
      });
    }
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden sm:inline">
          {uiText("Academic Session")}:
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="inline-flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs sm:text-sm font-bold text-brand shadow-xs hover:bg-brand/10 transition-colors cursor-pointer"
        >
          <Calendar className="size-3.5 text-brand" />
          <span>{activeSessionName}</span>
          <ChevronDown className={cn('size-3.5 text-brand transition-transform duration-200', isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-44 rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {uiText("Select Session")}
          </div>
          <div className="space-y-0.5">
            {list.map((s) => {
              const isSelected = (s.slug || s.name || s) === (selected?.slug || selected?.name || selected);
              return (
                <button
                  key={s.name || s}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(s)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-left',
                    isSelected
                      ? 'bg-brand text-white font-bold'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {s.name || s}
                    {s.isCurrent && (
                      <span className={cn('rounded px-1.5 py-0.2 text-[10px] font-extrabold', isSelected ? 'bg-white/20 text-white' : 'bg-brand/15 text-brand')}>
                        Current
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

