import { useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, Modal, Select, Switch, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { Bell, Pin, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CreateNoteRequest, NoteScope, ResourceNote } from '@shared/types/notes'
import { useClusterStore } from '../../stores/clusterStore'
import { useClusterGroupsStore } from '../../stores/clusterGroupsStore'
import { useNotesStore } from '../../stores/notesStore'
import { Icon } from '../ui/Icon'

const SCOPES: NoteScope[] = ['global', 'workspace', 'cluster', 'resource']

export function NoteEditorModal(): React.JSX.Element {
  const { t } = useTranslation()
  const open = useNotesStore((s) => s.editorOpen)
  const editing = useNotesStore((s) => s.editingNote)
  const defaults = useNotesStore((s) => s.draftDefaults)
  const closeEditor = useNotesStore((s) => s.closeEditor)
  const createNote = useNotesStore((s) => s.createNote)
  const updateNote = useNotesStore((s) => s.updateNote)
  const clusters = useClusterStore((s) => s.clusters)
  const workspaces = useClusterGroupsStore((s) => s.groups)
  const [form] = Form.useForm<{
    title: string
    body: string
    scope: NoteScope
    clusterId?: string
    workspaceId?: string
    resourceKind?: string
    namespace?: string
    resourceName?: string
    remindAt?: Dayjs | null
    pinned: boolean
  }>()
  const [saving, setSaving] = useState(false)
  const scope = Form.useWatch('scope', form) ?? 'global'

  const seed = useMemo((): CreateNoteRequest | ResourceNote | null => editing ?? defaults, [editing, defaults])

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      title: seed?.title ?? '',
      body: seed && 'body' in seed ? seed.body : '',
      scope: seed?.scope ?? (seed?.resourceName ? 'resource' : seed?.clusterId ? 'cluster' : 'global'),
      clusterId: seed?.clusterId,
      workspaceId: seed?.workspaceId,
      resourceKind: seed?.resourceKind,
      namespace: seed?.namespace,
      resourceName: seed?.resourceName,
      remindAt: seed?.remindAt ? dayjs(seed.remindAt) : null,
      pinned: Boolean(seed && 'pinned' in seed ? seed.pinned : false)
    })
  }, [open, seed, form])

  async function handleOk(): Promise<void> {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const remindAt = values.remindAt?.isValid() ? values.remindAt.toISOString() : null
      if (remindAt && Date.parse(remindAt) <= Date.now() + 15_000) {
        message.error(t('notes.fields.remindAtFuture'))
        setSaving(false)
        return
      }
      const payload: CreateNoteRequest = {
        title: values.title.trim(),
        body: values.body ?? '',
        scope: values.scope,
        clusterId: values.clusterId,
        workspaceId: values.workspaceId,
        resourceKind: values.resourceKind?.trim() || undefined,
        namespace: values.namespace?.trim() || undefined,
        resourceName: values.resourceName?.trim() || undefined,
        remindAt,
        pinned: values.pinned
      }
      if (editing) {
        await updateNote(editing.id, payload)
        message.success(
          remindAt
            ? t('notes.scheduled', { time: values.remindAt!.format('MMM D, HH:mm') })
            : t('notes.updated')
        )
      } else {
        await createNote(payload)
        message.success(
          remindAt
            ? t('notes.scheduled', { time: values.remindAt!.format('MMM D, HH:mm') })
            : t('notes.created')
        )
      }
      closeEditor()
    } catch {
      // validation
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={closeEditor}
      footer={null}
      destroyOnHidden
      width={640}
      className="ml-sparks-editor-modal"
      styles={{ body: { padding: 0 } }}
    >
      <div className="ml-sparks-editor">
        <header className="ml-sparks-editor__header">
          <div className="ml-sparks-editor__brand">
            <span className="ml-sparks-editor__mark">
              <Icon icon={Sparkles} size={18} />
            </span>
            <div>
              <p className="ml-sparks-editor__eyebrow">{t('notes.brandEyebrow')}</p>
              <h2 className="ml-sparks-editor__heading">
                {editing ? t('notes.editTitle') : t('notes.createTitle')}
              </h2>
            </div>
          </div>
        </header>

        <Form form={form} layout="vertical" requiredMark={false} className="ml-sparks-editor__form">
          <Form.Item
            name="title"
            className="ml-sparks-editor__title-item"
            rules={[{ required: true, message: t('notes.fields.titleRequired') }]}
          >
            <Input
              className="ml-sparks-editor__title-input"
              placeholder={t('notes.fields.titlePlaceholder')}
              autoFocus
              variant="borderless"
            />
          </Form.Item>

          <Form.Item name="body" className="ml-sparks-editor__body-item">
            <Input.TextArea
              className="ml-sparks-editor__body-input"
              rows={7}
              placeholder={t('notes.fields.bodyPlaceholder')}
              variant="borderless"
            />
          </Form.Item>

          <div className="ml-sparks-editor__section">
            <p className="ml-sparks-editor__section-label">{t('notes.fields.scope')}</p>
            <Form.Item name="scope" hidden>
              <Input />
            </Form.Item>
            <div className="ml-sparks-scope-pills" role="radiogroup" aria-label={t('notes.fields.scope')}>
              {SCOPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={scope === value}
                  className={`ml-sparks-scope-pill${scope === value ? ' ml-sparks-scope-pill--active' : ''}`}
                  onClick={() => form.setFieldValue('scope', value)}
                >
                  {t(`notes.scope.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-sparks-editor__meta">
            {scope === 'workspace' ? (
              <Form.Item name="workspaceId" label={t('notes.fields.workspace')}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
                  placeholder={t('notes.fields.workspacePlaceholder')}
                />
              </Form.Item>
            ) : null}

            {scope === 'cluster' || scope === 'resource' ? (
              <Form.Item name="clusterId" label={t('notes.fields.cluster')}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={clusters.map((c) => ({
                    value: c.id,
                    label: c.customName || c.contextName
                  }))}
                  placeholder={t('notes.fields.clusterPlaceholder')}
                />
              </Form.Item>
            ) : null}

            {scope === 'resource' ? (
              <div className="ml-sparks-editor__resource-row">
                <Form.Item name="resourceKind" label={t('notes.fields.kind')}>
                  <Input placeholder="Pods" />
                </Form.Item>
                <Form.Item name="namespace" label={t('notes.fields.namespace')}>
                  <Input placeholder="default" />
                </Form.Item>
                <Form.Item name="resourceName" label={t('notes.fields.resourceName')}>
                  <Input />
                </Form.Item>
              </div>
            ) : null}

            <div className="ml-sparks-editor__remind-row">
              <Form.Item
                name="remindAt"
                label={
                  <span className="ml-sparks-editor__field-label">
                    <Icon icon={Bell} variant="micro" />
                    {t('notes.fields.remindAt')}
                  </span>
                }
                style={{ flex: 1, marginBottom: 0 }}
                rules={[
                  {
                    validator: async (_, value: Dayjs | null | undefined) => {
                      if (!value?.isValid()) return
                      if (value.valueOf() <= Date.now() + 15_000) {
                        throw new Error(t('notes.fields.remindAtFuture'))
                      }
                    }
                  }
                ]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder={t('notes.fields.remindAtPlaceholder')}
                  disabledDate={(current) =>
                    Boolean(current && current.isBefore(dayjs().startOf('day')))
                  }
                  disabledTime={(current) => {
                    if (!current || !current.isSame(dayjs(), 'day')) return {}
                    const now = dayjs()
                    const disableHours = (): number[] =>
                      Array.from({ length: now.hour() }, (_, i) => i)
                    const disableMinutes = (hour: number): number[] => {
                      if (hour !== now.hour()) return []
                      return Array.from({ length: now.minute() + 1 }, (_, i) => i)
                    }
                    return {
                      disabledHours: disableHours,
                      disabledMinutes: disableMinutes
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="pinned"
                label={
                  <span className="ml-sparks-editor__field-label">
                    <Icon icon={Pin} variant="micro" />
                    {t('notes.fields.pinned')}
                  </span>
                }
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Form>

        <footer className="ml-sparks-editor__footer">
          <Button onClick={closeEditor}>{t('common.cancel')}</Button>
          <Button type="primary" loading={saving} onClick={() => void handleOk()}>
            {editing ? t('notes.save') : t('notes.create')}
          </Button>
        </footer>
      </div>
    </Modal>
  )
}
