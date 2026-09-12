import { eq } from 'drizzle-orm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AppDatabase } from '@/db/types';
import {
  appSettings,
  type ColorThemeId,
  type CurrencySymbolPosition,
  type DecimalSeparator,
  type ThemeMode,
} from '@/db/schema';

import { ensureAppSettingsRow } from './appSettingsRow';

export type AppSettingsRow = typeof appSettings.$inferSelect;

export interface SettingsState {
  isInitialized: boolean;
  themeMode: ThemeMode;
  colorThemeId: ColorThemeId;
  currencySymbol: string;
  currencySymbolPosition: CurrencySymbolPosition;
  decimalSeparator: DecimalSeparator;
  firstDayOfMonth: number;
  locale: string;
  initialize: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setColorThemeId: (id: ColorThemeId) => Promise<void>;
  setCurrencySymbol: (symbol: string) => Promise<void>;
  setCurrencySymbolPosition: (position: CurrencySymbolPosition) => Promise<void>;
  setDecimalSeparator: (separator: DecimalSeparator) => Promise<void>;
  setFirstDayOfMonth: (day: number) => Promise<void>;
  setLocale: (locale: string) => Promise<void>;
}

async function patchSettings(db: AppDatabase, patch: Partial<AppSettingsRow>): Promise<void> {
  await db.update(appSettings).set(patch).where(eq(appSettings.id, 1));
}

// Factory (see accountsStore.ts) so tests can inject a db backed by any 'sync' driver.
export function createSettingsStore(db: AppDatabase): UseBoundStore<StoreApi<SettingsState>> {
  return create<SettingsState>((set) => ({
    isInitialized: false,
    themeMode: 'system',
    colorThemeId: 'ocean',
    currencySymbol: 'R$',
    currencySymbolPosition: 'before',
    decimalSeparator: ',',
    firstDayOfMonth: 1,
    locale: 'pt-BR',

    initialize: async () => {
      const row = await ensureAppSettingsRow(db);
      set({
        isInitialized: true,
        themeMode: row.themeMode,
        colorThemeId: row.colorThemeId,
        currencySymbol: row.currencySymbol,
        currencySymbolPosition: row.currencySymbolPosition,
        decimalSeparator: row.decimalSeparator,
        firstDayOfMonth: row.firstDayOfMonth,
        locale: row.locale,
      });
    },

    setThemeMode: async (mode) => {
      await patchSettings(db, { themeMode: mode });
      set({ themeMode: mode });
    },

    setColorThemeId: async (id) => {
      await patchSettings(db, { colorThemeId: id });
      set({ colorThemeId: id });
    },

    setCurrencySymbol: async (symbol) => {
      await patchSettings(db, { currencySymbol: symbol });
      set({ currencySymbol: symbol });
    },

    setCurrencySymbolPosition: async (position) => {
      await patchSettings(db, { currencySymbolPosition: position });
      set({ currencySymbolPosition: position });
    },

    setDecimalSeparator: async (separator) => {
      await patchSettings(db, { decimalSeparator: separator });
      set({ decimalSeparator: separator });
    },

    setFirstDayOfMonth: async (day) => {
      await patchSettings(db, { firstDayOfMonth: day });
      set({ firstDayOfMonth: day });
    },

    setLocale: async (locale) => {
      await patchSettings(db, { locale });
      set({ locale });
    },
  }));
}
