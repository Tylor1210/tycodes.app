import { useEffect, useRef } from 'react';

export default function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "SPY", "title": "SPY" },
        { "proName": "VOO", "title": "VOO" },
        { "proName": "ETHUSD", "title": "ETH" },
        { "proName": "XRPUSD", "title": "XRP" }
      ],
      "showSymbolLogo": true,
      "isTransparent": true,
      "displayMode": "adaptive",
      "colorTheme": "dark",
      "locale": "en"
    });
    container.current.appendChild(script);
  }, []);

  return (
    <div className="card h-full flex flex-col justify-center overflow-hidden w-full">
      <div className="tradingview-widget-container" ref={container}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
}
