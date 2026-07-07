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

export function IngressHostsCell({ hosts, tlsHosts }: IngressHostsCellProps): React.JSX.Element {
  if (!hosts || hosts === '-') return <>-</>

  const tlsSet = new Set(
    (tlsHosts ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
  )
  const hostList = hosts.split(',').map((h) => h.trim()).filter(Boolean)

  return (
    <span onClick={(e) => e.stopPropagation()}>
      {hostList.map((host, i) => (
        <span key={host}>
          {i > 0 && ', '}
          <a
            href={ingressUrl(host, tlsSet)}
            onClick={(e) => {
              e.preventDefault()
              window.open(ingressUrl(host, tlsSet), '_blank')
            }}
          >
            {host}
          </a>
        </span>
      ))}
    </span>
  )
}
