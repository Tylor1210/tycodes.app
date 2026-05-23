import type { ScheduleBlock, QueueTask } from '../types';
import { useState, useEffect, useMemo } from 'react';

interface Props {
  schedule: ScheduleBlock[];
  onScheduleChange?: (schedule: ScheduleBlock[]) => void;
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
  let diff = endMin - currentMin;
  if (diff < 0) diff += 1440; // wrap around for overnight tasks
  if (diff === 0) return null;
  if (diff < 60) return `${diff}m left`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
}

// Use raw hex directly — no mapping needed since we use inline style backgrounds
function resolveColor(hex: string): string {
  // Return as-is; supports any hex from the color picker
  if (!hex || hex.trim() === '') return '#6366f1';
  return hex.trim();
}

function DayArc({ pct }: { pct: number }) {
  const R = 18;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={R} fill="none" stroke="var(--edge-hi)" strokeWidth="3" />
      <circle
        cx="22" cy="22" r={R}
        fill="none"
        stroke="var(--rose)"
        strokeWidth="3"
        strokeDasharray={C}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text
        x="22" y="26"
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fontFamily="var(--font-mono)"
        fill="var(--ink)"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

const DEFAULT_BLOCKS: ScheduleBlock[] = [
  { StartTime: '06:00', EndTime: '07:00', TaskName: 'Workout', Color: '#10b981' },
  { StartTime: '07:00', EndTime: '08:00', TaskName: 'Breakfast', Color: '#f59e0b' },
  { StartTime: '12:00', EndTime: '13:00', TaskName: 'Lunch', Color: '#f59e0b' },
  { StartTime: '18:00', EndTime: '19:00', TaskName: 'Dinner', Color: '#f59e0b' },
  { StartTime: '22:00', EndTime: '06:00', TaskName: 'Sleep', Color: '#6366f1' },
];

export default function TimelineBar({ schedule, onScheduleChange }: Props) {
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Add Form State
  const [addName, setAddName] = useState('');
  const [addStart, setAddStart] = useState('09:00');
  const [addEnd, setAddEnd] = useState('10:00');
  const [addColor, setAddColor] = useState('#6366f1');

  // Task Queue integration
  const [queuedTasks, setQueuedTasks] = useState<QueueTask[]>([]);

  useEffect(() => {
    try {
      const q = JSON.parse(localStorage.getItem('ar_queue') || '[]');
      setQueuedTasks(q.filter((t: QueueTask) => t.status === 'queued'));
    } catch {}
  }, [showAdd]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const curMin = now.getHours() * 60 + now.getMinutes();
  
  const { firstMin, lastMin } = useMemo(() => {
    if (schedule.length === 0) return { firstMin: 0, lastMin: 1440 };
    const mins = schedule.map(b => toMin(b.StartTime));
    return { firstMin: Math.min(...mins), lastMin: Math.max(...mins) };
  }, [schedule]);

  let dayPct = 0;
  if (curMin >= lastMin) dayPct = 100;
  else if (curMin <= firstMin) dayPct = 0;
  else dayPct = ((curMin - firstMin) / (lastMin - firstMin)) * 100;
  
  // Bar uses total day 1440 for sweeping
  const absoluteDayPct = (curMin / 1440) * 100;

  const { activeBlock } = useMemo(() => {
    let active: ScheduleBlock | null = null;

    // Sort schedule
    const sorted = [...schedule].sort((a, b) => toMin(a.StartTime) - toMin(b.StartTime));

    for (const b of sorted) {
      const s = toMin(b.StartTime);
      const e = toMin(b.EndTime);
      
      const isActive = s < e 
        ? (curMin >= s && curMin < e)
        : (curMin >= s || curMin < e); // overnight block

      if (isActive) {
        active = b;
      }
    }
    return { activeBlock: active };
  }, [schedule, curMin]);

  const handleAdd = () => {
    if (!addName.trim() || !onScheduleChange) return;
    const newBlock: ScheduleBlock = {
      StartTime: addStart,
      EndTime: addEnd,
      TaskName: addName.trim(),
      Color: addColor
    };
    
    if (editIndex !== null) {
      const updated = [...schedule];
      updated[editIndex] = newBlock;
      onScheduleChange(updated);
    } else {
      onScheduleChange([...schedule, newBlock]);
    }
    
    setShowAdd(false);
    setAddName('');
    setEditIndex(null);
  };

  const handleEditClick = (index: number, block: ScheduleBlock) => {
    setEditIndex(index);
    setAddName(block.TaskName);
    setAddStart(block.StartTime);
    setAddEnd(block.EndTime);
    setAddColor(block.Color);
    setShowAdd(true);
    setShowSettings(false);
  };

  const handleDelete = (index: number) => {
    if (!onScheduleChange) return;
    const updated = [...schedule];
    updated.splice(index, 1);
    onScheduleChange(updated);
  };

  const loadDefaults = () => {
    if (!onScheduleChange) return;
    if (confirm('Overwrite your entire schedule with daily defaults?')) {
      onScheduleChange(DEFAULT_BLOCKS);
      setShowSettings(false);
    }
  };

  const clearTimeline = () => {
    if (!onScheduleChange) return;
    if (confirm('Clear the entire timeline?')) {
      onScheduleChange([]);
      setShowSettings(false);
    }
  };

  return (
    <div className="card flex flex-col h-full animate-fade-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 relative">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink mb-1">Today's Schedule</p>
          <p className="text-2xl font-bold font-mono text-ink tracking-tight">
            {fmt12(curMin)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DayArc pct={dayPct} />
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditIndex(null); setAddName(''); setShowAdd(!showAdd); setShowSettings(false); }} className="icon-btn border border-edge" aria-label="Add Block" title="Add Block">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
               </svg>
            </button>
            <button onClick={() => { setShowSettings(!showSettings); setShowAdd(false); }} className="icon-btn border border-edge" aria-label="Settings" title="Settings">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Popups */}
        {showSettings && (
          <div className="absolute right-6 top-[72px] bg-card border border-edge rounded-lg shadow-float p-4 z-20 w-64 animate-fade-up">
            <p className="text-xs text-ink font-bold uppercase tracking-wider mb-3">Timeline Templates</p>
            <div className="flex flex-col gap-2">
              <button onClick={loadDefaults} className="btn-ghost w-full py-2 text-xs text-left justify-start gap-2 hover:bg-raised">
                <svg className="w-3.5 h-3.5 text-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Load Daily Defaults
              </button>
              <button onClick={clearTimeline} className="btn-ghost w-full py-2 text-xs text-left justify-start gap-2 hover:bg-rose/10 hover:text-rose transition-colors">
                <svg className="w-3.5 h-3.5 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                Clear Timeline
              </button>
            </div>
          </div>
        )}

        {showAdd && (
          <div className="absolute left-6 right-6 top-[72px] bg-card border border-edge rounded-lg shadow-float p-4 z-20 animate-fade-up">
            <p className="text-xs text-ink font-bold uppercase tracking-wider mb-3">
              {editIndex !== null ? 'Edit Timeline Block' : 'Add Timeline Block'}
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-ink-3 uppercase mb-1 block">Task Name</label>
                <div className="flex gap-2">
                  <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Type name..." className="field text-sm py-1.5 flex-1" />
                  {queuedTasks.length > 0 && (
                    <select onChange={e => setAddName(e.target.value)} className="field text-xs py-1.5 w-8 flex-none px-1 bg-raised border-edge text-ink cursor-pointer" title="Select from Queue">
                      <option value="">+</option>
                      {queuedTasks.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-ink-3 uppercase mb-1 block">Start</label>
                  <input type="time" value={addStart} onChange={e => setAddStart(e.target.value)} className="field text-sm py-1.5 px-2" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-ink-3 uppercase mb-1 block">End</label>
                  <input type="time" value={addEnd} onChange={e => setAddEnd(e.target.value)} className="field text-sm py-1.5 px-2" />
                </div>
                <div className="w-10">
                  <label className="text-[10px] font-bold text-ink-3 uppercase mb-1 block">Color</label>
                  <input type="color" value={addColor} onChange={e => setAddColor(e.target.value)} className="w-full h-[34px] rounded cursor-pointer border-0 p-0" />
                </div>
              </div>
              <button onClick={handleAdd} className="btn-primary py-2 mt-1 font-bold text-xs">
                {editIndex !== null ? 'Save Changes' : 'Drop on Timeline'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Visual Timeline Bar ── */}
      <div className="mx-6 mt-4 relative h-3 bg-raised border border-edge rounded-full overflow-hidden shrink-0 shadow-inner">
        {/* Render Blocks */}
        {schedule.map((b, i) => {
          const s = toMin(b.StartTime);
          const e = toMin(b.EndTime);
          const color = resolveColor(b.Color);
          
          if (e > s) {
            // Normal block
            const left = (s / 1440) * 100;
            const width = ((e - s) / 1440) * 100;
            return <div key={i} className="absolute top-0 bottom-0 opacity-80" style={{ left: `${left}%`, width: `${width}%`, background: color }} />;
          } else {
            // Overnight block (wraps around)
            const left1 = (s / 1440) * 100;
            const width1 = ((1440 - s) / 1440) * 100;
            const left2 = 0;
            const width2 = (e / 1440) * 100;
            return (
              <div key={i}>
                <div className="absolute top-0 bottom-0 opacity-80" style={{ left: `${left1}%`, width: `${width1}%`, background: color }} />
                <div className="absolute top-0 bottom-0 opacity-80" style={{ left: `${left2}%`, width: `${width2}%`, background: color }} />
              </div>
            );
          }
        })}

        {/* Live Indicator */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-rose shadow-[0_0_8px_rgba(244,63,94,0.8)] z-10 transition-all duration-1000 ease-linear" style={{ left: `${absoluteDayPct}%` }} />
      </div>

      {/* ── Ticks for 6am, 12pm, 6pm ── */}
      <div className="mx-6 mt-1 flex justify-between text-[8px] font-mono font-bold text-ink-3 uppercase tracking-wider shrink-0 px-1">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>

      {/* ── Scrollable body (Horizontal Bubbles) ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 relative z-0 border-t border-edge mt-3">
        
        {/* Active Block */}
        {activeBlock ? (
          <div className="mb-6 p-4 border border-edge bg-ink text-base animate-scale-in relative group rounded-xl">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-bold uppercase tracking-wider text-card leading-tight">
                  {activeBlock.TaskName}
                </p>
                <p className="text-xs text-raised font-mono mt-2 font-bold tracking-wider">
                  {activeBlock.StartTime} — {activeBlock.EndTime}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="pill pill-amber border border-card bg-amber/20">Now</span>
                {timeLeft(toMin(activeBlock.EndTime), curMin) && (
                  <span className="text-[11px] font-mono font-bold text-amber">
                    {timeLeft(toMin(activeBlock.EndTime), curMin)}
                  </span>
                )}
              </div>
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleEditClick(schedule.indexOf(activeBlock), activeBlock)}
                className="p-1.5 bg-raised text-ink-2 hover:text-amber rounded-md shadow-sm" 
                title="Edit block"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.127l-3.196 1.066a.75.75 0 01-.95-.95l1.066-3.196a4.5 4.5 0 011.127-1.89l13.173-13.173z" /></svg>
              </button>
              <button 
                onClick={() => handleDelete(schedule.indexOf(activeBlock))}
                className="p-1.5 bg-rose text-white rounded-md shadow-sm hover:bg-rose-600" 
                title="Delete block"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 border border-edge bg-raised rounded-xl">
            <span className="w-3 h-3 bg-ink animate-pulse-dot rounded-full" />
            <p className="text-sm font-bold uppercase tracking-wider text-ink">No active block</p>
          </div>
        )}

        {/* Blocks List — sorted with live NOW marker */}
        <div className="flex flex-col gap-1.5 pb-6">
          {schedule.length > 0 && (
            <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-1">Full Schedule</p>
          )}
          {(() => {
            const sorted = [...schedule].sort((a, b) => toMin(a.StartTime) - toMin(b.StartTime));
            const visible = sorted.slice(0, showAll ? undefined : 6);
            let nowInserted = false;

            return visible.map((b, i) => {
              const color = resolveColor(b.Color);
              const s = toMin(b.StartTime);
              const e = toMin(b.EndTime);
              const isPast = e > s ? (curMin >= e) : false;
              const isActive = activeBlock?.TaskName === b.TaskName && activeBlock?.StartTime === b.StartTime;
              const isUpcoming = !isPast && !isActive && s > curMin;

              // Insert NOW divider before first upcoming block
              const insertNow = !nowInserted && isUpcoming;
              if (insertNow) nowInserted = true;

              return (
                <div key={i}>
                  {insertNow && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-rose/40" />
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose animate-pulse" />
                        NOW — {fmt12(curMin)}
                      </span>
                      <div className="flex-1 h-px bg-rose/40" />
                    </div>
                  )}
                  <div
                    className={`group flex items-center justify-between gap-3 px-3 py-2 border rounded-lg transition-colors ${
                      isActive
                        ? 'border-amber/50 bg-amber/10 ring-1 ring-amber/30'
                        : isPast
                        ? 'border-edge/40 bg-card opacity-40'
                        : 'border-edge bg-card hover:bg-raised'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                        isActive ? 'border-amber animate-pulse' : 'border-edge'
                      }`} style={{ background: isActive ? 'var(--amber)' : color }} />
                      <span className={`text-[10px] font-bold font-mono tracking-wider shrink-0 ${
                        isActive ? 'text-amber' : isPast ? 'text-ink-3' : 'text-ink-3'
                      }`}>{b.StartTime}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider truncate ${
                        isActive ? 'text-amber font-black' : isPast ? 'text-ink-3' : 'text-ink'
                      }`}>
                        {b.TaskName}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber shrink-0">● Now</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleEditClick(schedule.indexOf(b), b)}
                        className="icon-btn w-6 h-6 rounded-md bg-raised text-ink-2 hover:text-amber"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.127l-3.196 1.066a.75.75 0 01-.95-.95l1.066-3.196a4.5 4.5 0 011.127-1.89l13.173-13.173z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.indexOf(b))}
                        className="icon-btn w-6 h-6 rounded-md bg-raised text-rose hover:bg-rose/10"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
          {schedule.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] font-bold uppercase tracking-wider text-ink-3 hover:text-ink transition-colors mt-1 py-1"
            >
              {showAll ? 'Show Less' : `Show All (${schedule.length - 6} more)`}
            </button>
          )}
        </div>



        {schedule.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-ink-3">
            <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-xs font-bold tracking-wider uppercase">Timeline Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
