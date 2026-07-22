export const APP_LOCALES = ['en', 'tr', 'de', 'fr', 'ja', 'zh', 'ko'] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const defaultAppLocale: AppLocale = 'en'

/** Native labels for the language picker (not translated). */
export const APP_LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語',
  zh: '中文',
  ko: '한국어'
}

export function normalizeAppLocale(value?: string | null): AppLocale {
  if (value && (APP_LOCALES as readonly string[]).includes(value)) {
    return value as AppLocale
  }
  return defaultAppLocale
}
