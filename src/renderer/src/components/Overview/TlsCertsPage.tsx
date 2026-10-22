import { useMemo } from 'react'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { ResourceFocus } from '@shared/types/navigation'
import { tlsCertKey, type TlsCertInfo, type TlsCertStatus } from '@shared/types/tlsCerts'
import { useTlsCerts } from '../../queries/useTlsCerts'
import { compareOptionalNumber, compareText } from '../../utils/tableSort'
import { StatusTag } from '../ResourceTable/StatusTag'
import { OverviewPage } from './OverviewPage'

const STATUS_COLOR: Record<TlsCertStatus, string> = {
  expired: 'red',
  expiring: 'gold',
  ok: 'green',
  invalid: 'default'
}

interface TlsCertsPageProps {
  clusterId: string
  onNavigate: (focus: ResourceFocus) => void
}

export function TlsCertsPage({ clusterId, onNavigate }: TlsCertsPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const { items, error } = useTlsCerts(clusterId, true)

  const columns = useMemo<ColumnsType<TlsCertInfo>>(
    () => [
      {
        title: t('common.namespace'),
        dataIndex: 'namespace',
        key: 'namespace',
        sorter: (a, b) => compareText(a.namespace, b.namespace),
        ellipsis: true
      },
      {
        title: t('nodePods.name'),
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => compareText(a.name, b.name),
        ellipsis: true
      },
      {
        title: t('certs.subject'),
        dataIndex: 'subject',
        key: 'subject',
        sorter: (a, b) => compareText(a.subject, b.subject),
        ellipsis: true,
        render: (subject: string) => subject || '—'
      },
      {
        title: 'Days remaining',
        dataIndex: 'daysRemaining',
        key: 'daysRemaining',
        width: 150,
        defaultSortOrder: 'ascend',
        sorter: (a, b, order) => compareOptionalNumber(a.daysRemaining, b.daysRemaining, order),
        render: (days: number | null) => (days == null ? '—' : days)
      },
      {
        title: t('nodePods.status'),
        dataIndex: 'status',
        key: 'status',
        width: 120,
        sorter: (a, b) => compareText(a.status, b.status),
        render: (status: TlsCertStatus) => (
          <StatusTag text={status === 'invalid' ? t('certs.invalid') : status} color={STATUS_COLOR[status]} />
        )
      }
    ],
    [t]
  )

  return (
    <OverviewPage title={t('resourceNav.virtual.tlsCerts')} subtitle={error ?? undefined}>
      <Table<TlsCertInfo>
        className="ml-table ml-tls-certs"
        size="middle"
        rowKey={(row) => tlsCertKey(row.namespace, row.name)}
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 50, showSizeChanger: false }}
        onRow={(cert) => ({
          onClick: () =>
            onNavigate({
              kind: 'Secrets',
              namespace: cert.namespace,
              name: cert.name
            }),
          style: { cursor: 'pointer' }
        })}
      />
    </OverviewPage>
  )
}
