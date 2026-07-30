import { useTranslation } from 'react-i18next'
import type { ResourceNote } from '@shared/types/notes'
import { getBacklinks, getOutboundLinks } from './wikiLinks'

interface SparksLinksPanelProps {
  note: ResourceNote
  notes: ResourceNote[]
  onOpenNote: (id: string) => void
  onCreateMissing: (title: string) => void
}

export function SparksLinksPanel({
  note,
  notes,
  onOpenNote,
  onCreateMissing
}: SparksLinksPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const backlinks = getBacklinks(note, notes)
  const outbound = getOutboundLinks(note, notes)

  return (
    <aside className="ml-sparks-links">
      <section>
        <h3>{t('notes.links.outbound')}</h3>
        {outbound.length === 0 ? (
          <p className="ml-sparks-links__empty">{t('notes.links.noOutbound')}</p>
        ) : (
          <ul>
            {outbound.map((link, i) => (
              <li key={`${link.target}-${i}`}>
                {link.note ? (
                  <button type="button" onClick={() => onOpenNote(link.note!.id)}>
                    [[{link.alias || link.note.title}]]
                  </button>
                ) : (
                  <button
                    type="button"
                    className="is-missing"
                    onClick={() => onCreateMissing(link.target)}
                  >
                    [[{link.target}]] · {t('notes.links.create')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3>{t('notes.links.backlinks')}</h3>
        {backlinks.length === 0 ? (
          <p className="ml-sparks-links__empty">{t('notes.links.noBacklinks')}</p>
        ) : (
          <ul>
            {backlinks.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => onOpenNote(n.id)}>
                  {n.title}
                </button>
                <span>{n.path}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
