import { useTranslation } from 'react-i18next'
import type { TlsCertInfo } from '@shared/types/tlsCerts'
import { DetailFactGrid, DetailSection } from '../Detail/detailPrimitives'
import { TlsCertExpiryTag } from './TlsCertExpiryTag'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TlsCertFacts({ cert }: { cert: TlsCertInfo }): React.JSX.Element {
  const { t } = useTranslation()
  const hosts = [...new Set([...cert.hosts, ...cert.ingressHosts])]
  return (
    <DetailSection title={t('certs.title')} extra={<TlsCertExpiryTag cert={cert} />}>
      <DetailFactGrid
        facts={[
          { label: t('certs.subject'), value: cert.subject || '—' },
          { label: t('certs.issuer'), value: cert.issuer || '—' },
          { label: t('certs.hosts'), value: hosts.length > 0 ? hosts.join(' · ') : '—' },
          { label: t('certs.notBefore'), value: formatDate(cert.notBefore) },
          { label: t('certs.notAfter'), value: formatDate(cert.notAfter) }
        ]}
      />
    </DetailSection>
  )
}
