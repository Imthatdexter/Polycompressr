import { useState, useEffect, useRef, useCallback } from 'react';
import { getHourStartETTimestamp } from '../utils/timeUtils';

const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';

export function usePrice(market) {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [targetPrice, setTargetPrice] = useState(null);
  const [hourStart, setHourStart] = useState(null);
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const marketSlugRef = useRef(null);

  // Backfill klines when market changes
  useEffect(() => {
    if (!market) return;

    const slug = market.slug;
    if (slug === marketSlugRef.current) return;
    marketSlugRef.current = slug;

    const startTs = getHourStartETTimestamp();
    setHourStart(startTs);

    fetch(`/api/klines?symbol=BTCUSDT&interval=1m&startTime=${startTs}&limit=60`)
      .then(res => res.json())
      .then(klines => {
        if (!Array.isArray(klines) || klines.length === 0) return;

        const target = parseFloat(klines[0][1]); // first candle open
        setTargetPrice(target);

        // One data point per minute: use close price at the start of each minute
        const points = klines.map(k => ({
          time: Math.floor(k[0] / 1000),
          value: parseFloat(k[4]), // close of each 1m candle
        }));
        setHistory(points);
      })
      .catch(err => console.error('Kline backfill error:', err));
  }, [market]);

  // WebSocket for live price with reconnect
  useEffect(() => {
    let alive = true;

    function connect() {
      if (!alive) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const price = parseFloat(data.p);
          const tradeTime = Math.floor(data.T / 1000);
          if (!price || !tradeTime) return;

          setCurrentPrice(price);
          setHistory(prev => {
            // Update the last point if same second, otherwise append
            if (prev.length > 0 && prev[prev.length - 1].time === tradeTime) {
              const updated = [...prev];
              updated[updated.length - 1] = { time: tradeTime, value: price };
              return updated;
            }
            return [...prev, { time: tradeTime, value: price }];
          });
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!alive) return;
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        // onclose will fire after this, which handles reconnect
      };
    }

    connect();

    return () => {
      alive = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    setHistory([]);
    setCurrentPrice(null);
    setTargetPrice(null);
    setHourStart(null);
    marketSlugRef.current = null;
  }, []);

  return { currentPrice, targetPrice, hourStart, history, reset };
}
