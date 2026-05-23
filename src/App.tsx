import { useState, useEffect } from 'react';
import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout/legacy';
import AccountabilityBacklog from './components/AccountabilityBacklog';
import DailyScripture from './components/DailyScripture';
import TimelineBar from './components/TimelineBar';
import TradingViewWidget from './components/TradingViewWidget';
import SettingsPanel from './components/SettingsPanel';
import AmbientVideo from './components/AmbientVideo';
import TaskQueue from './components/TaskQueue';
import QuickNotes from './components/QuickNotes';
import { mockBacklog, mockMetrics, mockSchedule } from './data/mockData';
import { initGoogleAuth } from './lib/googleAuth';
import { getSheetId, fetchDashboardData, updateSchedule } from './lib/sheetsApi';

const ResponsiveRGL = WidthProvider(ResponsiveGridLayout);
const LS_LAYOUT = 'tycodes_layout_v1';

const DEFAULT_LAYOUT: any[] = [
  { i: 'timeline', x: 0, y: 0, w: 12, h: 3 },
  { i: 'backlog', x: 0, y: 3, w: 4, h: 4 },
  { i: 'queue', x: 0, y: 7, w: 4, h: 4 },
  { i: 'watchlist', x: 4, y: 3, w: 4, h: 5 },
  { i: 'notes', x: 4, y: 8, w: 4, h: 3 },
  { i: 'scripture', x: 8, y: 3, w: 4, h: 3 },
  { i: 'ambient', x: 8, y: 6, w: 4, h: 5 }
];

export default function App() {
  const isConnected = !!getSheetId();
  const [data, setData] = useState(
    isConnected
      ? { backlog: [] as any[], metrics: {} as any, schedule: [] as any[] }
      : { backlog: mockBacklog, metrics: mockMetrics, schedule: mockSchedule }
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Lofi Girl channel ID - always points to their live stream regardless of rotating video IDs
  const [youtubeUrl, setYoutubeUrl] = useState('UCSJ4gkVC6NrvII8umztf0Ow');
  const [showVideo, setShowVideo] = useState(true);
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('tycodes_theme') !== 'light';
  });

  // Bootloader
  useEffect(() => {
    initGoogleAuth(
      import.meta.env.VITE_GOOGLE_CLIENT_ID,
      import.meta.env.VITE_GOOGLE_OAUTH_SCOPES
    );

    if (getSheetId()) {
      fetchDashboardData().then(d => {
        if (d) {
          // Always update from sheet - don't fall back to mock data
          setData({ backlog: d.backlog, metrics: d.metrics as any, schedule: d.schedule });
        } else {
          // Fetch failed (auth/network). Keep showing empty state if connected.
          console.warn('Failed to fetch dashboard data from sheet');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('tycodes_theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('tycodes_theme', 'light');
    }
  }, [isDark]);

  // Layout State
  const [layouts, setLayouts] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(LS_LAYOUT);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { lg: DEFAULT_LAYOUT, md: DEFAULT_LAYOUT, sm: DEFAULT_LAYOUT };
  });

  const setBacklog = (newBacklog: any) => setData(prev => ({ ...prev, backlog: newBacklog }));

  const handleScheduleChange = async (newSchedule: any[]) => {
    setData(prev => ({ ...prev, schedule: newSchedule }));
    if (getSheetId()) {
      await updateSchedule(newSchedule);
    }
  };

  const handleLayoutChange = (_layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem(LS_LAYOUT, JSON.stringify(allLayouts));
  };

  // Drag handle component wrapper
  const Wrapper = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`flex flex-col h-full relative group ${className}`}>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-raised/90 backdrop-blur shadow-sm rounded-full px-3 py-1 drag-handle border border-edge flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing">
        <svg className="w-3.5 h-3.5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col no-theme-transition">
      
      {/* ── Navbar ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b-2 border-edge bg-base shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded border-2 border-edge bg-raised flex items-center justify-center">
            <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <h1 className="text-[13px] font-bold tracking-[0.2em] uppercase text-ink">Dashboard</h1>
        </div>
        <nav className="flex items-center gap-6">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-8 h-8 rounded-full border border-edge bg-raised flex items-center justify-center text-ink-2 hover:text-amber transition-colors"
            title="Toggle Day/Night Mode"
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <a href="#" className="text-xs font-bold tracking-widest text-ink-3 hover:text-ink transition-colors uppercase">Home</a>
          <a href="#" className="text-xs font-bold tracking-widest text-ink transition-colors uppercase">Routine</a>
          <button 
            onClick={() => setSettingsOpen(true)}
            className="text-xs font-bold tracking-widest text-ink-3 hover:text-ink transition-colors uppercase"
          >
            Settings
          </button>
        </nav>
      </header>

      {/* ── Main Dashboard Grid ── */}
      <main className="flex-1 p-6 relative overflow-x-hidden">
        
        {/* MOBILE: Stack with dynamic heights */}
        <div className="flex flex-col gap-4 md:hidden">
          <div><TimelineBar schedule={data.schedule} onScheduleChange={handleScheduleChange} /></div>
          <div><TaskQueue /></div>
          <div><AccountabilityBacklog backlog={data.backlog} metrics={data.metrics} onBacklogChange={setBacklog} /></div>
          <div><TradingViewWidget /></div>
          <div><QuickNotes /></div>
          <div><DailyScripture /></div>
          <div><AmbientVideo youtubeUrl={youtubeUrl} show={showVideo} onToggle={() => setShowVideo(v => !v)} onOpenSettings={() => setSettingsOpen(true)} /></div>
        </div>

        {/* DESKTOP: React-Grid-Layout Drag & Drop Engine */}
        <div className="hidden md:block">
          <ResponsiveRGL
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={80}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            margin={[16, 16]}
            isBounded={true}
            compactType="vertical"
            preventCollision={false}
          >
            <div key="backlog">
              <Wrapper>
                <AccountabilityBacklog backlog={data.backlog} metrics={data.metrics} onBacklogChange={setBacklog} />
              </Wrapper>
            </div>
            
            <div key="queue">
              <Wrapper>
                <TaskQueue />
              </Wrapper>
            </div>

            <div key="watchlist">
              <Wrapper>
                <TradingViewWidget />
              </Wrapper>
            </div>

            <div key="notes">
              <Wrapper>
                <QuickNotes />
              </Wrapper>
            </div>

            <div key="scripture">
              <Wrapper>
                <DailyScripture />
              </Wrapper>
            </div>

            <div key="ambient">
              <Wrapper>
                <AmbientVideo youtubeUrl={youtubeUrl} show={showVideo} onToggle={() => setShowVideo(v => !v)} onOpenSettings={() => setSettingsOpen(true)} />
              </Wrapper>
            </div>

            <div key="timeline">
              <Wrapper>
                <TimelineBar schedule={data.schedule} onScheduleChange={handleScheduleChange} />
              </Wrapper>
            </div>
          </ResponsiveRGL>
        </div>
      </main>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        youtubeUrl={youtubeUrl}
        onYoutubeUrlChange={setYoutubeUrl}
      />
    </div>
  );
}
