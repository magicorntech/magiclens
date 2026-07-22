import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { defaultAppLocale } from '@shared/types/locale'
import { en } from './locales/en'
import { tr } from './locales/tr'
import { de } from './locales/de'
import { fr } from './locales/fr'
import { ja } from './locales/ja'
import { zh } from './locales/zh'
import { ko } from './locales/ko'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    de: { translation: de },
    fr: { translation: fr },
    ja: { translation: ja },
    zh: { translation: zh },
    ko: { translation: ko }
  },
  lng: defaultAppLocale,
  fallbackLng: defaultAppLocale,
  interpolation: { escapeValue: false },
  returnNull: false
})

export default i18n
