import { useState, useEffect, useRef, useCallback } from 'react';
import { generateSlug } from '../utils/marketSlug';

const MARKET_POLL = 30_000;  // Gamma API: every 30s (slug, resolved status, etc.)
const ODDS_POLL = 5_000;     // CLOB API: every 5s (real-time odds)

export function useMarket() {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastSlugRef = useRef(null);
  const tokenIdsRef = useRef(null);

  const fetchMarket = useCallback(async () => {
    try {
      const slug = generateSlug();

      if (slug !== lastSlugRef.current) {
        setLoading(true);
        lastSlugRef.current = slug;
      }

      const res = await fetch(`/api/active-market?slug=${encodeURIComponent(slug)}&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();

      if (!data || data.length === 0) {
        setError('No active market found for this hour');
        setMarket(null);
        setLoading(false);
        return;
      }

      const event = data[0];
      const markets = event.markets || [];

      let upMarket = null;
      let downMarket = null;
      let clobTokenIds = null;

      for (const m of markets) {
        const question = (m.question || '').toLowerCase();
        const outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes || [];
        const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices || [];
        const isResolved = m.resolved === true || m.resolved === 'true' || m.closed === true || m.closed === 'true';

        // Store CLOB token IDs for real-time odds fetching
        if (m.clobTokenIds) {
          const ids = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
          if (outcomes.includes('Up') && outcomes.includes('Down')) {
            clobTokenIds = { up: ids[0], down: ids[1] };
          }
        }

        if (outcomes.includes('Up') && outcomes.includes('Down')) {
          upMarket = { question: m.question, outcomes, prices, resolved: isResolved, slug: m.slug || m.conditionId };
          downMarket = { question: m.question, outcomes, prices, resolved: isResolved, slug: m.slug || m.conditionId };
        } else if (outcomes.includes('Up') || question.includes('up')) {
          upMarket = { question: m.question, outcomes, prices, resolved: isResolved, slug: m.slug || m.conditionId };
        } else if (outcomes.includes('Down') || question.includes('down')) {
          downMarket = { question: m.question, outcomes, prices, resolved: isResolved, slug: m.slug || m.conditionId };
        }
      }

      tokenIdsRef.current = clobTokenIds;

      setMarket(prev => ({
        ...(prev || {}),
        title: event.title || slug,
        slug,
        up: upMarket,
        down: downMarket,
        startDate: event.startDate,
        endDate: event.endDate,
      }));
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Market fetch error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Fetch real-time odds from CLOB API
  const fetchOdds = useCallback(async () => {
    if (!tokenIdsRef.current) return;
    const { up, down } = tokenIdsRef.current;
    try {
      const res = await fetch(`/api/odds?token_ids=${up},${down}&_t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      // data = [{ tokenId, price }, { tokenId, price }]
      const upPrice = data.find(d => d.tokenId === up)?.price;
      const downPrice = data.find(d => d.tokenId === down)?.price;

      if (upPrice != null && downPrice != null) {
        setMarket(prev => {
          if (!prev || !prev.up || !prev.down) return prev;
          return {
            ...prev,
            up: { ...prev.up, clobPrice: upPrice },
            down: { ...prev.down, clobPrice: downPrice },
          };
        });
      }
    } catch {
      // ignore odds fetch errors
    }
  }, []);

  // Poll market data (slug, resolved status) every 30s
  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, MARKET_POLL);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  // Poll CLOB odds every 5s
  useEffect(() => {
    fetchOdds();
    const interval = setInterval(fetchOdds, ODDS_POLL);
    return () => clearInterval(interval);
  }, [fetchOdds]);

  return { market, loading, error, refetch: fetchMarket };
}
