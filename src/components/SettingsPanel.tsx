import { useState, useEffect } from 'react';
import { clearSheetId, getSheetId, setSheetId } from '../lib/sheetsApi';
import { provisionDashboardSheet } from '../lib/sheetsProvisioner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string) => void;
}

const DEFAULT_YT  = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

export default function SettingsPanel({ isOpen, onClose, youtubeUrl, onYoutubeUrlChange }: Props) {
  const [ytInput,  setYtInput]  = useState(youtubeUrl);
  const [ytSaved,  setYtSaved]  = useState(false);

  useEffect(() => { setYtInput(youtubeUrl); }, [youtubeUrl]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [isOpen, onClose]);

  function saveYt() {
    onYoutubeUrlChange(ytInput.trim() || DEFAULT_YT);
    setYtSaved(true);
    setTimeout(() => setYtSaved(false), 2000);
  }

  const [isConnecting, setIsConnecting] = useState(false);
  const isConnected = !!getSheetId();

  async function handleConnect() {
    try {
      setIsConnecting(true);
      const id = await provisionDashboardSheet();
      setSheetId(id);
      window.location.reload();
    } catch (err) {
      alert('Failed to connect: ' + err);
      setIsConnecting(false);
    }
  }

  function handleLogout() {
    if (confirm('Disconnect Google Account? This will clear your sheet ID from the browser.')) {
      clearSheetId();
      import('../lib/googleAuth').then(m => m.clearAuthSession());
      window.location.reload();
    }
  }

  const Section = ({ title }: { title: string }) => (
    <p className="section-label mb-3">{title}</p>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={`fixed right-0 top-0 bottom-0 z-50 w-80 sm:w-96 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-edge bg-card`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-edge shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Settings</h2>
          </div>
          <button id="settings-close-btn" onClick={onClose} className="icon-btn border border-edge" aria-label="Close settings">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8">

          {/* ── Google Account ─────────────────────────── */}
          <section>
            <Section title="Google Integration" />
            <div className="flex flex-col gap-3">
              <p className="text-xs text-ink-2 font-bold leading-relaxed uppercase tracking-wider">
                {isConnected ? 'Connected to Google Drive' : 'Google Drive Backup Needed'}
              </p>
              {isConnected ? (
                <button
                  onClick={handleLogout}
                  className="btn-ghost w-full py-3 border border-edge text-ink-2 hover:bg-rose hover:text-white hover:border-rose transition-colors"
                >
                  Disconnect Account
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="btn-primary w-full py-3 font-bold uppercase tracking-wider"
                >
                  {isConnecting ? 'Provisioning...' : 'Connect Google Account'}
                </button>
              )}
            </div>
          </section>

          <div className="border-t border-edge" />

          {/* ── Ambient Video ──────────────────────────────── */}
          <section>
            <Section title="Ambient Engine" />
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-2">Audio Source (YouTube URL)</label>
              <input
                id="settings-youtube-input"
                type="text"
                value={ytInput}
                onChange={e => { setYtInput(e.target.value); setYtSaved(false); }}
                onKeyDown={e => e.key === 'Enter' && saveYt()}
                placeholder="https://youtube.com/watch?v=..."
                className="field text-xs py-3 border border-edge"
              />
              <button
                id="settings-save-youtube-btn"
                onClick={saveYt}
                className="btn-primary py-3 font-bold uppercase tracking-wider"
                style={ytSaved ? { background: 'var(--emerald)' } : {}}
              >
                {ytSaved ? 'Saved' : 'Update Source'}
              </button>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-edge shrink-0">
          <button id="settings-done-btn" onClick={onClose} className="btn-primary w-full py-3 font-bold uppercase tracking-wider bg-ink text-white">
            Close
          </button>
        </div>
      </div>
    </>
  );
}
