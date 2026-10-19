import { useEffect, useState } from 'react'
import { Button, Select } from 'antd'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RESOURCE_KINDS, type ResourceKind } from '@shared/resourceKinds'
import { chordIsPrefix, chordKeysEqual, normalizeChordKeys } from '@shared/resourceChords'
import { newResourceChord, useResourceChordStore } from '../../stores/resourceChordStore'
import { Icon } from '../ui/Icon'
import { SettingsSection } from './SettingsPrimitives'

export function ResourceChordSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const chords = useResourceChordStore((s) => s.chords)
  const upsert = useResourceChordStore((s) => s.upsert)
  const remove = useResourceChordStore((s) => s.remove)
  const applyTemplate = useResourceChordStore((s) => s.applyTemplate)
  const [listeningId, setListeningId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const listening = chords.find((chord) => chord.id === listeningId) ?? null

  useEffect(() => {
    if (!listening) return
    const length = listening.keys.length === 3 ? 3 : 2

    function onKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        setListeningId(null)
        setDraft([])
        setError(null)
        return
      }
      if (event.key === 'Backspace') {
        setDraft((current) => current.slice(0, -1))
        return
      }
      const key = event.key.length === 1 ? event.key.toLowerCase() : ''
      if (!/^[a-z0-9]$/.test(key) || event.metaKey || event.ctrlKey || event.altKey) {
        setError(t('settings.keyboard.chords.recordError'))
        return
      }
      setDraft((current) => {
        const next = normalizeChordKeys([...current, key]).slice(0, length)
        if (next.length === length) {
          const clash = chords.some(
            (other) =>
              other.id !== listening.id &&
              (chordKeysEqual(other.keys, next) ||
                chordIsPrefix(other.keys, next) ||
                chordIsPrefix(next, other.keys))
          )
          if (clash) {
            setError(t('settings.keyboard.chords.conflict'))
            return []
          }
          upsert({ ...listening, keys: next })
          setListeningId(null)
          setError(null)
          return []
        }
        setError(null)
        return next
      })
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [chords, listening, t, upsert])

  function startListening(id: string, length: 2 | 3): void {
    const chord = chords.find((item) => item.id === id)
    if (!chord) return
    const keys = chord.keys.length === length ? chord.keys : []
    upsert({ ...chord, keys })
    setError(null)
    setDraft([])
    setListeningId(id)
  }

  return (
    <SettingsSection
      title={t('settings.keyboard.chords.title')}
      description={t('settings.keyboard.chords.hint')}
      actions={
        <>
          <Button size="small" icon={<Icon icon={Wand2} variant="detail" />} onClick={applyTemplate}>
            {t('settings.keyboard.chords.generate')}
          </Button>
          <Button
            size="small"
            icon={<Icon icon={Plus} variant="detail" />}
            onClick={() => upsert(newResourceChord())}
          >
            {t('settings.keyboard.chords.add')}
          </Button>
        </>
      }
    >
      {error ? <p className="ml-settings-inline-hint ml-settings-inline-hint--danger">{error}</p> : null}
      {chords.length === 0 ? (
        <p className="ml-settings-inline-hint">{t('settings.keyboard.chords.empty')}</p>
      ) : (
        <div className="ml-shortcut-list">
          {chords.map((chord) => {
            const isListening = listeningId === chord.id
            const length: 2 | 3 = chord.keys.length === 3 ? 3 : 2
            const shown = isListening ? draft : chord.keys
            return (
              <div key={chord.id} className={`ml-shortcut-row ml-chord-row${isListening ? ' is-listening' : ''}`}>
                <Select
                  className="ml-chord-kind"
                  value={chord.kind}
                  showSearch
                  options={RESOURCE_KINDS.map((kind) => ({
                    value: kind,
                    label: t(`resourceNav.kinds.${kind}`)
                  }))}
                  onChange={(kind: ResourceKind) => upsert({ ...chord, kind })}
                />
                <div className="ml-chord-length" role="group" aria-label={t('settings.keyboard.chords.length')}>
                  {([2, 3] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`ml-chord-length__btn${length === size ? ' is-active' : ''}`}
                      onClick={() => startListening(chord.id, size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`ml-shortcut-key ml-chord-keys${isListening ? ' is-listening' : ''}`}
                  onClick={() => (isListening ? setListeningId(null) : startListening(chord.id, length))}
                >
                  {isListening && shown.length === 0 ? (
                    <span className="ml-shortcut-key__listening">{t('settings.keyboard.chords.press', { count: length })}</span>
                  ) : (
                    Array.from({ length }, (_, index) => (
                      <kbd key={index} className={`ml-shortcut-kbd${shown[index] ? '' : ' is-empty'}`}>
                        {shown[index] ? shown[index].toUpperCase() : '·'}
                      </kbd>
                    ))
                  )}
                </button>
                <button
                  type="button"
                  className="ml-chord-remove"
                  aria-label={t('settings.keyboard.chords.remove')}
                  onClick={() => remove(chord.id)}
                >
                  <Icon icon={Trash2} variant="micro" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </SettingsSection>
  )
}
