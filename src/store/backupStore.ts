import { desc, eq } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import {
  accountLoanDetails,
  accounts,
  appSettings,
  backupLog,
  categories,
  categoryGroups,
  categoryMonthBudgets,
  transactions,
  transfers,
  type BackupStatus,
  type BackupTrigger,
} from '@/db/schema';
import { buildBackupExport, shouldRunAutoBackup } from '@/lib/backup';
import {
  disconnectGoogleDrive,
  ensureBackupFolder,
  fetchConnectedAccountEmail,
  getValidAccessToken,
  loadAccountEmail,
  saveAccountEmail,
  uploadBackupFile,
} from '@/lib/googleDrive';

export type BackupLogRow = typeof backupLog.$inferSelect;

// see technical-specification.md §6.3 — a single, visible folder at the root
// of the user's Drive. There is no hidden-folder option: Google's real hidden
// Application Data folder needs the `drive.appdata` scope, which this app
// deliberately never requests (CLAUDE.md's drive.file-only rule).
const BACKUP_FOLDER_NAME = 'Cofrinho';

export interface BackupRunResult {
  ok: boolean;
  errorMessage: string | null;
}

export interface BackupState {
  isInitialized: boolean;
  isConnected: boolean;
  connectedEmail: string | null;
  autoBackupEnabled: boolean;
  lastBackupAt: Date | null;
  history: BackupLogRow[];
  isBackingUp: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  setAutoBackupEnabled: (enabled: boolean) => Promise<void>;
  fetchHistory: () => Promise<void>;
  /** Called after a successful OAuth code exchange (src/lib/googleDrive/auth.ts's exchangeAuthCode). */
  onConnected: () => Promise<void>;
  disconnect: () => Promise<void>;
  runBackup: (trigger: BackupTrigger) => Promise<BackupRunResult>;
  checkAutoBackup: (trigger: BackupTrigger) => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Singleton row (id=1, enforced by a check constraint) — created lazily with
// placeholder defaults for the columns this milestone doesn't own (theme/
// currency/locale belong to a future Appearance/Preferences milestone, §6.1/
// §6.4). autoBackupEnabled defaults to false: there's nothing to back up to
// until the user connects an account, so defaulting it "on" before that would
// be presumptuous.
async function ensureAppSettingsRow(db: AppDatabase): Promise<typeof appSettings.$inferSelect> {
  const [existing] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(appSettings)
    .values({
      id: 1,
      themeMode: 'system',
      colorThemeId: 'ocean',
      autoBackupEnabled: false,
    })
    .returning();
  return inserted;
}

async function recordBackupAttempt(
  db: AppDatabase,
  status: BackupStatus,
  trigger: BackupTrigger,
  errorMessage: string | null,
): Promise<void> {
  await db.insert(backupLog).values({ status, trigger, errorMessage });
}

async function fetchAllTables(db: AppDatabase) {
  const [
    accountRows,
    accountLoanDetailsRows,
    categoryGroupRows,
    categoryRows,
    categoryMonthBudgetRows,
    transactionRows,
    transferRows,
    appSettingsRows,
  ] = await Promise.all([
    db.select().from(accounts),
    db.select().from(accountLoanDetails),
    db.select().from(categoryGroups),
    db.select().from(categories),
    db.select().from(categoryMonthBudgets),
    db.select().from(transactions),
    db.select().from(transfers),
    db.select().from(appSettings),
  ]);

  return {
    accounts: accountRows,
    accountLoanDetails: accountLoanDetailsRows,
    categoryGroups: categoryGroupRows,
    categories: categoryRows,
    categoryMonthBudgets: categoryMonthBudgetRows,
    transactions: transactionRows,
    transfers: transferRows,
    appSettings: appSettingsRows,
  };
}

// Factory (see accountsStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createBackupStore(db: AppDatabase): UseBoundStore<StoreApi<BackupState>> {
  return create<BackupState>((set, get) => ({
    isInitialized: false,
    isConnected: false,
    connectedEmail: null,
    autoBackupEnabled: false,
    lastBackupAt: null,
    history: [],
    isBackingUp: false,
    error: null,

    initialize: async () => {
      try {
        const settings = await ensureAppSettingsRow(db);
        const [accessToken, email] = await Promise.all([getValidAccessToken(), loadAccountEmail()]);

        set({
          isInitialized: true,
          isConnected: accessToken !== null,
          connectedEmail: accessToken !== null ? email : null,
          autoBackupEnabled: settings.autoBackupEnabled,
          lastBackupAt: settings.lastBackupAt,
        });
        await get().fetchHistory();
      } catch (error) {
        set({ isInitialized: true, error: toErrorMessage(error) });
      }
    },

    setAutoBackupEnabled: async (enabled) => {
      await db.update(appSettings).set({ autoBackupEnabled: enabled }).where(eq(appSettings.id, 1));
      set({ autoBackupEnabled: enabled });
    },

    fetchHistory: async () => {
      const rows = await db.select().from(backupLog).orderBy(desc(backupLog.timestamp));
      set({ history: rows });
    },

    onConnected: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;

      const email = await fetchConnectedAccountEmail(accessToken);
      if (email) await saveAccountEmail(email);
      set({ isConnected: true, connectedEmail: email });
    },

    disconnect: async () => {
      await disconnectGoogleDrive();
      set({ isConnected: false, connectedEmail: null });
    },

    runBackup: async (trigger) => {
      set({ isBackingUp: true, error: null });
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          const errorMessage = 'Not connected to Google Drive';
          await recordBackupAttempt(db, 'failed', trigger, errorMessage);
          await get().fetchHistory();
          set({ isBackingUp: false });
          return { ok: false, errorMessage };
        }

        const tables = await fetchAllTables(db);
        const now = new Date();
        const exportData = buildBackupExport(tables, now);
        const folderId = await ensureBackupFolder(accessToken, BACKUP_FOLDER_NAME);
        const filename = `cofrinho-backup-${now.toISOString().replace(/[:.]/g, '-')}.json`;

        await uploadBackupFile(accessToken, folderId, filename, JSON.stringify(exportData));

        await recordBackupAttempt(db, 'success', trigger, null);
        await db.update(appSettings).set({ lastBackupAt: now }).where(eq(appSettings.id, 1));

        set({ isBackingUp: false, lastBackupAt: now });
        await get().fetchHistory();
        return { ok: true, errorMessage: null };
      } catch (error) {
        const errorMessage = toErrorMessage(error);
        await recordBackupAttempt(db, 'failed', trigger, errorMessage);
        await get().fetchHistory();
        set({ isBackingUp: false });
        return { ok: false, errorMessage };
      }
    },

    checkAutoBackup: async (trigger) => {
      const { autoBackupEnabled, isConnected, lastBackupAt } = get();
      const due = shouldRunAutoBackup({
        autoBackupEnabled,
        isConnected,
        lastBackupAt,
        now: new Date(),
      });
      if (due) await get().runBackup(trigger);
    },
  }));
}
