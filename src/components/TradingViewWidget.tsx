import { useEffect, useRef, useState } from 'react';
import { syncPortfolioToSheet, fetchPortfolioData } from '../lib/sheetsApi';

const LS_TICKERS = 'tycodes_portfolio_v2';

const DEFAULT_TICKERS = [
  { id: '1', ticker: 'SPY', shares: '', cost: '' },
  { id: '2', ticker: 'VOO', shares: '', cost: '' },
  { id: '3', ticker: 'NVDA', shares: '', cost: '' }
];

type Asset = {
  id: string;
  ticker: string;
  shares?: string;
  cost?: string;
};

export default function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);
  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem(LS_TICKERS);
      return saved ? JSON.parse(saved) : DEFAULT_TICKERS;
    } catch {
      return DEFAULT_TICKERS;
    }
  });

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [draftAssets, setDraftAssets] = useState<Asset[]>(assets);

  // Persist State
  useEffect(() => {
    localStorage.setItem(LS_TICKERS, JSON.stringify(assets));
  }, [assets]);

  // Inject TradingView Tape
  useEffect(() => {
    if (!container.current) return;

    container.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

    const symbols = assets
      .map(a => a.ticker.trim().toUpperCase())
      .filter(Boolean)
      .map(t => ({ proName: t, title: t }));

    if (symbols.length === 0) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark", // Using dark theme since UI is now Night Mode
      locale: "en"
    });
    container.current.appendChild(script);
  }, [assets]);

  // Fetch Live Prices & Holdings via Google Sheets
  useEffect(() => {
    let isMounted = true;

    async function fetchPrices() {
      const data = await fetchPortfolioData();
      if (data && isMounted) {
        setPrices(data.prices);
        // Only override local storage if the sheet isn't completely empty,
        // or if they've successfully connected (we know it's not a generic error).
        // Even if empty, if the sheet fetch worked, it means the sheet is the source of truth.
        setAssets(data.holdings);
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // refresh every 1 min
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [assets]);

  function handleAddRow() {
    setDraftAssets([...draftAssets, { id: Math.random().toString(), ticker: '', shares: '', cost: '' }]);
  }

  function handleUpdateRow(id: string, field: keyof Asset, value: string) {
    setDraftAssets(draftAssets.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  function handleRemoveRow(id: string) {
    setDraftAssets(draftAssets.filter(a => a.id !== id));
  }

  function handleSave() {
    const cleaned = draftAssets.filter(a => a.ticker.trim().length > 0);
    setAssets(cleaned);
    setDraftAssets(cleaned);
    setShowSettings(false);

    // Sync to Google Sheet in background
    syncPortfolioToSheet(cleaned.map(a => ({
      ticker: a.ticker,
      shares: a.shares || '0',
      cost: a.cost || '0'
    }))).catch(err => console.error("Failed to sync portfolio", err));
  }

  function handleCancel() {
    setDraftAssets(assets);
    setShowSettings(false);
  }

  return (
    <div className="card h-full flex flex-col overflow-hidden w-full relative">
      <div className="flex items-center justify-between px-5 pt-4 pb-2 z-10 shrink-0">
        <p className="section-label text-ink">Stock Watchlist</p>
        <button
          onClick={() => {
            if (!showSettings) {
              setDraftAssets(assets);
            }
            setShowSettings(v => !v);
          }}
          className="icon-btn"
          title="Edit Portfolio"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {showSettings
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            }
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="absolute inset-0 top-12 bg-card z-20 flex flex-col overflow-hidden animate-fade-in border-t border-edge">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

            <div className="space-y-2">
              <p className="text-[10px] font-bold tracking-wider uppercase text-ink">My Assets</p>
              {draftAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={asset.ticker}
                    onChange={e => handleUpdateRow(asset.id, 'ticker', e.target.value)}
                    placeholder="Ticker (ex: AAPL)"
                    className="text-ink bg-input font-medium px-2 py-1.5 rounded-lg w-full text-xs outline-none focus:ring-2 focus:ring-amber-edge border border-edge"
                  />
                  <input
                    type="number"
                    value={asset.shares}
                    onChange={e => handleUpdateRow(asset.id, 'shares', e.target.value)}
                    placeholder="Shares"
                    className="text-ink bg-input font-medium px-2 py-1.5 rounded-lg w-full text-xs outline-none focus:ring-2 focus:ring-amber-edge border border-edge"
                  />
                  <input
                    type="number"
                    value={asset.cost}
                    onChange={e => handleUpdateRow(asset.id, 'cost', e.target.value)}
                    placeholder="Cost $"
                    className="text-ink bg-input font-medium px-2 py-1.5 rounded-lg w-full text-xs outline-none focus:ring-2 focus:ring-amber-edge border border-edge"
                  />
                  <button onClick={() => handleRemoveRow(asset.id)} className="p-1 text-rose hover:bg-rose-wash rounded">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <button onClick={handleAddRow} className="btn-ghost w-full py-2 text-xs border-dashed mt-2">
                + Add Asset
              </button>
            </div>
          </div>
          <div className="p-4 border-t border-edge flex justify-end gap-2 shrink-0 bg-raised">
            <button onClick={handleCancel} className="btn-ghost py-1.5 px-4 text-xs">Cancel</button>
            <button onClick={handleSave} className="btn-primary py-1.5 px-4 text-xs">Save Portfolio</button>
          </div>
        </div>
      )}

      {/* When settings are hidden, show tape + holdings */}
      {!showSettings && (
        <div className="flex-1 flex flex-col min-h-[100px] overflow-y-auto no-scrollbar pb-2">
          {/* TradingView Tape */}
          <div className="tradingview-widget-container shrink-0" ref={container}>
            <div className="tradingview-widget-container__widget"></div>
          </div>

          {/* Local Holdings Display */}
          {assets.some(a => a.shares || a.cost) && (() => {
            // Pre-compute per-asset P&L for both the total and individual rows
            const priced = assets.filter(a => a.shares || a.cost).map(a => {
              const t = a.ticker.toUpperCase();
              const shares = parseFloat(a.shares || '0');
              const cost = parseFloat(a.cost || '0');
              const livePrice = prices[t];
              let totalCost = 0, currentValue = 0, plTotal = 0, plPct = 0;
              let hasPrize = false;
              if (livePrice && shares && cost) {
                totalCost = shares * cost;
                currentValue = shares * livePrice;
                plTotal = currentValue - totalCost;
                plPct = (plTotal / totalCost) * 100;
                hasPrize = true;
              }
              return { a, t, shares, cost, livePrice, totalCost, currentValue, plTotal, plPct, hasPrize };
            });

            const totalCostBasis = priced.reduce((s, r) => s + r.totalCost, 0);
            const totalCurrentValue = priced.reduce((s, r) => s + r.currentValue, 0);
            const netPL = totalCurrentValue - totalCostBasis;
            const netPLPct = totalCostBasis > 0 ? (netPL / totalCostBasis) * 100 : 0;
            const anyPriced = priced.some(r => r.hasPrize);

            return (
              <div className="px-5 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">My Portfolio</p>
                  <span className="pill pill-emerald text-[9px]">Google Proxy Active</span>
                </div>

                {/* ── Total P&L Banner ── */}
                {anyPriced && (
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg mb-4 border ${netPL >= 0
                      ? 'bg-emerald/10 border-emerald/30'
                      : 'bg-rose/10 border-rose/30'
                    }`}>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3">Total Portfolio</span>
                      <span className="text-sm font-mono font-bold text-ink">${totalCurrentValue.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-base font-mono font-black ${netPL >= 0 ? 'text-emerald' : 'text-rose'
                        }`}>
                        {netPL >= 0 ? '+' : ''}${netPL.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${netPL >= 0 ? 'text-emerald' : 'text-rose'
                        }`}>
                        {netPL >= 0 ? '+' : ''}{netPLPct.toFixed(2)}% all time
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {priced.map(({ a, t, shares, cost, plTotal, plPct, hasPrize, currentValue }) => {
                    const isPositive = plTotal >= 0;
                    return (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b border-edge/30 last:border-0">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-ink">{t || '???'}</span>
                          <span className="text-[10px] text-ink-3 font-mono">{shares} sh @ ${cost}</span>
                        </div>

                        {hasPrize ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-mono font-bold text-ink">${(currentValue).toFixed(2)}</span>
                            <span className={`text-[10px] font-mono font-bold ${isPositive ? 'text-emerald' : 'text-rose'}`}>
                              {isPositive ? '+' : ''}{plTotal.toFixed(2)} ({isPositive ? '+' : ''}{plPct.toFixed(2)}%)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end opacity-50">
                            <span className="text-[10px] font-mono font-bold text-ink-3">Not on Google Finance</span>
                            <span className="text-[9px] text-ink-3">Major exchanges only (NYSE, NASDAQ)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
