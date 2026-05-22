import type { ScheduleBlock } from '../types';
import { useState, useEffect, useMemo } from 'react';

interface Props {
  schedule: ScheduleBlock[];
  onOpenSettings?: () => void;
}

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fmt12(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const p = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${p}`;
}

function timeLeft(endMin: number, currentMin: number) {
  const diff = endMin - currentMin;
  if (diff <= 0) return null;
  if (diff < 60) return `${diff}m left`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
}

// Maps raw hex → CSS variable accent
const COLOR_MAP: Record<string, string> = {
  '#6366f1': 'var(--indigo)', '#4338ca': 'var(--indigo)', '#818cf8': 'var(--indigo)',
  '#06b6d4': 'var(--cyan)',   '#22d3ee': 'var(--cyan)',   '#0e7490': 'var(--cyan)',
  '#10b981': 'var(--emerald)','#34d399': 'var(--emerald)','#047857': 'var(--emerald)',
  '#f43f5e': 'var(--rose)',   '#fb7185': 'var(--rose)',   '#be123c': 'var(--rose)',
  '#f59e0b': 'var(--amber)',  '#fcd34d': 'var(--amber)',  '#92400e': 'var(--amber)',
  '#8b5cf6': 'var(--violet)', '#a78bfa': 'var(--violet)',
  '#0ea5e9': 'var(--sky)',    '#38bdf8': 'var(--sky)',
};

function resolveColor(hex: string): string {
  return COLOR_MAP[hex.toLowerCase()] ?? 'var(--ink-2)';
}

function DayArc({ pct }: { pct: number }) {
  const R = 20;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r={R} fill="none" stroke="var(--edge-hi)" strokeWidth="4" />
      <circle
        cx="24" cy="24" r={R}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeDasharray={C}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text
        x="24" y="28"
        textAnchor="middle"
        fontSize="10"
        fontWeight="900"
        fontFamily="var(--font-mono)"
        fill="var(--ink)"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export default function TimelineBar({ schedule, onOpenSettings }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const curMin = now.getHours() * 60 + now.getMinutes();
  const dayPct = (curMin / (24 * 60)) * 100;

  const { activeBlock, upcomingBlocks } = useMemo(() => {
    let active: ScheduleBlock | null = null;
    const upcoming: ScheduleBlock[] = [];

    for (const b of schedule) {
      const s = toMin(b.StartTime);
      const e = toMin(b.EndTime);
      if (e <= curMin) {
        // past
      } else if (s <= curMin && curMin < e) {
        active = b;
      } else {
        upcoming.push(b);
      }
    }
    return { activeBlock: active, upcomingBlocks: upcoming };
  }, [schedule, curMin]);

  return (
    <div className="card flex flex-col h-full animate-fade-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b-2 border-edge shrink-0">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-ink mb-1">Today's Schedule</p>
          <p className="text-2xl font-black font-mono text-ink tracking-tight">
            {fmt12(curMin)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DayArc pct={dayPct} />
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="icon-btn" aria-label="Settings" title="Settings">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable body (Horizontal Bubbles) ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        
        {/* Active Block */}
        {activeBlock ? (
          <div className="mb-6 p-4 border-2 border-edge bg-ink text-base animate-scale-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-black uppercase tracking-widest text-card leading-tight">
                  {activeBlock.TaskName}
                </p>
                <p className="text-xs text-raised font-mono mt-2 font-bold tracking-wider">
                  {activeBlock.StartTime} — {activeBlock.EndTime}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="pill pill-amber border-2 border-card">Now</span>
                {timeLeft(toMin(activeBlock.EndTime), curMin) && (
                  <span className="text-[11px] font-mono font-black text-amber">
                    {timeLeft(toMin(activeBlock.EndTime), curMin)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 border-2 border-edge bg-raised">
            <span className="w-3 h-3 bg-ink animate-pulse-dot" />
            <p className="text-sm font-black uppercase tracking-widest text-ink">No active block</p>
          </div>
        )}

        {/* Bubbles */}
        <div className="flex flex-wrap gap-3">
          {upcomingBlocks.map((b, i) => {
            const color = resolveColor(b.Color);
            return (
              <div 
                key={`${b.TaskName}-${b.StartTime}`} 
                className="flex flex-col gap-1 px-4 py-3 border-2 border-edge bg-card min-w-[140px] flex-1 animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 border-2 border-edge" style={{ background: color }} />
                  <span className="text-[10px] font-black font-mono tracking-widest text-ink">{b.StartTime}</span>
                </div>
                <span className="text-sm font-black uppercase tracking-wider text-ink line-clamp-2 leading-snug">
                  {b.TaskName}
                </span>
              </div>
            );
          })}
        </div>

        {schedule.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-ink-3">
            <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-xs font-black tracking-widest uppercase">No schedule loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
