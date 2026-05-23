import { useState, useEffect, useRef } from 'react';
import type { QuickNote } from '../types';

const LS_KEY = 'ambient_notes';
const MAX_NOTES = 30;

function loadNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as QuickNote[];
  } catch { /* ignore */ }
  return [];
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function QuickNotes() {
  const [notes, setNotes] = useState<QuickNote[]>(loadNotes);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(notes)); }
    catch { /* ignore */ }
  }, [notes]);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    const note: QuickNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [note, ...prev].slice(0, MAX_NOTES));
    setDraft('');
    inputRef.current?.focus();
  }

  function removeNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  }

  return (
    <div className="card w-full h-full flex-1 flex flex-col gap-0 overflow-hidden animate-fade-up delay-2">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <p className="section-label">Quick Notes</p>
        </div>
        <div className="flex items-center gap-1.5">
          {notes.length > 0 && (
            <span className="pill pill-neutral">{notes.length}</span>
          )}
          <button
            onClick={() => inputRef.current?.focus()}
            className="icon-btn"
            aria-label="Settings"
            title="Add note"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 pb-3 shrink-0">
        <div
          className="flex gap-2 rounded-2xl p-1 pl-3 border"
          style={{ background: 'var(--raised)', borderColor: 'var(--edge)' }}
        >
          <textarea
            ref={inputRef}
            id="quick-notes-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a note, press Enter…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none resize-none leading-relaxed py-1.5"
            style={{ fontFamily: 'var(--font-sans)' }}
          />
          <button
            id="quick-notes-add-btn"
            onClick={addNote}
            disabled={!draft.trim()}
            className="self-end mb-1 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150"
            style={{
              background: draft.trim() ? 'var(--ink)' : 'var(--edge)',
              color: draft.trim() ? 'var(--card)' : 'var(--ink-3)',
            }}
            aria-label="Add note"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2 min-h-0" style={{ maxHeight: 280 }}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-3">
            <svg className="w-7 h-7 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-xs">No notes yet</p>
          </div>
        ) : notes.map((note, i) => (
          <div
            key={note.id}
            className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-edge hover:border-edge-hi transition-all duration-150 animate-scale-in"
            style={{ background: 'var(--raised)', animationDelay: `${i * 0.03}s` }}
          >
            <p className="flex-1 text-xs text-ink leading-relaxed whitespace-pre-wrap break-words min-w-0">
              {note.text}
            </p>
            <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
              <button
                onClick={() => removeNote(note.id)}
                className="icon-btn w-5 h-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete note"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-[9px] font-mono text-ink-3">{relTime(note.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
