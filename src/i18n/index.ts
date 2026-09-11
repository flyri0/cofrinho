import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

export const FALLBACK_LOCALE = 'pt-BR';

const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
};

// Only pt-BR and en ship today; any other device language code falls back to pt-BR (spec §6.4).
function detectDeviceLocale(): string {
  const languageCode = getLocales()[0]?.languageCode;

  if (languageCode === 'en') return 'en';
  if (languageCode === 'pt') return 'pt-BR';

  return FALLBACK_LOCALE;
}

// eslint-disable-next-line import/no-named-as-default-member -- i18next's default export legitimately carries `use`
i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLocale(),
  fallbackLng: FALLBACK_LOCALE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
