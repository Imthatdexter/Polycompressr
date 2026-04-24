import { useState, useEffect } from 'react';

export function useTrend(history, targetPrice) {
  const [trend, setTrend] = useState({
    direction: null,
    duration: '0m 0s',
    abovePercent: 0,
    overallDirection: null,
    overallDuration: '0m 0s',
  });

  useEffect(() => {
    if (!history.length || !targetPrice) return;

    let aboveCount = 0;
    let consecutiveDirection = null;
    let consecutiveStart = 0;

    // For "since last cross" — find the last time the price crossed the target
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

    // For "since market start" — total time above vs below across all data
    const abovePercent = Math.round((aboveCount / history.length) * 100);
    const belowPercent = 100 - abovePercent;

    // Overall direction is whichever side has more time
    const overallDirection = abovePercent >= 50 ? 'above' : 'below';
    const overallPercent = abovePercent >= 50 ? abovePercent : belowPercent;

    // Calculate actual time spent in the overall direction
    const totalTimeSeconds = lastTime - history[0].time;
    const overallSeconds = Math.round(totalTimeSeconds * overallPercent / 100);
    const overallMinutes = Math.floor(overallSeconds / 60);
    const overallSecs = overallSeconds % 60;

    setTrend({
      direction: consecutiveDirection,
      duration: `${durationMinutes}m ${durationSecs}s`,
      abovePercent,
      overallDirection,
      overallDuration: `${overallMinutes}m ${overallSecs}s`,
    });
  }, [history, targetPrice]);

  return trend;
}
