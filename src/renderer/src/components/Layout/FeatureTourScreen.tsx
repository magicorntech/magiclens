import { useEffect, useState } from 'react'
import { Button, Typography } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Cable,
  Columns2,
  Globe,
  Layers,
  Network,
  Search,
  Terminal,
  Waypoints
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import logo from '../../assets/logo.png'
import { APP_LOCALES, APP_LOCALE_LABELS, type AppLocale } from '@shared/types/locale'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'

interface FeatureTourScreenProps {
  onFinish: () => void
}

type TourPhase = 'language' | 'slides'

type SlideMeta = {
  id:
    | 'welcome'
    | 'clusters'
    | 'split'
    | 'search'
    | 'resources'
    | 'topology'
    | 'vpn'
    | 'ops'
    | 'forward'
  icon: typeof Layers
  accent: string
}

const SLIDES: SlideMeta[] = [
  { id: 'welcome', icon: Layers, accent: '#8b5cf6' },
  { id: 'clusters', icon: Layers, accent: '#6366f1' },
  { id: 'split', icon: Columns2, accent: '#14b8a6' },
  { id: 'search', icon: Search, accent: '#38bdf8' },
  { id: 'resources', icon: Box, accent: '#0ea5e9' },
  { id: 'topology', icon: Waypoints, accent: '#06b6d4' },
  { id: 'vpn', icon: Network, accent: '#22c55e' },
  { id: 'ops', icon: Terminal, accent: '#f59e0b' },
  { id: 'forward', icon: Cable, accent: '#ec4899' }
]

/**
 * Full-screen feature card slider shown on first launch and again after an app update
 * (same timing as the previous splash intro). Language is chosen first, then slides
 * render in that locale.
 */
