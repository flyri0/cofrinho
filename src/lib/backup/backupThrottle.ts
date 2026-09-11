// see technical-specification.md §6.3/§7.6 — "automatic backup trigger on app
// foreground/background events, throttled to roughly once per day". A rolling
// 24h window (rather than a calendar-day boundary) is the simplest reading of
// "roughly once per day" and self-corrects regardless of when the app happens
// to be opened.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface AutoBackupCheckInput {
  autoBackupEnabled: boolean;
  isConnected: boolean;
  lastBackupAt: Date | null;
  now: Date;
}

export function shouldRunAutoBackup({
  autoBackupEnabled,
  isConnected,
  lastBackupAt,
  now,
}: AutoBackupCheckInput): boolean {
  if (!autoBackupEnabled || !isConnected) return false;
  if (lastBackupAt === null) return true;
  return now.getTime() - lastBackupAt.getTime() >= ONE_DAY_MS;
}
