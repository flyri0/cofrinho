// see technical-specification.md §6.3 — "Last backup: [date/time]". A small,
// dedicated formatter alongside formatCents/formatMonthLabel rather than an
// inline Intl call in every screen that shows a backup timestamp (§6.3's
// "Last backup" line and each row in the History list).
export function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
