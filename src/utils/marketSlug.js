const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export function generateSlug(date = new Date()) {
  const etString = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etString);

  const month = MONTHS[etDate.getMonth()];
  const day = etDate.getDate();
  const year = etDate.getFullYear();
  const h = etDate.getHours();
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? 'am' : 'pm';

  return `bitcoin-up-or-down-${month}-${day}-${year}-${hour12}${ampm}-et`;
}
