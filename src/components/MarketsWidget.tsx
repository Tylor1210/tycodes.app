import { useState, useEffect, useCallback, useRef } from 'react';
import type { StockPosition } from '../types';

interface LiveStock extends StockPosition {
  currentPrice: number;
  prevPrice: number;
  lastUpdated: Date;
}

interface Props {
  portfolio: StockPosition[];
  onPortfolioChange: (p: StockPosition[]) => void;
}

const CRYPTO = new Set(['BTC','ETH','SOL','BNB','ADA','XRP','DOGE','AVAX','MATIC','DOT','LINK','UNI']);
const QUICK_TICKERS = ['BTC','ETH','AAPL','NVDA','SOL','TSLA'];

function isCrypto(t: string) { return CRYPTO.has(t.toUpperCase()); }

async function fetchCryptoPrice(ticker: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${ticker.toUpperCase()}USDT`);
    if (!r.ok) return null;
    const d = await r.json();
    return parseFloat(d.price) || null;
  } catch { return null; }
}

function simulatePrice(avg: number, prev: number): number {
  const drift = (Math.random() - 0.5) * 0.003;
  const next = prev * (1 + drift);
  return Math.min(Math.max(next, avg * 0.85), avg * 1.15);
}

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${v.toFixed(2)}`;
}

