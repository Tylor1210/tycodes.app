import { useState, useEffect, useCallback } from 'react';
import TimelineBar from './components/TimelineBar';
import AccountabilityBacklog from './components/AccountabilityBacklog';
import TradingViewWidget from './components/TradingViewWidget';
import DailyScripture from './components/DailyScripture';
import AmbientVideo from './components/AmbientVideo';
import QuickNotes from './components/QuickNotes';
import TaskQueue from './components/TaskQueue';
import TVMode from './components/TVMode';
import SettingsPanel from './components/SettingsPanel';
import type { DashboardData, BacklogTask } from './types';
import { getSheetId, setSheetId, fetchDashboardData } from './lib/sheetsApi';
import { initGoogleAuth } from './lib/googleAuth';
import { provisionDashboardSheet } from './lib/sheetsProvisioner';

// ── LocalStorage keys ─────────────────────────────────────
const LS_YOUTUBE   = 'ar_youtube_url';
const LS_BACKLOG   = 'ar_backlog';
const DEFAULT_YT   = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

function ls<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

// ── Status pill ───────────────────────────────────────────


// ── App ───────────────────────────────────────────────────
export default function App() {

  // ── Dashboard data ─────────────────────────────────────
  const [data, setData] = useState<DashboardData>({
    schedule:  [],
    backlog:   ls<BacklogTask[]>(LS_BACKLOG, []),
    metrics:   { unsorted_files: 0, unsorted_notes: 0 },
    status:    'demo',
    timestamp: new Date().toISOString(),
  });
  
  const [hasSheet, setHasSheet] = useState<boolean>(!!getSheetId());
  const [isProvisioning, setIsProvisioning] = useState(false);

  // ── Clock ──────────────────────────────────────────────
  const [time, setTime] = useState(new Date());

  // ── Night mode ─────────────────────────────────────────
  const [isNight, setIsNight] = useState<boolean>(() => {
    const h = new Date().getHours();
    return h >= 19 || h < 8;
  });

  // ── Ambient video ──────────────────────────────────────
  const [youtubeUrl, setYoutubeUrl] = useState<string>(() => {
    try { return localStorage.getItem(LS_YOUTUBE) || DEFAULT_YT; } catch { return DEFAULT_YT; }
  });
  const showVideo = true;

  // ── UI panels ──────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tvMode, setTvMode]             = useState(false);

  // ── Effects ────────────────────────────────────────────

  useEffect(() => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const scopes = import.meta.env.VITE_GOOGLE_OAUTH_SCOPES;
      if (clientId && scopes) {
        initGoogleAuth(clientId, scopes);
      } else {
        console.error('VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_OAUTH_SCOPES missing in .env');
      }
  }, []);

  // Apply night mode to both root div AND document (for full-page bg + modals)
  useEffect(() => {
    document.documentElement.classList.toggle('night', isNight);
    document.body.style.backgroundColor = isNight ? 'var(--base)' : '';
  }, [isNight]);

  // Clock tick + auto night/day at 8am / 7pm
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setTime(now);
      const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
      if (m === 0 && s === 0) {
        if (h === 19) setIsNight(true);
        if (h === 8)  setIsNight(false);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Persist backlog
  useEffect(() => {
    try { localStorage.setItem(LS_BACKLOG, JSON.stringify(data.backlog)); } catch { /* ignore */ }
  }, [data.backlog]);

  // Persist YouTube URL
  useEffect(() => {
    try { localStorage.setItem(LS_YOUTUBE, youtubeUrl); } catch { /* ignore */ }
  }, [youtubeUrl]);

  // TV mode fullscreen request
  useEffect(() => {
    if (tvMode) {
      document.documentElement.requestFullscreen?.().catch(() => {/* ignore */});
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {/* ignore */});
    }
  }, [tvMode]);

  // ── Data fetching ──────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    if (!hasSheet) return;
    try {
      const result = await fetchDashboardData();
      if (result && result.status === 'ok') {
        setData(prev => ({
          ...prev,
          schedule:  Array.isArray(result.schedule) ? result.schedule.map((b: any, i: number) => ({ ...b, id: b.id ?? `s${i}` })) : prev.schedule,
          backlog:   Array.isArray(result.backlog)  ? result.backlog.map((b: any, i: number) => ({ ...b, id: b.id ?? `bl${i}` })) : prev.backlog,
          metrics:   (result.metrics && typeof result.metrics === 'object') ? (result.metrics as any) : prev.metrics,
          status:    'ok',
          timestamp: result.timestamp || new Date().toISOString(),
        }));
      }
    } catch {
      // Handle error implicitly
    }
  }, [hasSheet]);

  useEffect(() => {
    fetchDashboard();
    const poll = setInterval(fetchDashboard, 300_000);
    return () => clearInterval(poll);
  }, [fetchDashboard]);

  // ── Handlers ───────────────────────────────────────────
  async function handleConnectGoogle() {
    setIsProvisioning(true);
    try {
      const id = await provisionDashboardSheet();
      setSheetId(id);
      setHasSheet(true);
      fetchDashboard();
    } catch (err) {
      console.error(err);
      alert('Failed to provision template: ' + (err as Error).message);
    } finally {
      setIsProvisioning(false);
    }
  }

  function setBacklog(tasks: BacklogTask[]) {
    setData(prev => ({ ...prev, backlog: tasks }));
  }

  const fmtTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const fmtDate = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ── Render ────────────────────────────────────────────
  return (
    <div className={`min-h-screen bg-base text-ink ${isNight ? 'night' : ''} flex flex-col`}>

      <TVMode
        isOpen={tvMode}
        onClose={() => setTvMode(false)}
        schedule={data.schedule}
        isNight={isNight}
      />

      <header className="sticky top-0 z-30 bg-base border-b-2 border-zinc-900 px-4 sm:px-6">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <h1 className="text-lg font-black tracking-widest uppercase text-zinc-900 dark:text-zinc-50 hidden sm:block">Ambient Routine</h1>
          </div>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto px-4">
            {!hasSheet ? (
              <button
                onClick={handleConnectGoogle}
                disabled={isProvisioning}
                className="btn-primary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {isProvisioning ? 'Provisioning...' : 'Connect Google Account'}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-emerald bg-emerald-wash text-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse-dot" />
                <span className="text-[10px] font-black font-mono tracking-widest uppercase">
                  Connected: {getSheetId()?.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex flex-col items-end leading-none mr-2">
              <span className="text-sm font-black font-mono tracking-wider">{fmtTime}</span>
              <span className="text-[10px] text-ink-3 uppercase font-bold tracking-widest mt-1">{fmtDate}</span>
            </div>
            <button onClick={() => setTvMode(true)} className="icon-btn gap-1.5 w-auto px-3" title="TV mode">
              <span className="text-xs font-black uppercase tracking-widest">TV</span>
            </button>
            <button onClick={() => setIsNight(v => !v)} className="icon-btn px-3" title="Toggle night mode">
              <span className="text-xs font-black uppercase tracking-widest">{isNight ? 'DAY' : 'NIGHT'}</span>
            </button>
            <button onClick={() => setSettingsOpen(true)} className="icon-btn px-3" title="Settings">
              <span className="text-xs font-black uppercase tracking-widest">SET</span>
            </button>
          </div>
        </div>
      </header>

      <div className="lg:hidden px-4 pt-4 pb-2">
        <div className="card px-5 py-4 flex items-center justify-between border-2 border-zinc-900">
          <div>
            <p className="text-3xl font-black font-mono tracking-tighter leading-none">{fmtTime}</p>
            <p className="text-xs text-ink-3 uppercase font-bold tracking-widest mt-1">{fmtDate}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6">
        
        <div className="block md:hidden space-y-4">
          {/* MOBILE: Single Column Stack */}
          <div className="h-64"><TimelineBar schedule={data.schedule} onOpenSettings={() => setSettingsOpen(true)} /></div>
          <div className="h-72"><TaskQueue /></div>
          <div className="h-80"><AccountabilityBacklog backlog={data.backlog} metrics={data.metrics} onBacklogChange={setBacklog} /></div>
          <div className="h-48"><TradingViewWidget /></div>
          <div className="h-64"><QuickNotes /></div>
          <div className="h-48"><DailyScripture onOpenSettings={() => setSettingsOpen(true)} /></div>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 h-[calc(100vh-8rem)] min-h-[800px]">
          {/* DESKTOP 16:9: Strict Layout */}
          
          <div className="col-span-3 flex flex-col gap-4">
            <div className="flex-[3] min-h-0"><AccountabilityBacklog backlog={data.backlog} metrics={data.metrics} onBacklogChange={setBacklog} /></div>
            <div className="flex-[2] min-h-0"><QuickNotes /></div>
            <div className="flex-[2] min-h-0"><DailyScripture onOpenSettings={() => setSettingsOpen(true)} /></div>
          </div>

          <div className="col-span-6 flex flex-col gap-4">
            <div className="flex-1 min-h-0"><TimelineBar schedule={data.schedule} onOpenSettings={() => setSettingsOpen(true)} /></div>
            <div className="h-[200px] shrink-0"><TradingViewWidget /></div>
          </div>

          <div className="col-span-3 flex flex-col gap-4">
            <div className="flex-1 min-h-0"><TaskQueue /></div>
          </div>
        </div>
      </main>
      
      {/* Off-screen audio engine */}
      <AmbientVideo youtubeUrl={youtubeUrl} show={showVideo} onToggle={() => {}} onOpenSettings={() => {}} />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        youtubeUrl={youtubeUrl}
        onYoutubeUrlChange={setYoutubeUrl}
      />
    </div>
  );
}
