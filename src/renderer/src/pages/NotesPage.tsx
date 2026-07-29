import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Segmented, Select, Tooltip, message } from 'antd'
import { Bell, Plus, Search, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NoteScope } from '@shared/types/notes'
import { HubPageHero } from '../components/Layout/HubPageHero'
import { NotesPanel } from '../components/Notes/NotesPanel'
import { Icon } from '../components/ui/Icon'
import { useNotesStore } from '../stores/notesStore'
import { useClusterStore } from '../stores/clusterStore'
import { useClusterGroupsStore } from '../stores/clusterGroupsStore'

type FilterScope = 'all' | NoteScope

export function NotesPage(): React.JSX.Element {
  const { t } = useTranslation()
  const notes = useNotesStore((s) => s.notes)
  const hydrate = useNotesStore((s) => s.hydrate)
  const openCreate = useNotesStore((s) => s.openCreate)
  const testNotification = useNotesStore((s) => s.testNotification)
  const clusters = useClusterStore((s) => s.clusters)
  const workspaces = useClusterGroupsStore((s) => s.groups)
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<FilterScope>('all')
  const [clusterId, setClusterId] = useState<string | undefined>()
  const [workspaceId, setWorkspaceId] = useState<string | undefined>()
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return notes.filter((n) => {
      if (scope !== 'all' && n.scope !== scope) return false
      if (clusterId && n.clusterId !== clusterId) return false
      if (workspaceId && n.workspaceId !== workspaceId) return false
      if (!query) return true
      const hay = `${n.title}\n${n.body}\n${n.resourceName ?? ''}\n${n.resourceKind ?? ''}`.toLowerCase()
      return hay.includes(query)
    })
  }, [notes, q, scope, clusterId, workspaceId])

  const stats = useMemo(() => {
    const pinned = notes.filter((n) => n.pinned).length
    const upcoming = notes.filter((n) => n.remindAt && !n.reminderFiredAt).length
    return { total: notes.length, pinned, upcoming }
  }, [notes])

  async function handleTest(): Promise<void> {
    setTesting(true)
    try {
      const result = await testNotification()
      if (result.osOk) message.success(t('notes.testSentOs'))
      else message.warning(result.osError || t('notes.testSentInAppOnly'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="ml-sparks-page">
      <div className="ml-hub-glow" aria-hidden />

      <HubPageHero
        icon={Sparkles}
        eyebrow={t('notes.brandEyebrow')}
        title={t('notes.hubTitle')}
        subtitle={t('notes.hubSubtitle')}
        actions={
          <>
            <Tooltip title={t('notes.testNotification')}>
              <Button
                className="ml-sparks-btn-ghost"
                icon={<Icon icon={Bell} variant="action" />}
                loading={testing}
                onClick={() => void handleTest()}
              >
                {t('notes.testNotification')}
              </Button>
            </Tooltip>
            <Button
              type="primary"
              className="ml-sparks-btn-primary"
              icon={<Icon icon={Plus} variant="action" />}
              onClick={() => openCreate()}
            >
              {t('notes.add')}
            </Button>
          </>
        }
      />

      <div className="ml-sparks-stats">
        <div className="ml-sparks-stat">
          <span className="ml-sparks-stat__value">{stats.total}</span>
          <span className="ml-sparks-stat__label">{t('notes.stats.total')}</span>
        </div>
        <div className="ml-sparks-stat">
          <span className="ml-sparks-stat__value">{stats.pinned}</span>
          <span className="ml-sparks-stat__label">{t('notes.stats.pinned')}</span>
        </div>
        <div className="ml-sparks-stat">
          <span className="ml-sparks-stat__value">{stats.upcoming}</span>
          <span className="ml-sparks-stat__label">{t('notes.stats.upcoming')}</span>
        </div>
      </div>

      <div className="ml-sparks-toolbar">
        <Input
          allowClear
          className="ml-sparks-search"
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder={t('notes.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Segmented
          className="ml-sparks-scopes"
          value={scope}
          onChange={(v) => setScope(v as FilterScope)}
          options={[
            { value: 'all', label: t('notes.filter.all') },
            { value: 'global', label: t('notes.scope.global') },
            { value: 'workspace', label: t('notes.scope.workspace') },
            { value: 'cluster', label: t('notes.scope.cluster') },
            { value: 'resource', label: t('notes.scope.resource') }
          ]}
        />
        <Select
          allowClear
          className="ml-sparks-select"
          placeholder={t('notes.fields.clusterPlaceholder')}
          value={clusterId}
          onChange={(v) => setClusterId(v)}
          options={clusters.map((c) => ({
            value: c.id,
            label: c.customName || c.contextName
          }))}
        />
        <Select
          allowClear
          className="ml-sparks-select"
          placeholder={t('notes.fields.workspacePlaceholder')}
          value={workspaceId}
          onChange={(v) => setWorkspaceId(v)}
          options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
        />
      </div>

      <div className="ml-sparks-page__body">
        <NotesPanel notes={filtered} emptyText={t('notes.emptyFiltered')} />
      </div>
    </div>
  )
}