export function FeatureTourScreen({ onFinish }: FeatureTourScreenProps): React.JSX.Element {
  const { t } = useTranslation()
  const locale = useDisplaySettingsStore((s) => s.locale)
  const setLocale = useDisplaySettingsStore((s) => s.setLocale)
  const [phase, setPhase] = useState<TourPhase>('language')
  const [draftLocale, setDraftLocale] = useState<AppLocale>(locale)
  const [index, setIndex] = useState(0)

  const slide = SLIDES[index]!
  const isLast = index === SLIDES.length - 1
  const isFirst = index === 0

  useEffect(() => {
    setDraftLocale(locale)
  }, [locale])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (phase === 'language') {
        if (e.key === 'Enter') {
          e.preventDefault()
          void goToSlides()
        } else if (e.key === 'Escape') {
          onFinish()
        }
        return
      }

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (isLast) onFinish()
        else setIndex((i) => Math.min(SLIDES.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'Escape') {
        onFinish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isLast, onFinish, draftLocale])

  async function goToSlides(): Promise<void> {
    if (draftLocale !== locale) {
      await setLocale(draftLocale)
    }
    setIndex(0)
    setPhase('slides')
  }

  return (
    <div className="ml-feature-tour">
      <div className="splash-blob splash-blob-1" />
      <div className="splash-blob splash-blob-2" />
      <div className="splash-blob splash-blob-3" />
      <div className="splash-blob splash-blob-4" />
      <div className="splash-blob splash-blob-5" />
      <div className="splash-noise" />

      <div className="ml-feature-tour__inner splash-content">
        <div className="ml-feature-tour__brand">
          <img src={logo} alt="" className="ml-feature-tour__logo" />
          <Typography.Text className="ml-feature-tour__brand-name">MagicLens</Typography.Text>
        </div>

        <div className="ml-feature-tour__stage">
          <AnimatePresence mode="wait">
            {phase === 'language' ? (
              <motion.article
                key="language"
                className="ml-feature-tour__card"
                initial={{ opacity: 0, x: 36, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -36, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className="ml-feature-tour__icon"
                  style={{
                    background: 'color-mix(in srgb, #38bdf8 22%, transparent)',
                    color: '#38bdf8',
                    boxShadow: '0 0 0 1px color-mix(in srgb, #38bdf8 35%, transparent)'
                  }}
                >
                  <Icon icon={Globe} variant="action" />
                </div>
                <Typography.Text className="ml-feature-tour__eyebrow">
                  {APP_LOCALE_LABELS[draftLocale]}
                </Typography.Text>
                <Typography.Title level={2} className="ml-feature-tour__title">
                  {t('tour.chooseLanguage')}
                </Typography.Title>
                <Typography.Paragraph className="ml-feature-tour__body">
                  {t('tour.languageHint')}
                </Typography.Paragraph>
                <div className="ml-feature-tour__langs" role="listbox" aria-label={t('tour.chooseLanguage')}>
                  {APP_LOCALES.map((code) => {
                    const selected = draftLocale === code
                    return (
                      <button
                        key={code}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`ml-feature-tour__lang${selected ? ' ml-feature-tour__lang--selected' : ''}`}
                        onClick={() => {
                          setDraftLocale(code)
                          void setLocale(code)
                        }}
                      >
                        <span className="ml-feature-tour__lang-code">{code.toUpperCase()}</span>
                        <span className="ml-feature-tour__lang-label">{APP_LOCALE_LABELS[code]}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.article>
            ) : (
              <motion.article
                key={slide.id}
                className="ml-feature-tour__card"
                initial={{ opacity: 0, x: 36, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -36, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className="ml-feature-tour__icon"
                  style={{
                    background: `color-mix(in srgb, ${slide.accent} 22%, transparent)`,
                    color: slide.accent,
                    boxShadow: `0 0 0 1px color-mix(in srgb, ${slide.accent} 35%, transparent)`
                  }}
                >
                  <Icon icon={slide.icon} variant="action" />
                </div>
                <Typography.Text className="ml-feature-tour__eyebrow">
                  {t(`tour.slides.${slide.id}.eyebrow`)}
                </Typography.Text>
                <Typography.Title level={2} className="ml-feature-tour__title">
                  {t(`tour.slides.${slide.id}.title`)}
                </Typography.Title>
                <Typography.Paragraph className="ml-feature-tour__body">
                  {t(`tour.slides.${slide.id}.body`)}
                </Typography.Paragraph>
              </motion.article>
            )}
          </AnimatePresence>
        </div>

        {phase === 'slides' ? (
          <div className="ml-feature-tour__dots" role="tablist" aria-label={t('tour.slidesAria')}>
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`ml-feature-tour__dot${i === index ? ' ml-feature-tour__dot--active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : (
          <div className="ml-feature-tour__dots ml-feature-tour__dots--spacer" aria-hidden />
        )}

        <div className="ml-feature-tour__nav">
          <Button type="text" className="ml-feature-tour__skip" onClick={onFinish}>
            {t('tour.skip')}
          </Button>
          <div className="ml-feature-tour__nav-right">
            {phase === 'language' ? (
              <Button
                type="primary"
                size="large"
                shape="round"
                icon={<Icon icon={ArrowRight} variant="action" />}
                iconPosition="end"
                onClick={() => void goToSlides()}
              >
                {t('tour.continue')}
              </Button>
            ) : (
              <>
                <Button
                  icon={<Icon icon={ArrowLeft} variant="action" />}
                  onClick={() => {
                    if (isFirst) setPhase('language')
                    else setIndex((i) => Math.max(0, i - 1))
                  }}
                >
                  {t('tour.back')}
                </Button>
                {isLast ? (
                  <Button
                    type="primary"
                    size="large"
                    shape="round"
                    icon={<Icon icon={ArrowRight} variant="action" />}
                    iconPosition="end"
                    onClick={onFinish}
                  >
                    {t('tour.getStarted')}
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    shape="round"
                    icon={<Icon icon={ArrowRight} variant="action" />}
                    iconPosition="end"
                    onClick={() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
                  >
                    {t('tour.next')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
