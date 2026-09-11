// CLAUDE.md: money is stored as integer cents; this is the single place that
// turns cents into a locale-correct display string (e.g. 15000 -> "R$ 150,00").
export function formatCents(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
