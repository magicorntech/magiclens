import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { defaultAppLocale } from '@shared/types/locale'
import { en, type TranslationOverrides, type TranslationResources } from './locales/en'
import { tr } from './locales/tr'
import { de } from './locales/de'
import { fr } from './locales/fr'
import { ja } from './locales/ja'
import { zh } from './locales/zh'
import { ko } from './locales/ko'

function deepMerge(base: unknown, patch: unknown): unknown {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch ?? base
  if (!base || typeof base !== 'object' || Array.isArray(base)) return patch
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge((base as Record<string, unknown>)[key], value)
    } else if (value !== undefined) {
      out[key] = value
    }
  }
  return out
}

function withEnglishFallback(overrides: TranslationOverrides): TranslationResources {
  return deepMerge(en, overrides) as TranslationResources
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: withEnglishFallback(tr) },
    de: { translation: withEnglishFallback(de) },
    fr: { translation: withEnglishFallback(fr) },
    ja: { translation: withEnglishFallback(ja) },
    zh: { translation: withEnglishFallback(zh) },
    ko: { translation: withEnglishFallback(ko) }
  },
  lng: defaultAppLocale,
  fallbackLng: defaultAppLocale,
  interpolation: { escapeValue: false },
  returnNull: false
})

export default i18n
