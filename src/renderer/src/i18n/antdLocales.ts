import type { Locale } from 'antd/es/locale'
import enUS from 'antd/locale/en_US'
import trTR from 'antd/locale/tr_TR'
import deDE from 'antd/locale/de_DE'
import frFR from 'antd/locale/fr_FR'
import jaJP from 'antd/locale/ja_JP'
import zhCN from 'antd/locale/zh_CN'
import koKR from 'antd/locale/ko_KR'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/tr'
import 'dayjs/locale/de'
import 'dayjs/locale/fr'
import 'dayjs/locale/ja'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/ko'
import { normalizeAppLocale, type AppLocale } from '@shared/types/locale'

const ANTD_LOCALES: Record<AppLocale, Locale> = {
  en: enUS,
  tr: trTR,
  de: deDE,
  fr: frFR,
  ja: jaJP,
  zh: zhCN,
  ko: koKR
}

const DAYJS_LOCALES: Record<AppLocale, string> = {
  en: 'en',
  tr: 'tr',
  de: 'de',
  fr: 'fr',
  ja: 'ja',
  zh: 'zh-cn',
  ko: 'ko'
}

export function getAntdLocale(language: string): Locale {
  return ANTD_LOCALES[normalizeAppLocale(language)]
}

export function applyDayjsLocale(language: string): void {
  dayjs.locale(DAYJS_LOCALES[normalizeAppLocale(language)])
}
