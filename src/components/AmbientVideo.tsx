interface Props {
  youtubeUrl: string;
  show: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

function extractId(input: string): string {
  const t = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(t)) return t;
  try {
    const u = new URL(t);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    const v = u.searchParams.get('v');
    if (v) return v;
    const m = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  } catch { /* fall through */ }
  return t;
}

export default function AmbientVideo({ youtubeUrl, show, onToggle, onOpenSettings }: Props) {
  const id = extractId(youtubeUrl);
  const src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0`;

  return (
    <div className="card flex flex-col gap-0 overflow-hidden animate-fade-up delay-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="section-label">Ambient Feed</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="ambient-video-toggle"
            onClick={onToggle}
            className={`pill cursor-pointer transition-all duration-200 ${show ? 'pill-indigo' : 'pill-neutral'}`}
          >
            {show ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo animate-pulse-dot" />
                Live
              </>
            ) : 'Show'}
          </button>
          <button
            id="ambient-video-settings-btn"
            onClick={onOpenSettings}
            className="icon-btn"
            aria-label="Ambient video settings"
            title="Change video URL"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="w-0 h-0 absolute opacity-0 pointer-events-none">
        {show && (
          <iframe
            key={id}
            title="Ambient Media"
            src={src}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            style={{ border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        )}
      </div>
    </div>
  );
}
