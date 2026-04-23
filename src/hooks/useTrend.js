import { useState, useEffect } from 'react';

export function useTrend(history, targetPrice) {
  const [trend, setTrend] = useState({ direction: null, duration: 0, abovePercent: 0 });

  useEffect(() => {
    if (!history.length || !targetPrice) return;

    let aboveCount = 0;
    let consecutiveDirection = null;
    let consecutiveStart = 0;

    for (let i = 0; i < history.length; i++) {
      const isAbove = history[i].value >= targetPrice;
      if (isAbove) aboveCount++;

      if (i === 0) {
        consecutiveDirection = isAbove ? 'above' : 'below';
        consecutiveStart = history[i].time;
      } else if ((isAbove && consecutiveDirection === 'below') || (!isAbove && consecutiveDirection === 'above')) {
        consecutiveDirection = isAbove ? 'above' : 'below';
        consecutiveStart = history[i].time;
      }
    }

    const lastTime = history[history.length - 1].time;
    const durationSeconds = lastTime - consecutiveStart;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationSecs = durationSeconds % 60;

    setTrend({
      direction: consecutiveDirection,
      duration: `${durationMinutes}m ${durationSecs}s`,
      abovePercent: Math.round((aboveCount / history.length) * 100),
    });
  }, [history, targetPrice]);

  return trend;
}
