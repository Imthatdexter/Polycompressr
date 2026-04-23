import { useState, useEffect } from 'react';
import { getSecondsRemaining, formatCountdown, formatHourET } from '../utils/timeUtils';

export default function Sidebar({ market, currentPrice, targetPrice, trend, padding, onPaddingChange }) {
  const [countdown, setCountdown] = useState('--:--');

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(getSecondsRemaining()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = currentPrice && targetPrice ? currentPrice - targetPrice : null;
  const diffPercent = diff !== null ? ((diff / targetPrice) * 100).toFixed(3) : null;
  const isAbove = diff !== null ? diff >= 0 : null;

  // Use CLOB real-time prices if available, fall back to Gamma prices
  const upClobPrice = market?.up?.clobPrice;
  const downClobPrice = market?.down?.clobPrice;

  const upOutcomes = market?.up?.outcomes || [];
  const downOutcomes = market?.down?.outcomes || [];
  const upPrices = market?.up?.prices || [];
  const downPrices = market?.down?.prices || [];

  const upIdx = upOutcomes.indexOf('Up');
  const downIdx = downOutcomes.indexOf('Down');

  const upPct = upClobPrice != null
    ? Math.round(parseFloat(upClobPrice) * 100)
    : upIdx >= 0 && upPrices[upIdx] ? Math.round(parseFloat(upPrices[upIdx]) * 100) : null;
  const downPct = downClobPrice != null
    ? Math.round(parseFloat(downClobPrice) * 100)
    : downIdx >= 0 && downPrices[downIdx] ? Math.round(parseFloat(downPrices[downIdx]) * 100) : null;

  const hourLabel = formatHourET();

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.label}>MARKET</div>
        <div style={styles.title}>BTC Up or Down</div>
        <div style={styles.subtitle}>{hourLabel} ET</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>TIME REMAINING</div>
        <div style={styles.countdown}>{countdown}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>CURRENT PRICE</div>
        <div style={{
          ...styles.price,
          color: isAbove === null ? '#fff' : isAbove ? '#22c55e' : '#ef4444',
        }}>
          {currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>TARGET PRICE</div>
        <div style={styles.price}>
          {targetPrice ? `$${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </div>
        {diff !== null && (
          <div style={{
            ...styles.diff,
            color: isAbove ? '#22c55e' : '#ef4444',
          }}>
            {isAbove ? '+' : ''}{diff.toFixed(2)} ({isAbove ? '+' : ''}{diffPercent}%)
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.label}>POLYMARKET ODDS</div>
        <div style={styles.oddsRow}>
          <div style={styles.oddsItem}>
            <span style={styles.oddsLabel}>Up</span>
            <span style={{ ...styles.oddsValue, color: '#22c55e' }}>
              {upPct !== null ? `${upPct}%` : '—'}
            </span>
          </div>
          <div style={styles.oddsDivider} />
          <div style={styles.oddsItem}>
            <span style={styles.oddsLabel}>Down</span>
            <span style={{ ...styles.oddsValue, color: '#ef4444' }}>
              {downPct !== null ? `${downPct}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>TREND</div>
        {trend.direction ? (
          <div>
            <div style={{
              ...styles.trendDirection,
              color: trend.direction === 'above' ? '#22c55e' : '#ef4444',
            }}>
              {trend.direction === 'above' ? 'Above' : 'Below'} target for {trend.duration}
            </div>
            <div style={styles.trendPercent}>
              {trend.abovePercent}% of ticks above target
            </div>
          </div>
        ) : (
          <div style={styles.muted}>Waiting for data...</div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Y-AXIS PADDING</div>
        <div style={styles.paddingRow}>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={padding}
            onChange={e => onPaddingChange(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.paddingValue}>{padding}%</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: 280,
    minWidth: 280,
    background: '#111111',
    borderLeft: '1px solid #1f2937',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    overflowY: 'auto',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  countdown: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
  },
  price: {
    fontSize: 20,
    fontWeight: 600,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
  },
  diff: {
    fontSize: 14,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  oddsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  oddsItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  oddsLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  oddsValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  oddsDivider: {
    width: 1,
    height: 36,
    background: '#374151',
  },
  trendDirection: {
    fontSize: 14,
    fontWeight: 600,
  },
  trendPercent: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  muted: {
    fontSize: 13,
    color: '#6b7280',
  },
  paddingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  slider: {
    flex: 1,
    accentColor: '#3b82f6',
  },
  paddingValue: {
    fontSize: 13,
    color: '#9ca3af',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 36,
  },
};
