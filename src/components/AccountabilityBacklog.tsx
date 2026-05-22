import { useState, useRef } from 'react';
import type { BacklogTask, DashboardMetrics } from '../types';
import { appendBacklogTask, markTask, deleteBacklogTask } from '../lib/sheetsApi';

interface Props {
  backlog: BacklogTask[];
  metrics: DashboardMetrics;
  onBacklogChange: (tasks: BacklogTask[]) => void;
  onOpenSettings?: () => void;
}

const STATUS_CFG = {
  missed:  { label: 'Missed',  pill: 'pill-rose',    dot: 'var(--rose)' },
  pending: { label: 'Pending', pill: 'pill-amber',   dot: 'var(--amber)' },
  done:    { label: 'Done',    pill: 'pill-emerald',  dot: 'var(--emerald)' },
} as const;

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

export default function AccountabilityBacklog({ backlog, metrics, onBacklogChange }: Props) {
  const [newName, setNewName]   = useState('');
  const [newStatus, setNewStatus] = useState<'missed' | 'pending'>('pending');
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const missed  = backlog.filter(t => t.Status === 'missed');
  const pending = backlog.filter(t => t.Status === 'pending');
  const done    = backlog.filter(t => t.Status === 'done');
  const totalClutter = (metrics.unsorted_files || 0) + (metrics.unsorted_notes || 0);

  async function addTask() {
    const name = newName.trim();
    if (!name) return;
    const now  = new Date().toISOString();
    const task: BacklogTask = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      TaskName:  name,
      Status:    newStatus,
      Timestamp: now,
    };
    onBacklogChange([task, ...backlog]);
    setNewName('');
    setShowAdd(false);
    setSaving(true);
    await appendBacklogTask(name, newStatus, now);
    setSaving(false);
  }

  async function removeFn(task: BacklogTask) {
    onBacklogChange(backlog.filter(t => t.id !== task.id));
    await deleteBacklogTask(task.TaskName);
  }

  async function markDone(task: BacklogTask) {
    onBacklogChange(backlog.map(t => t.id === task.id ? { ...t, Status: 'done' } : t));
    await markTask(task.TaskName, 'done');
  }

  const displayList = [...missed, ...pending, ...done].slice(0, 12);

  return (
    <div className="card flex flex-col gap-0 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-edge shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="section-label">Accountability</p>
          {saving && <span className="text-[9px] text-ink-3 font-mono animate-pulse-dot">saving…</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {missed.length > 0 && <span className="pill pill-rose">{missed.length} missed</span>}
          <button
            id="accountability-add-btn"
            onClick={() => { setShowAdd(v => !v); setTimeout(() => inputRef.current?.focus(), 60); }}
            className="icon-btn"
            aria-label={showAdd ? 'Cancel' : 'Settings'}
            title={showAdd ? 'Cancel' : 'Settings'}
          >
            {showAdd ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Inline add form */}
      {showAdd && (
        <div className="px-4 pt-3 pb-3 border-b border-edge animate-scale-in shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="task-name-input"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Task name…"
              className="field flex-1 text-xs py-1.5"
            />
            <select
              id="task-status-select"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as 'missed' | 'pending')}
              className="field w-28 text-xs py-1.5 cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="missed">Missed</option>
            </select>
            <button
              id="task-add-submit-btn"
              onClick={addTask}
              disabled={!newName.trim()}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Metrics strip */}
      <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
        {[
          { label: 'Files',   val: metrics.unsorted_files || 0,  color: 'var(--amber)' },
          { label: 'Notes',   val: metrics.unsorted_notes || 0,  color: 'var(--violet)' },
          { label: 'Missed',  val: missed.length,                 color: 'var(--rose)' },
          { label: 'Open',    val: pending.length,                color: 'var(--emerald)' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex-1 rounded-xl px-2 py-2 border border-edge bg-raised text-center">
            <p className="text-[9px] text-ink-3 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-bold font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-1.5 min-h-0">
        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-ink-3">
            <svg className="w-7 h-7 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs">All clear! Tap + to add a task.</p>
          </div>
        ) : displayList.map((task, i) => {
          const cfg = STATUS_CFG[task.Status];
          return (
            <div
              key={task.id}
              className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-edge hover:border-edge-hi bg-raised transition-all duration-150 animate-fade-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <button
                onClick={() => task.Status !== 'done' && markDone(task)}
                className="w-4 h-4 rounded-full border-2 shrink-0 cursor-pointer flex items-center justify-center transition-all duration-200"
                style={{ borderColor: cfg.dot, background: task.Status === 'done' ? cfg.dot : 'transparent' }}
                aria-label="Mark done"
              >
                {task.Status === 'done' && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <span className={`text-xs flex-1 truncate ${task.Status === 'done' ? 'line-through text-ink-3' : 'text-ink'}`}>
                {task.TaskName}
              </span>
              <span className="text-[9px] font-mono text-ink-3 shrink-0 hidden sm:inline">{timeAgo(task.Timestamp)}</span>
              <span className={`pill ${cfg.pill} shrink-0 hidden md:inline-flex`}>{cfg.label}</span>
              <button
                onClick={() => removeFn(task)}
                className="icon-btn w-5 h-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Remove task"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {totalClutter > 0 && (
        <div className="px-5 py-2.5 border-t border-edge shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-ink-3">Unsorted clutter</span>
          <span className="pill pill-rose">{totalClutter} items</span>
        </div>
      )}
    </div>
  );
}
