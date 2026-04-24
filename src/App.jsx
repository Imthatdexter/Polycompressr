import { useState, useEffect } from 'react';
import { useMarket } from './hooks/useMarket';
import { usePrice } from './hooks/usePrice';
import { useTrend } from './hooks/useTrend';
import Chart from './components/Chart';
import Sidebar from './components/Sidebar';
import { getSecondsRemaining } from './utils/timeUtils';

export default function App() {
  const { market, loading, error, refetch } = useMarket();
  const [lookbackHours, setLookbackHours] = useState(0);
  const { currentPrice, targetPrice, hourStart, chartStart, history, reset: resetPrice } = usePrice(market, lookbackHours);
  const trend = useTrend(history, targetPrice);

  // Handle hour transitions
  useEffect(() => {
    const check = () => {
      if (getSecondsRemaining() <= 0) {
        resetPrice();
        refetch();
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [resetPrice, refetch]);

  return (
    <div style={styles.layout}>
      <div style={styles.chartArea}>
        {loading && !history.length ? (
          <div style={styles.loading}>Loading market data...</div>
        ) : error && !market ? (
          <div style={styles.error}>{error}</div>
        ) : (
          <Chart history={history} targetPrice={targetPrice} chartStart={chartStart} hourStart={hourStart} />
        )}
      </div>
      <Sidebar
        market={market}
        currentPrice={currentPrice}
        targetPrice={targetPrice}
        trend={trend}
        lookbackHours={lookbackHours}
        onLookbackChange={setLookbackHours}
      />
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    height: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  chartArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch',
    padding: 12,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    color: '#6b7280',
    fontSize: 16,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    color: '#ef4444',
    fontSize: 16,
  },
};
