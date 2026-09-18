import { Tooltip } from 'antd'

function ingressUrl(host: string, tlsHosts: Set<string>): string {
  const trimmed = host.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  const scheme = tlsHosts.has(trimmed) ? 'https' : 'http'
  return `${scheme}://${trimmed}`
}

interface IngressHostsCellProps {
  hosts: string | undefined
  tlsHosts?: string
}

function HostLink({
  host,
  tlsSet
}: {
  host: string
  tlsSet: Set<string>
}): React.JSX.Element {
  const href = ingressUrl(host, tlsSet)
  return (
    <a
      className="ml-ingress-host"
      href={href}
      title={host}
      onClick={(e) => {
        e.preventDefault()
        window.open(href, '_blank')
      }}
    >
      {host}
    </a>
  )
}

export function IngressHostsCell({ hosts, tlsHosts }: IngressHostsCellProps): React.JSX.Element {
  if (!hosts || hosts === '-') return <>-</>

  const tlsSet = new Set(
    (tlsHosts ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
  )
  const hostList = hosts
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)

  if (hostList.length === 0) return <>-</>

  const [first, ...rest] = hostList
  const extra = (
    <div className="ml-ingress-hosts-tip">
      {hostList.map((host) => (
        <HostLink key={host} host={host} tlsSet={tlsSet} />
      ))}
    </div>
  )

  return (
    <span className="ml-ingress-hosts" onClick={(e) => e.stopPropagation()}>
      <Tooltip title={extra} placement="topLeft">
        <span className="ml-ingress-hosts__primary">
          <HostLink host={first} tlsSet={tlsSet} />
        </span>
      </Tooltip>
      {rest.length > 0 ? (
        <Tooltip title={extra} placement="topLeft">
          <span className="ml-ingress-host-more">+{rest.length}</span>
        </Tooltip>
      ) : null}
    </span>
  )
}
