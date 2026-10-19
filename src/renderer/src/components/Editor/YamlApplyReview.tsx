import { DiffEditor } from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'

interface YamlApplyReviewProps {
  original: string
  modified: string
  unchanged: boolean
  dryRunOk: boolean
  dryRunMessage: string
  saving: boolean
  onBack: () => void
  onApply: () => void
}

export function YamlApplyReview({
  original,
  modified,
  unchanged,
  dryRunOk,
  dryRunMessage,
  saving,
  onBack,
  onApply
}: YamlApplyReviewProps): React.JSX.Element {
  const { t } = useTranslation()
  const isDark = useResolvedDarkMode()
  const canApply = dryRunOk && !unchanged && !saving

  return (
    <div className="ml-yaml-review">
      <div className={`ml-yaml-review__banner${dryRunOk && !unchanged ? ' is-ok' : ' is-bad'}`}>
        <strong>{unchanged ? t('yamlEditor.unchanged') : dryRunOk ? t('yamlEditor.dryRunOk') : t('yamlEditor.dryRunFail')}</strong>
        <span>{dryRunMessage}</span>
      </div>
      <div className="ml-yaml-review__diff">
        <DiffEditor
          language="yaml"
          theme={isDark ? 'vs-dark' : 'vs'}
          original={original}
          modified={modified}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            renderSideBySide: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>
      <div className="ml-yaml-review__actions">
        <button type="button" className="ml-btn ml-btn--ghost" onClick={onBack} disabled={saving}>
          {t('yamlEditor.back')}
        </button>
        <button type="button" className="ml-btn ml-btn--ghost" onClick={onApply} disabled={!canApply}>
          {saving ? t('yamlEditor.applying') : t('yamlEditor.confirm')}
        </button>
      </div>
    </div>
  )
}
