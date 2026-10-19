import { X509Certificate } from 'node:crypto'
import type { V1Secret } from '@kubernetes/client-node'
import { tlsCertStatus, type TlsCertInfo } from '@shared/types/tlsCerts'
import type { ClusterClients } from './clusterManager'

function decodeB64(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return Buffer.from(value, 'base64').toString('utf8')
    } catch {
      return null
    }
  }
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  return null
}

function isTlsSecret(secret: V1Secret): boolean {
  if (secret.type === 'kubernetes.io/tls') return true
  return Boolean(secret.data?.['tls.crt'])
}

function firstPemBlock(pem: string): string {
  const match = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)
  return match?.[0] ?? pem
}

function cnFromSubject(subject: string): string {
  const match = subject.match(/(?:^|[\n,])\s*CN=([^,\n]+)/i)
  return match?.[1]?.trim() || subject
}

function hostsFromSan(san: string | undefined): string[] {
  if (!san) return []
  return san
    .split(/,\s*/)
    .map((part) => part.replace(/^(DNS:|IP Address:|URI:|email:)\s*/i, '').trim())
    .filter(Boolean)
}

function parseCertPem(pem: string): Pick<
  TlsCertInfo,
  'subject' | 'issuer' | 'hosts' | 'notBefore' | 'notAfter' | 'daysRemaining' | 'status'
> {
  try {
    const cert = new X509Certificate(firstPemBlock(pem))
    const notAfter = new Date(cert.validTo)
    const notBefore = new Date(cert.validFrom)
    const daysRemaining = Number.isFinite(notAfter.getTime())
      ? Math.floor((notAfter.getTime() - Date.now()) / 86_400_000)
      : null
    const subject = cnFromSubject(cert.subject)
    const hosts = hostsFromSan(cert.subjectAltName)
    if (subject && !hosts.includes(subject)) hosts.unshift(subject)
    return {
      subject,
      issuer: cnFromSubject(cert.issuer),
      hosts,
      notBefore: Number.isFinite(notBefore.getTime()) ? notBefore.toISOString() : null,
      notAfter: Number.isFinite(notAfter.getTime()) ? notAfter.toISOString() : null,
      daysRemaining,
      status: tlsCertStatus(daysRemaining)
    }
  } catch {
    return {
      subject: '',
      issuer: '',
      hosts: [],
      notBefore: null,
      notAfter: null,
      daysRemaining: null,
      status: 'invalid'
    }
  }
}

export async function listTlsCerts(clients: ClusterClients): Promise<{ items: TlsCertInfo[] }> {
  const secretsRes = await clients.core.listSecretForAllNamespaces()
  const items: TlsCertInfo[] = []
  const byKey = new Map<string, TlsCertInfo>()

  for (const secret of secretsRes.items) {
    if (!isTlsSecret(secret)) continue
    const namespace = secret.metadata?.namespace ?? ''
    const name = secret.metadata?.name ?? ''
    if (!namespace || !name) continue
    const pem = decodeB64(secret.data?.['tls.crt'])
    const parsed = pem
      ? parseCertPem(pem)
      : {
          subject: '',
          issuer: '',
          hosts: [] as string[],
          notBefore: null,
          notAfter: null,
          daysRemaining: null,
          status: 'invalid' as const
        }
    const info: TlsCertInfo = {
      namespace,
      name,
      ingressHosts: [],
      ...parsed
    }
    items.push(info)
    byKey.set(`${namespace}/${name}`, info)
  }

  try {
    const ingressRes = await clients.networking.listIngressForAllNamespaces()
    for (const ingress of ingressRes.items) {
      const namespace = ingress.metadata?.namespace ?? ''
      for (const tls of ingress.spec?.tls ?? []) {
        if (!tls.secretName || !namespace) continue
        const info = byKey.get(`${namespace}/${tls.secretName}`)
        if (!info) continue
        for (const host of tls.hosts ?? []) {
          if (host && !info.ingressHosts.includes(host)) info.ingressHosts.push(host)
        }
      }
    }
  } catch {
    // Ingress list is optional — TLS secrets still stand on their own.
  }

  items.sort((a, b) => {
    const da = a.daysRemaining ?? 99999
    const db = b.daysRemaining ?? 99999
    if (da !== db) return da - db
    return `${a.namespace}/${a.name}`.localeCompare(`${b.namespace}/${b.name}`)
  })

  return { items }
}
