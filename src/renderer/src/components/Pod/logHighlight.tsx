export function highlightLogLine(line: string, query: string): React.JSX.Element {
  const q = query.trim()
  if (!q) return <>{line || '\u00A0'}</>
  const lower = line.toLowerCase()
  const needle = q.toLowerCase()
  const parts: React.ReactNode[] = []
  let from = 0
  let key = 0
  while (from < line.length) {
    const idx = lower.indexOf(needle, from)
    if (idx < 0) {
      parts.push(line.slice(from))
      break
    }
    if (idx > from) parts.push(line.slice(from, idx))
    parts.push(
      <mark key={key} className="ml-log-highlight">
        {line.slice(idx, idx + needle.length)}
      </mark>
    )
    key += 1
    from = idx + needle.length
  }
  return <>{parts.length > 0 ? parts : '\u00A0'}</>
}
