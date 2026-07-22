import { useEffect, useState } from 'react'
import { Button, Typography } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Cable,
  Columns2,
  Layers,
  Network,
  Search,
  Terminal
} from 'lucide-react'
import { Icon } from '../ui/Icon'
import logo from '../../assets/logo.png'

interface FeatureTourScreenProps {
  onFinish: () => void
}

type TourSlide = {
  id: string
  eyebrow: string
  title: string
  body: string
  icon: typeof Layers
  accent: string
}

const SLIDES: TourSlide[] = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'MagicLens for Kubernetes',
    body: 'A fast desktop client to manage clusters, resources, VPN tunnels, logs, and terminals in one place — offline-first on your machine.',
    icon: Layers,
    accent: '#8b5cf6'
  },
  {
    id: 'clusters',
    eyebrow: 'Clusters',
    title: 'Multi-cluster, one workspace',
    body: 'Import kubeconfigs, pin favorites, and switch tabs instantly across every cluster you work with.',
    icon: Layers,
    accent: '#6366f1'
  },
  {
    id: 'split',
    eyebrow: 'Split view',
    title: 'Compare two clusters at once',
    body: 'Open split view to keep two cluster tabs side by side — perfect for staging vs production or checking the same resource across environments.',
    icon: Columns2,
    accent: '#14b8a6'
  },
  {
    id: 'search',
    eyebrow: 'Search',
    title: 'Find anything fast',
    body: 'Global search jumps to clusters, namespaces, and resources in one shortcut (⌘K / Ctrl+K by default — change it anytime in Settings → Keyboard).',
    icon: Search,
    accent: '#38bdf8'
  },
  {
    id: 'resources',
    eyebrow: 'Explorer',
    title: 'Browse every resource',
    body: 'Workloads, Config, Network, Storage, and more — live watch, YAML edit, batch actions, and a focused detail panel.',
    icon: Box,
    accent: '#0ea5e9'
  },
  {
    id: 'vpn',
    eyebrow: 'VPN',
    title: 'Private clusters, your tunnels',
    body: 'Upload OpenVPN / Pritunl / WireGuard profiles, link them to clusters, and keep multiple tunnels up while you switch tabs.',
    icon: Network,
    accent: '#22c55e'
  },
  {
    id: 'ops',
    eyebrow: 'Day-to-day',
    title: 'Logs, exec & terminals',
    body: 'Tail and download pod logs, exec into containers, open local terminals, and keep everything handy in the bottom panel.',
    icon: Terminal,
    accent: '#f59e0b'
  },
  {
    id: 'forward',
    eyebrow: 'Access',
    title: 'Port forwarding made simple',
    body: 'Forward a Pod or Service to a local port in a couple of clicks — MagicLens keeps the session visible while you work.',
    icon: Cable,
    accent: '#ec4899'
  }
]

/**
 * Full-screen feature card slider shown on first launch and again after an app update
 * (same timing as the previous splash intro).
 */
export function FeatureTourScreen({ onFinish }: FeatureTourScreenProps): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]!
  const isLast = index === SLIDES.length - 1
  const isFirst = index === 0

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
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
  }, [isLast, onFinish])

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
              <Typography.Text className="ml-feature-tour__eyebrow">{slide.eyebrow}</Typography.Text>
              <Typography.Title level={2} className="ml-feature-tour__title">
                {slide.title}
              </Typography.Title>
              <Typography.Paragraph className="ml-feature-tour__body">{slide.body}</Typography.Paragraph>
            </motion.article>
          </AnimatePresence>
        </div>

        <div className="ml-feature-tour__dots" role="tablist" aria-label="Feature slides">
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

        <div className="ml-feature-tour__nav">
          <Button type="text" className="ml-feature-tour__skip" onClick={onFinish}>
            Skip
          </Button>
          <div className="ml-feature-tour__nav-right">
            <Button
              disabled={isFirst}
              icon={<Icon icon={ArrowLeft} variant="action" />}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Back
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
                Get started
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
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
