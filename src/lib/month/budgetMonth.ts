// Budget months are stored/compared as 'YYYY-MM' strings (technical-specification.md §4.6);
// zero-padding keeps lexicographic string ordering equal to chronological ordering.
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatMonth(year: number, month1To12: number): string {
  return `${year}-${pad2(month1To12)}`;
}

export function getCurrentMonth(now: Date = new Date()): string {
  return formatMonth(now.getFullYear(), now.getMonth() + 1);
}

export function shiftMonth(month: string, deltaMonths: number): string {
  const [year, monthNum] = month.split('-').map(Number);
  // 0-indexed month arithmetic, then convert back to 1-indexed for formatMonth.
  const zeroIndexed = monthNum - 1 + deltaMonths;
  const newYear = year + Math.floor(zeroIndexed / 12);
  const newMonth = ((zeroIndexed % 12) + 12) % 12;
  return formatMonth(newYear, newMonth + 1);
}

export function formatMonthLabel(month: string, locale: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
