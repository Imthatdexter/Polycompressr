const ET_TIMEZONE = 'America/New_York';

export function getCurrentET() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: ET_TIMEZONE }));
}

export function getHourStartETTimestamp() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(now);

  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  const second = parseInt(parts.find(p => p.type === 'second').value);

  const elapsedMs = (minute * 60 + second) * 1000 + now.getMilliseconds();
  return now.getTime() - elapsedMs;
}

export function getSecondsRemaining() {
  const now = Date.now();
  const hourStart = getHourStartETTimestamp();
  const hourEnd = hourStart + 60 * 60 * 1000;
  return Math.max(0, Math.floor((hourEnd - now) / 1000));
}

export function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatHourET() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    hour: 'numeric',
    hour12: true,
  }).formatToParts(new Date());

  const hour = parts.find(p => p.type === 'hour').value;
  const period = parts.find(p => p.type === 'dayPeriod').value.toLowerCase();
  return `${hour}${period}`;
}
