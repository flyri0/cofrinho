import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/types';
import { appSettings } from '@/db/schema';

import { createBackupStore } from '../backupStore';
import { createTestDatabase } from '../testDb';

const mockGoogleDrive = {
  getValidAccessToken: jest.fn(),
  loadAccountEmail: jest.fn(),
  saveAccountEmail: jest.fn(),
  fetchConnectedAccountEmail: jest.fn(),
  ensureBackupFolder: jest.fn(),
  uploadBackupFile: jest.fn(),
  disconnectGoogleDrive: jest.fn(),
};

jest.mock('@/lib/googleDrive', () => ({
  getValidAccessToken: (...args: unknown[]) => mockGoogleDrive.getValidAccessToken(...args),
  loadAccountEmail: (...args: unknown[]) => mockGoogleDrive.loadAccountEmail(...args),
  saveAccountEmail: (...args: unknown[]) => mockGoogleDrive.saveAccountEmail(...args),
  fetchConnectedAccountEmail: (...args: unknown[]) =>
    mockGoogleDrive.fetchConnectedAccountEmail(...args),
  ensureBackupFolder: (...args: unknown[]) => mockGoogleDrive.ensureBackupFolder(...args),
  uploadBackupFile: (...args: unknown[]) => mockGoogleDrive.uploadBackupFile(...args),
  disconnectGoogleDrive: (...args: unknown[]) => mockGoogleDrive.disconnectGoogleDrive(...args),
}));

