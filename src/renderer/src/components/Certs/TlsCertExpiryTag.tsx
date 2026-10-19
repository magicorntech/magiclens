import { useTranslation } from 'react-i18next'
import type { TlsCertInfo } from '@shared/types/tlsCerts'
import { StatusTag } from '../ResourceTable/StatusTag'

const STATUS_COLOR: Record<TlsCertInfo['status'], string> = {
  expired: 'red',
  expiring: 'gold',
  ok: 'green',
  invalid: 'default'
}

export function TlsCertExpiryTag({ cert }: { cert: TlsCertInfo }): React.JSX.Element {
  const { t } = useTranslation()
  if (cert.status === 'invalid' || cert.daysRemaining == null) {
    return <StatusTag text={t('certs.invalid')} color={STATUS_COLOR.invalid} />
  }
  const label =
    cert.daysRemaining < 0
      ? t('certs.expiredDays', { count: Math.abs(cert.daysRemaining) })
      : t('certs.daysLeft', { count: cert.daysRemaining })
  return <StatusTag text={label} color={STATUS_COLOR[cert.status]} />
}
