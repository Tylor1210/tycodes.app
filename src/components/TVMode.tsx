import { useEffect, useState } from 'react';
import type { ScheduleBlock, QueueTask } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleBlock[];
  isNight: boolean;
}

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}


function fmtElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const COLOR_MAP: Record<string, string> = {
  '#6366f1': 'var(--indigo)', '#4338ca': 'var(--indigo)',
  '#06b6d4': 'var(--cyan)',   '#0e7490': 'var(--cyan)',
  '#10b981': 'var(--emerald)','#047857': 'var(--emerald)',
  '#f43f5e': 'var(--rose)',   '#be123c': 'var(--rose)',
  '#f59e0b': 'var(--amber)',  '#92400e': 'var(--amber)',
  '#8b5cf6': 'var(--violet)',
  '#0ea5e9': 'var(--sky)',
};
function resolveColor(hex: string) { return COLOR_MAP[hex.toLowerCase()] ?? 'var(--ink-2)'; }

function loadQueue(): QueueTask[] {
  try { const v = localStorage.getItem('ar_queue'); return v ? JSON.parse(v) : []; }
  catch { return []; }
}

export default function TVMode({ isOpen, onClose, schedule, isNight }: Props) {
  const [now, setNow]   = useState(new Date());
  const [tick, setTick] = useState(0);
  const [queue, setQueue] = useState<QueueTask[]>([]);

  // Sync clock + tick
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => {
      setNow(new Date());
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Sync queue from localStorage
  useEffect(() => {
    if (!isOpen) return;
    setQueue(loadQueue());
    const id = setInterval(() => setQueue(loadQueue()), 2000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!isOpen) return null;

  const curMin = now.getHours() * 60 + now.getMinutes();
  const dayPct = (curMin / (24 * 60)) * 100;

  const activeBlock   = schedule.find(b => toMin(b.StartTime) <= curMin && curMin < toMin(b.EndTime));
  const upcomingBlocks = schedule.filter(b => toMin(b.StartTime) > curMin).slice(0, 3);

  const activeTask = queue.find(t => t.status === 'active');
  const liveElapsed = activeTask
    ? (activeTask.totalElapsed + (activeTask.sessionStart !== null ? Date.now() - activeTask.sessionStart : 0))
    : 0;

  void tick;

  const fmtTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const fmtDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${isNight ? 'night' : ''}`}
      style={{ background: 'var(--base)', fontFamily: 'var(--font-sans)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-12 py-6 shrink-0" style={{ borderBottom: '1px solid var(--edge)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--indigo), var(--cyan))' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-ink-2">Ambient Routine</span>
        </div>
        <span className="text-base text-ink-3">{fmtDate}</span>
        <button
          onClick={onClose}
          className="icon-btn w-9 h-9 rounded-xl"
          aria-label="Exit TV mode"
          title="Exit TV mode (Esc)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Main grid ──────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[1fr_2fr_1fr] gap-8 px-12 py-8 min-h-0 overflow-hidden">

        {/* Left — Schedule ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 justify-center">
          <p className="section-label text-base tracking-wider">Today's Schedule</p>

          {activeBlock ? (
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'var(--amber-wash)',
                border: '1px solid var(--amber-edge)',
                borderLeft: '4px solid var(--amber)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse-dot" style={{ background: 'var(--amber)' }} />
                <span className="text-sm font-bold uppercase tracking-wider text-amber">Now</span>
              </div>
              <p className="text-2xl font-bold text-ink leading-tight">{activeBlock.TaskName}</p>
              <p className="text-base font-mono text-ink-2 mt-1">{activeBlock.StartTime} — {activeBlock.EndTime}</p>
            </div>
          ) : (
            <div className="rounded-2xl p-5 border border-edge bg-raised">
              <p className="text-xl text-ink-3">No active block</p>
            </div>
          )}

          {upcomingBlocks.map((b, i) => (
            <div
              key={`${b.TaskName}-${b.StartTime}`}
              className="flex items-center gap-4 px-4 py-3 rounded-xl border border-edge bg-raised"
              style={{ opacity: 1 - i * 0.2 }}
            >
              <span className="w-2 h-8 rounded-full shrink-0" style={{ background: resolveColor(b.Color) }} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink truncate">{b.TaskName}</p>
                <p className="text-sm font-mono text-ink-3">{b.StartTime}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Center — Clock ──────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center gap-4">
          <p
            className="font-bold font-mono tracking-tight text-ink leading-none select-none"
            style={{ fontSize: 'clamp(4rem, 9vw, 10rem)' }}
          >
            {fmtTime}
          </p>

          {/* Day progress bar */}
          <div className="w-full max-w-xs relative">
            <div className="h-1.5 rounded-full" style={{ background: 'var(--edge-hi)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${dayPct}%`, background: 'var(--amber)' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs font-mono text-ink-3">12 AM</span>
              <span className="text-xs font-mono text-amber">{Math.round(dayPct)}% of day</span>
              <span className="text-xs font-mono text-ink-3">11:59 PM</span>
            </div>
          </div>

          {/* Active queue task timer */}
          {activeTask && (
            <div
              className="mt-4 rounded-2xl px-8 py-5 text-center"
              style={{ background: 'var(--indigo-wash)', border: '1px solid var(--indigo-edge)' }}
            >
              <p className="section-label mb-2">Working On</p>
              <p className="text-xl font-semibold text-ink mb-3 truncate max-w-xs">{activeTask.title}</p>
              <p
                className="font-bold font-mono text-indigo leading-none"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
              >
                {fmtElapsed(liveElapsed)}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-indigo animate-pulse-dot" />
                <span className="text-sm font-mono text-indigo">live</span>
              </div>
            </div>
          )}
        </div>

        {/* Right — Upcoming queue ──────────────────────────── */}
        <div className="flex flex-col gap-4 justify-center">
          <p className="section-label text-base tracking-wider">Up Next</p>
          {queue.filter(t => t.status === 'queued').length === 0 ? (
            <p className="text-lg text-ink-3">Queue is empty</p>
          ) : (
            queue.filter(t => t.status === 'queued').slice(0, 4).map((t, i) => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-edge bg-raised"
                style={{ opacity: 1 - i * 0.18 }}
              >
                <span className="text-lg font-bold font-mono text-ink-3 w-6 shrink-0 text-center">{i + 1}</span>
                <p className="text-lg text-ink truncate flex-1">{t.title}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Hint bar ─────────────────────────────────────────── */}
      <div className="flex justify-center pb-4 shrink-0">
        <p className="text-xs text-ink-3 font-mono">Press Esc or click × to exit TV mode</p>
      </div>
    </div>
  );
}
