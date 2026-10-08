import type { MollyChatThread } from '../stores/mollyStore'

export function sanitizeMollyExportFileName(title: string): string {
  const base = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return (base || 'molly-chat').slice(0, 80)
}

export function formatMollyChatMarkdown(chat: MollyChatThread): string {
  const header = [
    `# ${chat.title}`,
    '',
    `- Exported: ${new Date().toISOString()}`,
    `- Created: ${new Date(chat.createdAt).toISOString()}`,
    `- Updated: ${new Date(chat.updatedAt).toISOString()}`,
    `- Messages: ${chat.lines.length}`,
    '',
    '---',
    ''
  ]
  const body = chat.lines.map((line) => {
    const who =
      line.role === 'user' ? 'You' : line.role === 'assistant' ? 'Molly' : 'System'
    const tools =
      line.tools && line.tools.length > 0
        ? [
            '',
            ...line.tools.map(
              (tool) => `- \`${tool.name}\` (${tool.ok ? 'ok' : 'error'}): ${tool.summary}`
            )
          ]
        : []
    return [`### ${who}`, '', line.text, ...tools, ''].join('\n')
  })
  return [...header, ...body].join('\n').trimEnd() + '\n'
}

export function formatMollyChatJson(chat: MollyChatThread): string {
  return `${JSON.stringify(
    {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      exportedAt: Date.now(),
      lines: chat.lines.map((line) => ({
        id: line.id,
        role: line.role,
        text: line.text,
        at: line.at,
        tools: line.tools?.map((tool) => ({
          name: tool.name,
          ok: tool.ok,
          summary: tool.summary
        }))
      }))
    },
    null,
    2
  )}\n`
}
