// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { useLocalAlertsStore } from '../../stores/localAlertsStore'
import { AlertsSettings } from './AlertsSettings'

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList
}

describe('Alerts settings', () => {
  beforeEach(() => {
    void i18n.changeLanguage('en')
    useLocalAlertsStore.setState({
      enabled: true,
      osNotify: true,
      prefs: {
        sound: 'chime',
        soundFor: 'all',
        restartThreshold: 10,
        pendingMinutes: 10,
        types: {
          crashLoop: true,
          imagePull: true,
          podFailed: true,
          podPending: true,
          restartsHigh: true,
          nodeNotReady: true,
          nodePressure: false,
          jobFailed: true,
          deploymentUnavailable: true,
          certExpiring: true,
          certExpired: true
        }
      }
    })
  })

  it('shows watching, sound, thresholds, and alert types', () => {
    render(<AlertsSettings />)
    expect(screen.getByText('Watching')).toBeTruthy()
    expect(screen.getByText('Notification sound')).toBeTruthy()
    expect(screen.getByText('Restart count')).toBeTruthy()
    expect(screen.getByText('Crash looping pods')).toBeTruthy()
    expect(screen.getByText('Image pull failures')).toBeTruthy()
    expect(screen.getByText('Node pressure')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask for permission' })).toBeTruthy()
  })
})
