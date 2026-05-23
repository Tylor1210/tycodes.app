import { useState, useEffect } from 'react';
import type { ScriptureVerse } from '../types';

const FALLBACK: ScriptureVerse[] = [
  { reference: 'Proverbs 16:3',    text: 'Commit to the LORD whatever you do, and he will establish your plans.', translation: 'NIV' },
  { reference: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.', translation: 'NIV' },
  { reference: 'Jeremiah 29:11',   text: 'For I know the plans I have for you, declares the LORD — plans to prosper you and not to harm you, plans to give you hope and a future.', translation: 'NIV' },
  { reference: 'Psalm 90:12',      text: 'Teach us to number our days, that we may gain a heart of wisdom.', translation: 'NIV' },
  { reference: 'Colossians 3:23',  text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.', translation: 'NIV' },
];
interface Props {
  onOpenSettings?: () => void;
}

export default function DailyScripture({}: Props = {}) {
  const [verse, setVerse] = useState<ScriptureVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('https://bible-api.com/?random=verse&translation=kjv');
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (!cancelled) setVerse({ reference: d.reference || '', text: d.text?.trim() || '', translation: d.translation_name || 'KJV' });
      } catch {
        const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
        if (!cancelled) setVerse(FALLBACK[day % FALLBACK.length]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card w-full h-full flex-1 flex flex-col gap-0 relative overflow-hidden animate-fade-up delay-3">
      {/* Subtle decorative blobs */}
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none opacity-[0.06]"
        style={{ background: 'var(--amber)', filter: 'blur(32px)' }} />
      <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full pointer-events-none opacity-[0.04]"
        style={{ background: 'var(--violet)', filter: 'blur(24px)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="section-label">Daily Scripture</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        {showSettings && (
          <div className="absolute right-5 top-12 bg-card border border-edge rounded-lg shadow-float p-3 z-20 w-48 animate-fade-up">
            <p className="text-xs text-ink font-medium">Scripture Settings</p>
            <p className="text-[10px] text-ink-3 mt-1">Options coming soon...</p>
          </div>
        )}
      </div>

      {/* Verse */}
      <div className="flex-1 flex flex-col justify-center px-5 pb-4 relative z-10 min-h-0">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
          </div>
        ) : verse ? (
          <blockquote className="space-y-3">
            <p
              className="text-sm leading-relaxed text-ink italic"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              "{verse.text}"
            </p>
            <div className="flex items-center justify-between">
              <cite className="text-xs font-semibold not-italic text-amber">
                — {verse.reference}
              </cite>
              <span className="pill pill-neutral text-[9px]">{verse.translation}</span>
            </div>
          </blockquote>
        ) : null}
      </div>
    </div>
  );
}
