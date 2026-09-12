import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/types';
import { appSettings } from '@/db/schema';

// Singleton row (id=1, enforced by a check constraint). Both settingsStore
// and backupStore need this row to exist and can initialize independently
// (e.g. in parallel at app startup) — a plain "SELECT, then INSERT if
// missing" would race if both run at once, each seeing no row and both
// trying to INSERT id=1. `onConflictDoNothing` makes the insert atomic: if
// another caller already created the row first, this one just no-ops
// instead of throwing a unique-constraint error, and every caller ends up
// reading the same, single, defaulted row regardless of call order.
export async function ensureAppSettingsRow(
  db: AppDatabase,
): Promise<typeof appSettings.$inferSelect> {
  await db
    .insert(appSettings)
    .values({
      id: 1,
      themeMode: 'system',
      colorThemeId: 'ocean',
      autoBackupEnabled: false,
    })
    .onConflictDoNothing();

  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  return row;
}
