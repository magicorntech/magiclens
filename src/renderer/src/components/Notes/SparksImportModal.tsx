import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Checkbox, Modal } from 'antd'
import { CheckCircle2, CircleAlert, FileText, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { VaultImportCandidate, VaultImportScanResult } from '@shared/types/notes'
import { Icon } from '../ui/Icon'
import { useNotesStore } from '../../stores/notesStore'

type ItemStatus = 'idle' | 'pending' | 'ok' | 'fail'

interface ImportRow {
  candidate: VaultImportCandidate
  status: ItemStatus
  error?: string
}

type Phase = 'select' | 'importing' | 'done'

export function SparksImportModal({
  open,
  scan,
  onClose,
  onRescan
}: {
  open: boolean
  scan: VaultImportScanResult | null
  onClose: () => void
  onRescan: () => Promise<VaultImportScanResult | null>
}): React.JSX.Element {
  const { t } = useTranslation()
  const importFile = useNotesStore((s) => s.importFile)
  const hydrate = useNotesStore((s) => s.hydrate)

  const [phase, setPhase] = useState<Phase>('select')
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rescanning, setRescanning] = useState(false)
  const [addArmed, setAddArmed] = useState(false)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allSelected = rows.length > 0 && selected.size === rows.length
  const someSelected = selected.size > 0 && selected.size < rows.length
  const completed = useMemo(() => rows.filter((r) => r.status === 'ok'), [rows])
  const failed = useMemo(() => rows.filter((r) => r.status === 'fail'), [rows])

  function clearArmTimer(): void {
    if (armTimer.current) {
      clearTimeout(armTimer.current)
      armTimer.current = null
    }
  }

  function applyScan(next: VaultImportScanResult): void {
    const files = next.files ?? []
    setSourcePath(next.sourcePath ?? null)
    setRows(files.map((candidate) => ({ candidate, status: 'idle' as const })))
    setSelected(new Set())
    setPhase('select')
    clearArmTimer()
    setAddArmed(false)
    armTimer.current = setTimeout(() => {
      setAddArmed(true)
      armTimer.current = null
    }, 450)
  }

  useEffect(() => {
    if (!open || !scan?.ok) return
    applyScan(scan)
    return () => clearArmTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate from latest successful scan prop
  }, [open, scan?.sourcePath])

  function handleClose(): void {
    clearArmTimer()
    setPhase('select')
    setSourcePath(null)
    setRows([])
    setSelected(new Set())
    setAddArmed(false)
    setRescanning(false)
    onClose()
  }

  async function changeFolder(): Promise<void> {
    setRescanning(true)
    setAddArmed(false)
    try {
      const next = await onRescan()
      if (!next?.ok) return
      applyScan(next)
    } finally {
      setRescanning(false)
    }
  }

  function toggleAll(checked: boolean): void {
    if (checked) setSelected(new Set(rows.map((r) => r.candidate.relativePath)))
    else setSelected(new Set())
  }

  function toggleOne(path: string, checked: boolean): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(path)
      else next.delete(path)
      return next
    })
  }

  async function runImport(): Promise<void> {
    if (!sourcePath || selected.size === 0 || !addArmed || phase !== 'select') return
    setPhase('importing')
    setAddArmed(false)

    const results: ImportRow[] = rows.map((r) =>
      selected.has(r.candidate.relativePath)
        ? { ...r, status: 'pending' as const, error: undefined }
        : r
    )
    setRows([...results])

    for (let i = 0; i < results.length; i++) {
      const row = results[i]
      if (!selected.has(row.candidate.relativePath)) continue
      const res = await importFile({
        sourceRoot: sourcePath,
        relativePath: row.candidate.relativePath
      })
      results[i] = res.ok
        ? { ...row, status: 'ok' }
        : { ...row, status: 'fail', error: res.error ?? 'import_failed' }
      setRows([...results])
    }

    await hydrate()
    setPhase('done')
  }

  const canAdd = Boolean(sourcePath) && selected.size > 0 && addArmed && phase === 'select'

  const footer =
    phase === 'done' ? (
      <Button type="primary" onClick={handleClose}>
        {t('common.close')}
      </Button>
    ) : phase === 'importing' ? null : (
      <div className="ml-vault-import__footer">
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button onClick={() => void changeFolder()} loading={rescanning} disabled={rescanning}>
          {t('notes.import.changeFolder')}
        </Button>
        <Button type="primary" disabled={!canAdd} onClick={() => void runImport()}>
          {t('notes.import.addSelected', { count: selected.size })}
        </Button>
      </div>
    )

  return (
    <Modal
      open={open}
      title={t('notes.import.title')}
      onCancel={phase === 'importing' ? undefined : handleClose}
      closable={phase !== 'importing'}
      maskClosable={false}
      footer={footer}
      width={560}
      destroyOnClose
      className="ml-vault-import-modal"
    >
      {sourcePath && phase !== 'done' ? (
        <>
          <div className="ml-vault-import__source" title={sourcePath}>
            {t('notes.import.from', { path: sourcePath })}
          </div>
          {rows.length === 0 ? (
            <p className="ml-vault-import__none">{t('notes.import.noneFound')}</p>
          ) : (
            <>
              {phase === 'select' ? (
                <div className="ml-vault-import__toolbar">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                  >
                    {t('notes.import.selectAll', { count: rows.length })}
                  </Checkbox>
                  <span className="ml-vault-import__pick-hint">{t('notes.import.pickHint')}</span>
                </div>
              ) : null}
              <ul className="ml-vault-import__list">
                {rows.map((row) => {
                  const path = row.candidate.relativePath
                  const isSelected = selected.has(path)
                  const showRow = phase === 'select' || isSelected || row.status !== 'idle'
                  if (!showRow) return null
                  return (
                    <li
                      key={path}
                      className={`ml-vault-import__item${isSelected && phase === 'select' ? ' is-checked' : ''}${row.status === 'ok' ? ' is-ok' : ''}${row.status === 'fail' ? ' is-fail' : ''}`}
                      onClick={phase === 'select' ? () => toggleOne(path, !isSelected) : undefined}
                    >
                      {phase === 'select' ? (
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => toggleOne(path, e.target.checked)}
                        />
                      ) : (
                        <span className="ml-vault-import__status" aria-hidden>
                          {row.status === 'pending' ? (
                            <Icon icon={Loader2} variant="micro" className="ml-vault-import__spin" />
                          ) : row.status === 'ok' ? (
                            <Icon icon={CheckCircle2} variant="micro" />
                          ) : row.status === 'fail' ? (
                            <Icon icon={CircleAlert} variant="micro" />
                          ) : (
                            <Icon icon={FileText} variant="micro" />
                          )}
                        </span>
                      )}
                      <span className="ml-vault-import__meta">
                        <span className="ml-vault-import__title">{row.candidate.title}</span>
                        <span className="ml-vault-import__path">{path}</span>
                        {row.status === 'fail' && row.error ? (
                          <span className="ml-vault-import__error">
                            {t(`notes.import.errors.${row.error}`, {
                              defaultValue: row.error
                            })}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </>
      ) : null}

      {phase === 'done' ? (
        <div className="ml-vault-import__done">
          <div className="ml-vault-import__done-hero">
            <Icon icon={CheckCircle2} size={36} />
            <h3>{t('notes.import.completed')}</h3>
            <p>
              {t('notes.import.summary', {
                ok: completed.length,
                fail: failed.length
              })}
            </p>
          </div>
          {completed.length > 0 ? (
            <div className="ml-vault-import__section">
              <h4>{t('notes.import.completedList')}</h4>
              <ul>
                {completed.map((r) => (
                  <li key={r.candidate.relativePath}>
                    <Icon icon={CheckCircle2} variant="micro" />
                    <span>{r.candidate.title}</span>
                    <span className="ml-vault-import__path">{r.candidate.relativePath}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {failed.length > 0 ? (
            <div className="ml-vault-import__section ml-vault-import__section--fail">
              <h4>{t('notes.import.failedList')}</h4>
              <ul>
                {failed.map((r) => (
                  <li key={r.candidate.relativePath}>
                    <Icon icon={CircleAlert} variant="micro" />
                    <span>{r.candidate.title}</span>
                    <span className="ml-vault-import__path">{r.candidate.relativePath}</span>
                    {r.error ? (
                      <span className="ml-vault-import__error">
                        {t(`notes.import.errors.${r.error}`, { defaultValue: r.error })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
