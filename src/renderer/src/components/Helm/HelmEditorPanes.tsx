import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useResizableDrawerWidth } from '../../hooks/useResizableDrawerWidth'

interface HelmEditorPanesProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export function HelmEditorPanes({ left, center, right }: HelmEditorPanesProps): React.JSX.Element {
  const { t } = useTranslation()
  const leftPane = useResizableDrawerWidth({
    storageKey: 'ml.helm.leftWidth',
    defaultWidth: 300,
    minWidth: 220,
    maxWidth: 520,
    maxRatio: 0.36,
    edge: 'left'
  })
  const rightPane = useResizableDrawerWidth({
    storageKey: 'ml.helm.rightWidth',
    defaultWidth: 360,
    minWidth: 280,
    maxWidth: 620,
    maxRatio: 0.42,
    edge: 'right'
  })
  const resizing = leftPane.resizing || rightPane.resizing

  return (
    <div
      className={`ml-helm-editor__grid${resizing ? ' is-resizing' : ''}`}
      style={{
        gridTemplateColumns: `${leftPane.width}px minmax(220px, 1fr) ${rightPane.width}px`
      }}
    >
      <div className="ml-helm-editor__list">
        {left}
        <button
          type="button"
          className="ml-helm-editor__resize ml-helm-editor__resize--left"
          aria-label={t('helmEditor.resizeList')}
          title={t('helmEditor.resizeList')}
          {...leftPane.handleProps}
        />
      </div>
      {center}
      <div className="ml-helm-editor__install">
        <button
          type="button"
          className="ml-helm-editor__resize ml-helm-editor__resize--right"
          aria-label={t('helmEditor.resizeInstall')}
          title={t('helmEditor.resizeInstall')}
          {...rightPane.handleProps}
        />
        {right}
      </div>
    </div>
  )
}
