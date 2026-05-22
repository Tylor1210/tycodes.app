import { useState, useEffect, useRef } from 'react';
import type { QueueTask } from '../types';

const LS_KEY = 'ar_queue';

function ls<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

function fmtElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getLiveElapsed(task: QueueTask): number {
  if (task.status === 'active' && task.sessionStart !== null) {
    return task.totalElapsed + (Date.now() - task.sessionStart);
  }
  return task.totalElapsed;
}

export default function TaskQueue() {
  const [queue, setQueue] = useState<QueueTask[]>(() => {
    // Restore active task: re-set sessionStart to now (page was refreshed mid-task)
    const saved = ls<QueueTask[]>(LS_KEY, []);
    return saved.map(t => {
      if (t.status === 'active' && t.sessionStart !== null) {
        // Keep accumulated elapsed, reset session to now
        return { ...t, sessionStart: Date.now() };
      }
      return t;
    });
  });

  const [draft, setDraft] = useState('');
  const [tick, setTick] = useState(0);          // Forces re-render for live timer
  const [showAdd, setShowAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist to localStorage
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(queue)); }
    catch { /* ignore */ }
  }, [queue]);

  // Tick every second when a task is active
  useEffect(() => {
    const active = queue.find(t => t.status === 'active');
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [queue]);

  // ── Actions ────────────────────────────────────────────────

  function createTask(startNow: boolean) {
    const title = draft.trim();
    if (!title) return;
    const now = Date.now();
    const newTask: QueueTask = {
      id:           `${now}-${Math.random().toString(36).slice(2)}`,
      title,
      addedAt:      new Date().toISOString(),
      totalElapsed: 0,
      sessionStart: startNow ? now : null,
      status:       startNow ? 'active' : 'queued',
    };

    setQueue(prev => {
      // If starting now, pause any currently active task
      const updated = startNow
        ? prev.map(t => {
            if (t.status === 'active' && t.sessionStart !== null) {
              return { ...t, status: 'paused' as const, totalElapsed: t.totalElapsed + (Date.now() - t.sessionStart), sessionStart: null };
            }
            return t;
          })
        : prev;
      return [...updated, newTask];
    });

    setDraft('');
    setShowAdd(false);
  }

  function startTask(id: string) {
    const now = Date.now();
    setQueue(prev =>
      prev.map(t => {
        if (t.id === id) return { ...t, status: 'active', sessionStart: now };
        // Pause any other active task
        if (t.status === 'active' && t.sessionStart !== null) {
          return { ...t, status: 'paused', totalElapsed: t.totalElapsed + (now - t.sessionStart), sessionStart: null };
        }
        return t;
      })
    );
  }

  function pauseTask(id: string) {
    const now = Date.now();
    setQueue(prev =>
      prev.map(t =>
        t.id === id && t.status === 'active' && t.sessionStart !== null
          ? { ...t, status: 'paused', totalElapsed: t.totalElapsed + (now - t.sessionStart), sessionStart: null }
          : t
      )
    );
  }

  function resumeTask(id: string) {
    const now = Date.now();
    setQueue(prev =>
      prev.map(t => {
        if (t.id === id) return { ...t, status: 'active', sessionStart: now };
        if (t.status === 'active' && t.sessionStart !== null) {
          return { ...t, status: 'paused', totalElapsed: t.totalElapsed + (now - t.sessionStart), sessionStart: null };
        }
        return t;
      })
    );
  }

  function finishTask(id: string) {
    const now = Date.now();
    setQueue(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          const elapsed = t.status === 'active' && t.sessionStart !== null
            ? t.totalElapsed + (now - t.sessionStart)
            : t.totalElapsed;
          return { ...t, status: 'done' as const, totalElapsed: elapsed, sessionStart: null };
        }
        return t;
      });

      // Auto-start next queued task
      const nextQueued = updated.find(t => t.status === 'queued');
      if (nextQueued) {
        return updated.map(t =>
          t.id === nextQueued.id ? { ...t, status: 'active' as const, sessionStart: Date.now() } : t
        );
      }
      return updated;
    });
  }

  function removeTask(id: string) {
    setQueue(prev => prev.filter(t => t.id !== id));
  }

  function clearDone() {
    setQueue(prev => prev.filter(t => t.status !== 'done'));
  }

  // ── Derived ────────────────────────────────────────────────
  const activeTask  = queue.find(t => t.status === 'active');
  const pausedTask  = !activeTask ? queue.find(t => t.status === 'paused') : null;
  const queuedTasks = queue.filter(t => t.status === 'queued');
  const doneTasks   = queue.filter(t => t.status === 'done');
  const focusTask   = activeTask ?? pausedTask;

  // void tick — used only to force re-render
  void tick;

  return (
    <div className="card flex flex-col gap-0 overflow-hidden animate-fade-up delay-1">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-edge shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="section-label">Task Queue</p>
        </div>
        <div className="flex items-center gap-2">
          {queuedTasks.length > 0 && (
            <span className="pill pill-indigo">{queuedTasks.length} queued</span>
          )}
          <button
            id="queue-add-toggle-btn"
            onClick={() => { setShowAdd(v => !v); setTimeout(() => inputRef.current?.focus(), 60); }}
            className="icon-btn"
            aria-label={showAdd ? 'Cancel' : 'Add task'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showAdd ? 'M6 18L18 6M6 6l12 12' : 'M12 4.5v15m7.5-7.5h-15'} />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Add form ─────────────────────────────────────────── */}
      {showAdd && (
        <div className="px-4 pt-3 pb-3 border-b border-edge animate-scale-in shrink-0">
          <input
            ref={inputRef}
            id="queue-task-input"
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createTask(false); }}
            placeholder="What are you working on?"
            className="field text-sm mb-2"
          />
          <div className="flex gap-2">
            <button
              id="queue-start-now-btn"
              onClick={() => createTask(true)}
              disabled={!draft.trim()}
              className="btn-primary flex-1 text-xs py-2 gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Start Now
            </button>
            <button
              id="queue-add-later-btn"
              onClick={() => createTask(false)}
              disabled={!draft.trim()}
              className="btn-ghost flex-1 text-xs py-2"
            >
              Add to Queue
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 flex flex-col gap-3 min-h-0">

        {/* ── Active / Paused task card ──────────────────────── */}
        {focusTask && (
          <div
            className="rounded-2xl p-4 border animate-scale-in"
            style={{
              background:   focusTask.status === 'active' ? 'var(--indigo-wash)' : 'var(--raised)',
              borderColor:  focusTask.status === 'active' ? 'var(--indigo-edge)' : 'var(--edge)',
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-3 mb-0.5">
                  {focusTask.status === 'active' ? 'In Progress' : 'Paused'}
                </p>
                <p className="text-sm font-semibold text-ink leading-snug truncate">
                  {focusTask.title}
                </p>
              </div>
              {/* Live timer */}
              <div className="shrink-0 text-right">
                <p
                  className="text-2xl font-bold font-mono tracking-tight leading-none"
                  style={{ color: focusTask.status === 'active' ? 'var(--indigo)' : 'var(--ink-3)' }}
                >
                  {fmtElapsed(getLiveElapsed(focusTask))}
                </p>
                {focusTask.status === 'active' && (
                  <span className="inline-flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo animate-pulse-dot" />
                    <span className="text-[9px] font-mono text-indigo">live</span>
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {focusTask.status === 'active' ? (
                <button
                  id="queue-pause-btn"
                  onClick={() => pauseTask(focusTask.id)}
                  className="btn-ghost flex-1 text-xs py-1.5 gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </button>
              ) : (
                <button
                  id="queue-resume-btn"
                  onClick={() => resumeTask(focusTask.id)}
                  className="btn-primary flex-1 text-xs py-1.5 gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Resume
                </button>
              )}
              <button
                id="queue-done-btn"
                onClick={() => finishTask(focusTask.id)}
                className="btn-primary flex-1 text-xs py-1.5 gap-1.5"
                style={{ background: 'var(--emerald)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── Queued tasks ──────────────────────────────────── */}
        {queuedTasks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {queuedTasks.length > 0 && (
              <p className="section-label px-1">Up Next</p>
            )}
            {queuedTasks.map((task, i) => (
              <div
                key={task.id}
                className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-edge bg-raised hover:border-edge-hi transition-all duration-150 animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="text-ink-3 text-xs font-mono w-4 shrink-0 text-center">
                  {i + 1}
                </span>
                <p className="flex-1 text-xs text-ink truncate">{task.title}</p>
                <button
                  onClick={() => startTask(task.id)}
                  className="icon-btn w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Start this task"
                  title="Start now"
                >
                  <svg className="w-3 h-3 text-emerald" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => removeTask(task.id)}
                  className="icon-btn w-5 h-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────── */}
        {!focusTask && queuedTasks.length === 0 && doneTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-3">
            <svg className="w-8 h-8 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs">Queue is empty — tap + to add a task</p>
          </div>
        )}

        {/* ── Done tasks ────────────────────────────────────── */}
        {doneTasks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <p className="section-label">Completed</p>
              <button onClick={clearDone} className="text-[10px] text-ink-3 hover:text-rose cursor-pointer transition-colors">
                Clear
              </button>
            </div>
            {doneTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-edge opacity-50"
                style={{ background: 'var(--raised)' }}
              >
                <svg className="w-3.5 h-3.5 text-emerald shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <p className="flex-1 text-xs text-ink line-through truncate">{task.title}</p>
                <span className="text-[10px] font-mono text-ink-3 shrink-0">
                  {fmtElapsed(task.totalElapsed)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
