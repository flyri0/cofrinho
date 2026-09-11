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
  type DriveFolderMode,
} from '@/db/schema';
import { buildBackupExport, resolveDriveFolderName, shouldRunAutoBackup } from '@/lib/backup';
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

export interface BackupRunResult {
  ok: boolean;
  errorMessage: string | null;
}

export interface BackupState {
  isInitialized: boolean;
  isConnected: boolean;
  connectedEmail: string | null;
  autoBackupEnabled: boolean;
  driveFolderMode: DriveFolderMode;
  lastBackupAt: Date | null;
  history: BackupLogRow[];
  isBackingUp: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  setAutoBackupEnabled: (enabled: boolean) => Promise<void>;
  setDriveFolderMode: (mode: DriveFolderMode) => Promise<void>;
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
// be presumptuous. driveFolderMode defaults to 'visible_folder' since that's
// the one mode that behaves exactly as its name promises under drive.file
// scope (see lib/backup/driveFolderName.ts for the 'app_data_folder' caveat).
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
      driveFolderMode: 'visible_folder',
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
    driveFolderMode: 'visible_folder',
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
          driveFolderMode: settings.driveFolderMode,
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

    setDriveFolderMode: async (mode) => {
      await db.update(appSettings).set({ driveFolderMode: mode }).where(eq(appSettings.id, 1));
      set({ driveFolderMode: mode });
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
        const folderName = resolveDriveFolderName(get().driveFolderMode);
        const folderId = await ensureBackupFolder(accessToken, folderName);
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