function fmtPct(p: number): string {
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

export default function MarketsWidget({ portfolio, onPortfolioChange }: Props) {
  const [live, setLive] = useState<LiveStock[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [ticker, setTicker]   = useState('');
  const [price, setPrice]     = useState('');
  const [shares, setShares]   = useState('');
  const [addErr, setAddErr]   = useState('');
  const tickerRef = useRef<HTMLInputElement>(null);

  // Initialize live stocks
  useEffect(() => {
    setLive(portfolio.map(p => ({
      ...p,
      currentPrice: p.avgPrice,
      prevPrice:    p.avgPrice,
      lastUpdated:  new Date(),
    })));
  }, [portfolio]);

  const refreshPrices = useCallback(async () => {
    if (live.length === 0) return;
    const updates = await Promise.all(live.map(async s => {
      if (isCrypto(s.ticker)) {
        const p = await fetchCryptoPrice(s.ticker);
        return { ...s, prevPrice: s.currentPrice, currentPrice: p ?? s.currentPrice, lastUpdated: new Date() };
      }
      return { ...s, prevPrice: s.currentPrice, currentPrice: simulatePrice(s.avgPrice, s.currentPrice), lastUpdated: new Date() };
    }));
    setLive(updates);
  }, [live]);

  useEffect(() => {
    if (live.length === 0) return;
    refreshPrices();
    const id = setInterval(refreshPrices, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio]);

  function addPosition() {
    setAddErr('');
    const t  = ticker.trim().toUpperCase();
    const ap = parseFloat(price);
    const sh = parseFloat(shares);
    if (!t)                return setAddErr('Enter a ticker.');
    if (isNaN(ap) || ap <= 0) return setAddErr('Enter a valid price.');
    if (isNaN(sh) || sh <= 0) return setAddErr('Enter valid shares.');
    if (portfolio.some(p => p.ticker === t)) return setAddErr(`${t} already added.`);
    onPortfolioChange([...portfolio, { ticker: t, avgPrice: ap, shares: sh }]);
    setTicker(''); setPrice(''); setShares('');
    setTimeout(() => tickerRef.current?.focus(), 50);
  }

  function removePosition(t: string) {
    onPortfolioChange(portfolio.filter(p => p.ticker !== t));
  }

  const totalValue = live.reduce((s, x) => s + x.currentPrice * x.shares, 0);
  const totalCost  = live.reduce((s, x) => s + x.avgPrice * x.shares, 0);
  const totalPnL   = totalValue - totalCost;
  const totalPct   = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isPos      = totalPnL >= 0;

  return (
    <div className="card flex flex-col gap-0 overflow-hidden animate-fade-up delay-1">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-edge shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
          </svg>
          <p className="section-label">Portfolio</p>
        </div>
        <button
          id="portfolio-add-toggle-btn"
          onClick={() => { setShowAdd(v => !v); setTimeout(() => tickerRef.current?.focus(), 60); }}
          className="icon-btn"
          aria-label={showAdd ? 'Close form' : 'Settings'}
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

      {/* Inline add form */}
      {showAdd && (
        <div className="px-4 pt-3 pb-3 border-b border-edge animate-scale-in shrink-0">
          <div className="flex gap-2 mb-2">
            <input
              ref={tickerRef}
              id="portfolio-ticker-input"
              type="text"
              value={ticker}
              onChange={e => { setTicker(e.target.value.toUpperCase()); setAddErr(''); }}
              onKeyDown={e => e.key === 'Enter' && addPosition()}
              placeholder="BTC"
              maxLength={8}
              className="field w-20 text-xs py-1.5 font-mono font-bold"
            />
            <input
              id="portfolio-price-input"
              type="number"
              value={price}
              onChange={e => { setPrice(e.target.value); setAddErr(''); }}
              onKeyDown={e => e.key === 'Enter' && addPosition()}
              placeholder="Avg $"
              min="0" step="0.01"
              className="field flex-1 text-xs py-1.5"
            />
            <input
              id="portfolio-shares-input"
              type="number"
              value={shares}
              onChange={e => { setShares(e.target.value); setAddErr(''); }}
              onKeyDown={e => e.key === 'Enter' && addPosition()}
              placeholder="Qty"
              min="0" step="0.0001"
              className="field w-16 text-xs py-1.5"
            />
            <button
              id="portfolio-add-submit-btn"
              onClick={addPosition}
              className="btn-primary text-xs py-1.5 px-3"
            >
              Add
            </button>
          </div>
          {addErr && <p className="text-[10px] text-rose font-semibold mb-1">{addErr}</p>}
          <div className="flex flex-wrap gap-1">
            {QUICK_TICKERS.map(t => (
              <button
                key={t}
                onClick={() => setTicker(t)}
                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border border-edge bg-raised text-ink-2 hover:text-ink hover:border-edge-hi transition-colors cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio summary */}
      {live.length > 0 && (
        <div
          className="mx-4 mt-3 mb-2 px-4 py-3 rounded-2xl border shrink-0"
          style={{
            background: isPos ? 'var(--emerald-wash)' : 'var(--rose-wash)',
            borderColor: isPos ? 'var(--emerald-edge)' : 'var(--rose-edge)',
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-0.5">Total Value</p>
              <p className="text-xl font-bold font-mono text-ink tracking-tight">{fmtCurrency(totalValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-0.5">P&L</p>
              <p className={`text-sm font-bold font-mono ${isPos ? 'text-emerald' : 'text-rose'}`}>
                {fmtCurrency(totalPnL)}
              </p>
              <p className={`text-xs font-mono font-semibold ${isPos ? 'text-emerald' : 'text-rose'}`}>
                {fmtPct(totalPct)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock rows */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 flex flex-col gap-1.5 min-h-0">
        {live.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-ink-3">
            <svg className="w-8 h-8 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
            </svg>
            <p className="text-xs">Tap + to add positions</p>
          </div>
        ) : live.map((s, i) => {
          const posValue = s.currentPrice * s.shares;
          const posCost  = s.avgPrice * s.shares;
          const posPnL   = posValue - posCost;
          const posPct   = (posPnL / posCost) * 100;
          const pos      = posPnL >= 0;
          const priceUp  = s.currentPrice >= s.prevPrice;

          return (
            <div
              key={s.ticker}
              className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-edge hover:border-edge-hi bg-raised transition-all duration-200 animate-fade-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="w-11 shrink-0">
                <p className="text-xs font-bold font-mono text-ink">{s.ticker}</p>
                <p className="text-[9px] text-ink-3">{s.shares} sh</p>
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-mono font-semibold transition-colors duration-700 ${priceUp ? 'text-emerald' : 'text-rose'}`}>
                  {fmtCurrency(s.currentPrice)}
                </p>
                <p className="text-[9px] font-mono text-ink-3">avg {fmtCurrency(s.avgPrice)}</p>
              </div>

              <span className={`pill shrink-0 ${pos ? 'pill-emerald' : 'pill-rose'}`}>
                {fmtPct(posPct)}
              </span>

              <span className="text-[10px] font-mono font-semibold text-ink hidden sm:inline shrink-0">
                {fmtCurrency(posValue)}
              </span>

              <button
                onClick={() => removePosition(s.ticker)}
                className="icon-btn w-5 h-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label={`Remove ${s.ticker}`}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Cost basis */}
      {live.length > 0 && (
        <div className="px-5 py-2.5 border-t border-edge shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-ink-3">Cost basis</span>
          <span className="text-[10px] font-mono font-semibold text-ink-2">{fmtCurrency(totalCost)}</span>
        </div>
      )}
    </div>
  );
}
