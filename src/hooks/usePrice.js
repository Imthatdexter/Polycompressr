import { useState, useEffect, useRef, useCallback } from 'react';
import { getHourStartETTimestamp } from '../utils/timeUtils';

const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';

export function usePrice(market, lookbackHours = 0) {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [targetPrice, setTargetPrice] = useState(null);
  const [hourStart, setHourStart] = useState(null);
  const [chartStart, setChartStart] = useState(null);
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const marketSlugRef = useRef(null);
  const liveDataRef = useRef([]);

  // Backfill klines when market or lookback changes
  useEffect(() => {
    if (!market) return;

    const slug = market.slug;

    // Only reset on market change, not lookback change
    const marketChanged = slug !== marketSlugRef.current;
    if (marketChanged) {
      marketSlugRef.current = slug;
      liveDataRef.current = [];
    }

    const hourStartTs = getHourStartETTimestamp();
    if (marketChanged) {
      setHourStart(hourStartTs);
    }

    // Fetch klines from (hourStart - lookbackHours) to now
    const lookbackMs = lookbackHours * 3600 * 1000;
    const fetchStart = hourStartTs - lookbackMs;
    const totalMinutes = 60 + (lookbackHours * 60);
    const limit = Math.min(totalMinutes, 1000); // Binance max per request

    setChartStart(fetchStart);

    fetch(`/api/klines?symbol=BTCUSDT&interval=1m&startTime=${fetchStart}&limit=${limit}`)
      .then(res => res.json())
      .then(klines => {
        if (!Array.isArray(klines) || klines.length === 0) return;

        // Target price is always the open of the current hour's first candle
        if (marketChanged) {
          const target = parseFloat(klines[0][1]);
          setTargetPrice(target);
        }

        const points = klines.map(k => ({
          time: Math.floor(k[0] / 1000),
          value: parseFloat(k[4]),
        }));

        // Merge kline data with any live data that's been accumulated
        const liveData = liveDataRef.current;
        if (liveData.length > 0) {
          const lastKlineTime = points.length > 0 ? points[points.length - 1].time : 0;
          const newLiveData = liveData.filter(d => d.time > lastKlineTime);
          setHistory([...points, ...newLiveData]);
        } else {
          setHistory(points);
        }
      })
      .catch(err => console.error('Kline backfill error:', err));
  }, [market, lookbackHours]);

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
            const updated = prev.length > 0 && prev[prev.length - 1].time === tradeTime
              ? (() => { const u = [...prev]; u[u.length - 1] = { time: tradeTime, value: price }; return u; })()
              : [...prev, { time: tradeTime, value: price }];

            // Also track live data in ref for merging with kline refetches
            const liveData = liveDataRef.current;
            if (liveData.length > 0 && liveData[liveData.length - 1].time === tradeTime) {
              liveData[liveData.length - 1] = { time: tradeTime, value: price };
            } else {
              liveDataRef.current = [...liveData, { time: tradeTime, value: price }];
            }

            return updated;
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
    setChartStart(null);
    liveDataRef.current = [];
    marketSlugRef.current = null;
  }, []);

  return { currentPrice, targetPrice, hourStart, chartStart, history, reset };
}
