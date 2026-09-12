import type { AppDatabase } from '@/db/types';

import { createBackupStore } from '../backupStore';
import { createSettingsStore } from '../settingsStore';
import { createTestDatabase } from '../testDb';

describe('settingsStore', () => {
  let db: AppDatabase;
  let settingsStore: ReturnType<typeof createSettingsStore>;

  beforeEach(() => {
    db = createTestDatabase();
    settingsStore = createSettingsStore(db);
  });

  it('initializes with documented defaults on a fresh database', async () => {
    await settingsStore.getState().initialize();

    expect(settingsStore.getState()).toMatchObject({
      isInitialized: true,
      themeMode: 'system',
      colorThemeId: 'ocean',
      currencySymbol: 'R$',
      currencySymbolPosition: 'before',
      decimalSeparator: ',',
      firstDayOfMonth: 1,
      locale: 'pt-BR',
    });
  });

  it('persists and reflects each setting independently', async () => {
    await settingsStore.getState().initialize();

    await settingsStore.getState().setThemeMode('dark');
    await settingsStore.getState().setColorThemeId('sunset');
    await settingsStore.getState().setCurrencySymbol('$');
    await settingsStore.getState().setCurrencySymbolPosition('after');
    await settingsStore.getState().setDecimalSeparator('.');
    await settingsStore.getState().setFirstDayOfMonth(15);
    await settingsStore.getState().setLocale('en');

    expect(settingsStore.getState()).toMatchObject({
      themeMode: 'dark',
      colorThemeId: 'sunset',
      currencySymbol: '$',
      currencySymbolPosition: 'after',
      decimalSeparator: '.',
      firstDayOfMonth: 15,
      locale: 'en',
    });

    // Re-initializing (e.g. a fresh app launch) reads back the persisted values, not defaults.
    const reloaded = createSettingsStore(db);
    await reloaded.getState().initialize();
    expect(reloaded.getState()).toMatchObject({
      themeMode: 'dark',
      colorThemeId: 'sunset',
      locale: 'en',
    });
  });

  it('shares the same app_settings row with backupStore without racing (concurrent initialize)', async () => {
    const backupStore = createBackupStore(db);

    // Both stores' initialize() ensure the same singleton row; run them
    // concurrently (as the root layout actually does) to prove the shared
    // ensureAppSettingsRow helper's onConflictDoNothing prevents a
    // unique-constraint race rather than merely "usually working" when run
    // sequentially in tests.
    await Promise.all([settingsStore.getState().initialize(), backupStore.getState().initialize()]);

    expect(settingsStore.getState().isInitialized).toBe(true);
    expect(backupStore.getState().isInitialized).toBe(true);
    expect(backupStore.getState().error).toBeNull();
  });
});
