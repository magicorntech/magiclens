import { createPortal } from 'react-dom'
import { message } from 'antd'
import { FileUp, ImagePlus, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { mediaDisplayUrl } from './sparksMedia'

interface SparksMediaPanelProps {
  noteId: string
  active: boolean
  onInsertMarkdown: (snippet: string) => void
}

export function SparksMediaPanel({
  noteId,
  active,
  onInsertMarkdown
}: SparksMediaPanelProps): React.JSX.Element | null {
  const { t } = useTranslation()
  if (!active) return null

  async function importMedia(kind: 'image' | 'video' | 'file'): Promise<void> {
    const res = await window.api?.notes?.mediaImport?.(noteId, kind)
    if (!res || res.canceled) return
    if (!res.ok || !res.path || !res.name) {
      message.error(res?.error || t('notes.sketch.mediaFailed'))
      return
    }
    const src = mediaDisplayUrl(res.path, res.src)
    if (kind === 'image' || res.media === 'image') {
      onInsertMarkdown(`\n![${res.name}](${src})\n`)
    } else if (kind === 'video' || res.media === 'video') {
      onInsertMarkdown(
        `\n<video controls src="${src}" style="max-width:100%;border-radius:8px"></video>\n\n[${res.name}](${src})\n`
      )
    } else {
      onInsertMarkdown(`\n📎 [${res.name}](${src})\n`)
    }
    message.success(t('notes.sketch.mediaAdded'))
  }

  const host = typeof document !== 'undefined' ? document.getElementById('ml-sparks-tooltabs-extra') : null
  const tabs = (
    <div className="ml-sparks-tooltabs ml-sparks-tooltabs--tools" role="toolbar" aria-label={t('notes.surface.media')}>
      <button type="button" className="ml-sparks-tooltabs__tab" onClick={() => void importMedia('image')}>
        <Icon icon={ImagePlus} variant="micro" />
        <span>{t('notes.sketch.image')}</span>
      </button>
      <button type="button" className="ml-sparks-tooltabs__tab" onClick={() => void importMedia('video')}>
        <Icon icon={Video} variant="micro" />
        <span>{t('notes.sketch.video')}</span>
      </button>
      <button type="button" className="ml-sparks-tooltabs__tab" onClick={() => void importMedia('file')}>
        <Icon icon={FileUp} variant="micro" />
        <span>{t('notes.sketch.file')}</span>
      </button>
    </div>
  )

  if (!host) return null
  return createPortal(tabs, host)
}