describe('backupStore', () => {
  let db: AppDatabase;
  let backupStore: ReturnType<typeof createBackupStore>;

  beforeEach(() => {
    db = createTestDatabase();
    backupStore = createBackupStore(db);
    // resetAllMocks (not clearAllMocks) also drops any mockResolvedValue/
    // mockRejectedValue implementation from a previous test — clearAllMocks
    // only resets call counts, which previously let e.g. one test's
    // uploadBackupFile.mockRejectedValue(...) silently leak into later tests.
    jest.resetAllMocks();
    mockGoogleDrive.getValidAccessToken.mockResolvedValue(null);
    mockGoogleDrive.loadAccountEmail.mockResolvedValue(null);
  });

  describe('initialize', () => {
    it('creates the singleton app_settings row with documented placeholder defaults', async () => {
      await backupStore.getState().initialize();

      const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
      expect(row).toMatchObject({
        autoBackupEnabled: false,
        lastBackupAt: null,
      });
      expect(backupStore.getState()).toMatchObject({
        isInitialized: true,
        isConnected: false,
        connectedEmail: null,
        autoBackupEnabled: false,
        lastBackupAt: null,
      });
    });

    it('reflects an already-connected state from stored tokens', async () => {
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');
      mockGoogleDrive.loadAccountEmail.mockResolvedValue('user@example.com');

      await backupStore.getState().initialize();

      expect(backupStore.getState()).toMatchObject({
        isConnected: true,
        connectedEmail: 'user@example.com',
      });
    });

    it('does not recreate the row on a second call (idempotent)', async () => {
      await backupStore.getState().initialize();
      await backupStore.getState().setAutoBackupEnabled(true);
      await backupStore.getState().initialize();

      const rows = await db.select().from(appSettings);
      expect(rows).toHaveLength(1);
      expect(backupStore.getState().autoBackupEnabled).toBe(true);
    });
  });

  describe('settings', () => {
    it('persists the auto-backup toggle', async () => {
      await backupStore.getState().initialize();
      await backupStore.getState().setAutoBackupEnabled(true);

      const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
      expect(row.autoBackupEnabled).toBe(true);
      expect(backupStore.getState().autoBackupEnabled).toBe(true);
    });
  });

  describe('onConnected / disconnect', () => {
    it('fetches and stores the connected account email after a successful sign-in', async () => {
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');
      mockGoogleDrive.fetchConnectedAccountEmail.mockResolvedValue('user@example.com');

      await backupStore.getState().onConnected();

      expect(mockGoogleDrive.saveAccountEmail).toHaveBeenCalledWith('user@example.com');
      expect(backupStore.getState()).toMatchObject({
        isConnected: true,
        connectedEmail: 'user@example.com',
      });
    });

    it('clears connection state on disconnect', async () => {
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');
      mockGoogleDrive.fetchConnectedAccountEmail.mockResolvedValue('user@example.com');
      await backupStore.getState().onConnected();

      await backupStore.getState().disconnect();

      expect(mockGoogleDrive.disconnectGoogleDrive).toHaveBeenCalled();
      expect(backupStore.getState()).toMatchObject({ isConnected: false, connectedEmail: null });
    });
  });

  describe('runBackup', () => {
    it('uploads to the Cofrinho folder and records a success entry', async () => {
      await backupStore.getState().initialize();
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');
      mockGoogleDrive.ensureBackupFolder.mockResolvedValue('folder-id-1');
      mockGoogleDrive.uploadBackupFile.mockResolvedValue(undefined);

      const result = await backupStore.getState().runBackup('manual');

      expect(result.ok).toBe(true);
      expect(mockGoogleDrive.ensureBackupFolder).toHaveBeenCalledWith('token-123', 'Cofrinho');
      expect(mockGoogleDrive.uploadBackupFile).toHaveBeenCalledWith(
        'token-123',
        'folder-id-1',
        expect.stringMatching(/^cofrinho-backup-.+\.json$/),
        expect.stringContaining('"version"'),
      );

      const state = backupStore.getState();
      expect(state.lastBackupAt).not.toBeNull();
      expect(state.history).toHaveLength(1);
      expect(state.history[0]).toMatchObject({
        status: 'success',
        trigger: 'manual',
        errorMessage: null,
      });
    });

    it('records a failed entry and does not advance lastBackupAt when not connected', async () => {
      await backupStore.getState().initialize();
      mockGoogleDrive.getValidAccessToken.mockResolvedValue(null);

      const result = await backupStore.getState().runBackup('manual');

      expect(result).toEqual({ ok: false, errorMessage: 'Not connected to Google Drive' });
      expect(backupStore.getState().lastBackupAt).toBeNull();
      expect(backupStore.getState().history[0]).toMatchObject({
        status: 'failed',
        trigger: 'manual',
      });
    });

    it('records a failed entry with the error message when the upload throws', async () => {
      await backupStore.getState().initialize();
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');
      mockGoogleDrive.ensureBackupFolder.mockResolvedValue('folder-id-1');
      mockGoogleDrive.uploadBackupFile.mockRejectedValue(new Error('network error'));

      const result = await backupStore.getState().runBackup('auto_background');

      expect(result).toEqual({ ok: false, errorMessage: 'network error' });
      expect(backupStore.getState().history[0]).toMatchObject({
        status: 'failed',
        trigger: 'auto_background',
        errorMessage: 'network error',
      });
    });
  });

  describe('checkAutoBackup', () => {
    it('runs a backup when due', async () => {
      await backupStore.getState().initialize();
      await backupStore.getState().setAutoBackupEnabled(true);
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');
      mockGoogleDrive.fetchConnectedAccountEmail.mockResolvedValue('user@example.com');
      await backupStore.getState().onConnected();
      mockGoogleDrive.ensureBackupFolder.mockResolvedValue('folder-id-1');

      await backupStore.getState().checkAutoBackup('auto_foreground');

      expect(mockGoogleDrive.uploadBackupFile).toHaveBeenCalled();
      expect(backupStore.getState().history[0].trigger).toBe('auto_foreground');
    });

    it('does nothing when auto-backup is disabled', async () => {
      await backupStore.getState().initialize();
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');

      await backupStore.getState().checkAutoBackup('auto_background');

      expect(mockGoogleDrive.uploadBackupFile).not.toHaveBeenCalled();
      expect(backupStore.getState().history).toHaveLength(0);
    });

    it('does not run a second time inside the same day', async () => {
      await backupStore.getState().initialize();
      await backupStore.getState().setAutoBackupEnabled(true);
      mockGoogleDrive.getValidAccessToken.mockResolvedValue('token-123');
      mockGoogleDrive.fetchConnectedAccountEmail.mockResolvedValue('user@example.com');
      await backupStore.getState().onConnected();
      mockGoogleDrive.ensureBackupFolder.mockResolvedValue('folder-id-1');

      await backupStore.getState().checkAutoBackup('auto_foreground');
      await backupStore.getState().checkAutoBackup('auto_background');

      expect(mockGoogleDrive.uploadBackupFile).toHaveBeenCalledTimes(1);
      expect(backupStore.getState().history).toHaveLength(1);
    });
  });
});
