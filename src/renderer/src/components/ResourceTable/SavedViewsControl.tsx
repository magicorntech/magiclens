import { useMemo, useState } from 'react'
import { Dropdown, Input, Modal } from 'antd'
import { Bookmark, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ALL_NAMESPACES, isNoNamespaceSelection } from '@shared/namespaceSelection'
import type { ResourceKind } from '@shared/resourceKinds'
import { useClusterStore } from '../../stores/clusterStore'
import {
  useSavedViewsStore,
  viewsMatchCurrent,
  type SavedResourceView
} from '../../stores/savedViewsStore'
import type { TableSortState } from '../../utils/tableSort'
import { Icon } from '../ui/Icon'

interface SavedViewsControlProps {
  clusterId: string
  kind: ResourceKind
  namespace: string
  search: string
  sort: TableSortState
  onApplyNamespace: (namespace: string) => void
  onApplySearch: (search: string) => void
  onApplySort: (sort: TableSortState) => void
}

function suggestedName(kind: ResourceKind, namespace: string, search: string): string {
  const trimmed = search.trim()
  if (trimmed) return `${kind} · ${trimmed}`
  if (namespace === ALL_NAMESPACES) return `${kind} · ALL`
  if (isNoNamespaceSelection(namespace)) return kind
  if (namespace.includes(',')) return `${kind} · ${namespace.split(',').length} ns`
  return `${kind} · ${namespace}`
}

export function SavedViewsControl({
  clusterId,
  kind,
  namespace,
  search,
  sort,
  onApplyNamespace,
  onApplySearch,
  onApplySort
}: SavedViewsControlProps): React.JSX.Element {
  const { t } = useTranslation()
  const views = useSavedViewsStore((s) => s.views)
  const saveView = useSavedViewsStore((s) => s.saveView)
  const updateView = useSavedViewsStore((s) => s.updateView)
  const removeView = useSavedViewsStore((s) => s.removeView)
  const touchView = useSavedViewsStore((s) => s.touchView)
  const setPendingApply = useSavedViewsStore((s) => s.setPendingApply)
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')

  const ordered = useMemo(
    () => [...views].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)),
    [views]
  )
  const active = ordered.find((view) => viewsMatchCurrent(view, kind, namespace, search, sort))

  function namespaceLabel(value: string): string {
    if (value === ALL_NAMESPACES) return t('common.allNamespaces')
    if (isNoNamespaceSelection(value)) return t('common.selectNamespaces')
    if (value.includes(',')) return t('common.namespacesSelected', { count: value.split(',').length })
    return value
  }

  function applyView(view: SavedResourceView): void {
    touchView(view.id)
    onApplyNamespace(view.namespace)
    if (view.kind === kind) {
      onApplySearch(view.search)
      onApplySort(view.sort ?? {})
      setMenuOpen(false)
      return
    }
    setPendingApply({
      clusterId,
      kind: view.kind,
      search: view.search,
      sort: view.sort ?? {}
    })
    openResourceKind(clusterId, view.kind)
    setMenuOpen(false)
  }

  function openSave(): void {
    setName(suggestedName(kind, namespace, search))
    setMenuOpen(false)
    setSaveOpen(true)
  }

  function handleSave(): void {
    const trimmed = name.trim()
    if (!trimmed) return
    saveView({ name: trimmed, kind, namespace, search, sort })
    setSaveOpen(false)
  }

  function updateActive(): void {
    if (!active) return
    updateView(active.id, { kind, namespace, search, sort, lastUsedAt: new Date().toISOString() })
    setMenuOpen(false)
  }

  const panel = (
    <div className="ml-saved-views-menu" onMouseDown={(e) => e.preventDefault()}>
      {ordered.length === 0 ? (
        <div className="ml-saved-views-menu__empty">{t('resourceViews.empty')}</div>
      ) : (
        <div className="ml-saved-views-menu__list">
          {ordered.map((view) => {
            const isActive = active?.id === view.id
            const kindLabel = t(`resourceNav.kinds.${view.kind}`, { defaultValue: view.kind })
            return (
              <div
                key={view.id}
                className={`ml-saved-view-item${isActive ? ' ml-saved-view-item--active' : ''}`}
              >
                <button type="button" className="ml-saved-view-item__body" onClick={() => applyView(view)}>
                  <span className="ml-saved-view-item__name">{view.name}</span>
                  <span className="ml-saved-view-item__meta">
                    {kindLabel}
                    {' · '}
                    {namespaceLabel(view.namespace)}
                    {view.search.trim() ? ` · ${view.search.trim()}` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  className="ml-saved-view-item__delete"
                  aria-label={t('resourceViews.delete')}
                  onClick={() => removeView(view.id)}
                >
                  <Icon icon={Trash2} variant="micro" />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <div className="ml-saved-views-menu__footer">
        <button type="button" className="ml-btn ml-btn--ghost ml-saved-views-menu__action" onClick={openSave}>
          {t('resourceViews.save')}
        </button>
        {active ? (
          <button type="button" className="ml-btn ml-btn--ghost ml-saved-views-menu__action" onClick={updateActive}>
            {t('resourceViews.update', { name: active.name })}
          </button>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <Dropdown
        trigger={['click']}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        menu={{ items: [{ key: 'panel', label: null }] }}
        popupRender={() => panel}
        placement="bottomRight"
        classNames={{ root: 'ml-saved-views-dropdown' }}
      >
        <button type="button" className="ml-btn ml-btn--ghost ml-action-control" aria-label={t('resourceViews.label')}>
          <Icon icon={Bookmark} variant="detail" />
          {t('resourceViews.label')}
        </button>
      </Dropdown>
      <Modal
        title={t('resourceViews.saveTitle')}
        open={saveOpen}
        onOk={handleSave}
        onCancel={() => setSaveOpen(false)}
        okText={t('resourceViews.saveConfirm')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Input
          autoFocus
          value={name}
          placeholder={t('resourceViews.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={handleSave}
        />
      </Modal>
    </>
  )
}
