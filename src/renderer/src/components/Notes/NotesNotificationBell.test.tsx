// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { useNotesStore } from '../../stores/notesStore'
import { NotesNotificationBell } from './NotesNotificationBell'

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

describe('Notifications bell', () => {
  beforeEach(() => {
    void i18n.changeLanguage('en')
    useNotesStore.setState({
      inboxOpen: false,
      notes: [],
      inbox: [
        {
          id: 'spark-1',
          noteId: 'note-1',
          title: 'Standup reminder',
          body: 'Check the deploy',
          firedAt: '2026-10-19T12:00:00.000Z',
          read: false,
          source: 'note'
        },
        {
          id: 'c1:pod:shop/web',
          noteId: 'alert:c1:pod:shop/web',
          title: 'web is crash looping',
          body: 'prod · back-off',
          firedAt: '2026-10-19T12:01:00.000Z',
          read: false,
          source: 'cluster',
          clusterId: 'c1',
          resourceKind: 'Pods',
          resourceName: 'web',
          namespace: 'shop'
        }
      ]
    })
  })

  it('uses the Notifications label and lists spark and cluster items', () => {
    render(<NotesNotificationBell />)
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText('Notifications')).toBeTruthy()
    expect(screen.getByText('Standup reminder')).toBeTruthy()
    expect(screen.getByText('web is crash looping')).toBeTruthy()
  })
})
