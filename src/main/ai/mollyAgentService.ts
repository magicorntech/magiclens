import type { AiProviderConfig } from '@shared/types/aiAgent'
import type { AiChatTurn } from '@shared/types/aiChat'
import type {
  MollyNavigateTarget,
  MollyToolCall,
  MollyToolName,
  MollyToolResult,
  MollyTurnRequest,
  MollyTurnResponse,
  MollyStartupCheckRequest,
  MollyStartupCheckResponse
} from '@shared/types/molly'
import { completeAiChat } from './aiChatService'
import { generateGeminiContent } from './geminiClient'
import { MOLLY_TOOL_NAMES, runMollyTool, runStartupChecks } from './mollyToolRunner'

const MAX_TOOL_ROUNDS = 4

const TOOL_CATALOG = `
You are Molly, MagicLens' voice Kubernetes assistant. Be concise and practical.
Prefer short spoken answers (2–5 sentences). Put dense detail in bullets only when needed.
When the user speaks Turkish, reply in Turkish.
You may call read-only tools by emitting a single JSON object on its own line:
{"tool":"<name>","args":{...}}
Allowed tools:
- listClusters — args: {}
- getClusterHealth — args: { clusterId }
- getNodeMetrics — args: { clusterId }
- getPodMetrics — args: { clusterId, namespace, name? }
- getEvents — args: { clusterId, namespace?, since?, query? }. since is an ISO time or 30m/2h/1d. query matches reason or message.
- getPodLogs — args: { clusterId, namespace, podName, container?, tailLines?, since?, query? }. tailLines is 1–400 (use 30 when the user asks for 20–30 lines). since is an ISO time or 30m/2h/1d. query keeps only matching lines, such as "admin-ui" or "error". The chat shows the log text. Do not say you cannot limit lines or filter by time. Logs already rotated off the pod cannot be recovered.
- listResources — args: { clusterId, kind, namespace?, since? }. Kind can be any Kubernetes type the cluster advertises, including CRDs. The tool reads the live Discovery API when the kind is not built-in. namespace "ALL" lists every namespace. since is 2h, 30m, 1d, or an ISO time and keeps resources created in that window. Every row includes age and created. Use since "2h" and kind Pods when the user asks which pods were deployed in the last 2 hours. Do not say timestamps are missing. Do not say a kind is unsupported before calling this tool.
- inspectResource — args: { clusterId, kind, namespace, name }. Detail for one resource of any discovered kind: document, related events, pod logs and CPU when it is a Pod, plus recommendations. Omit name to list.
- getUsage — args: { clusterId, namespace?, podName?, nodeName? }. Disk fullness for PVCs, plus network receive/transmit and disk for a pod or node. Use this for network and disk questions.
- getSecurity — args: { clusterId }. Read the latest Security page scan: score, findings, and recommendations. Does not start a scan.
- startSecurityScan — args: { clusterId }. Start a new MagicLens security scan and return the new recommendations. Use only when the user asks to scan or rescan.
- summarizeAnomalies — args: { clusterId }
Rules:
- Never invent cluster IDs; use listClusters first if unsure.
- For any resource question, call listResources or inspectResource first. Do not refuse because a kind is unfamiliar. CRDs and operator types are looked up on the cluster.
- Speak CPU as mCPU or CPU and memory as Ki, Mi, or Gi. Use the cpu and memory text fields. Never read raw byte counts aloud.
- For network or disk usage, call getUsage. Then list the related resources if the user wants the objects too.
- Also call getNodeMetrics, getPodMetrics, getPodLogs, or getEvents when the user asks for graphs, metrics, or logs. Never say you have no function for a built-in kind.
- Always finish with 1–3 practical recommendations from the tool data. Recommendations are read-only advice, never a change you already applied.
- Speech-to-text mangles words: ingres/ingiliz/ingiltere means Ingresses. Pass kind Ingresses.
- The chat UI draws a table and a chart from listResources. Still write a short plain-language answer.
- NEVER navigate the MagicLens UI. Do not open resource tabs, cluster pages, Nodes, Pods, or any other view. If the user asks to open or go to a page, fetch the relevant data and answer only in this chat.
- Prefer summarizeAnomalies only when the user asks if anything is wrong.
- After tools return, answer the user in plain language (no JSON) unless you need another tool.
- READ-ONLY only: never delete, create, patch, apply, scale, restart, or mutate. Refuse delete requests politely.
- Do not claim you mutated the cluster — you have no write or delete permission.
- Do not volunteer startup scans or unsolicited findings — wait for the user.
`.trim()

function isToolName(v: string): v is MollyToolName {
  return (MOLLY_TOOL_NAMES as string[]).includes(v)
}

function extractToolCall(content: string): MollyToolCall | null {
  const trimmed = content.trim()
  // Prefer a fenced or bare JSON object that looks like a tool call.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fence?.[1] ?? trimmed).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1)) as {
      tool?: string
      name?: string
      args?: Record<string, unknown>
      arguments?: Record<string, unknown>
    }
    const name = obj.tool ?? obj.name
    if (!name || !isToolName(name)) return null
    return { name, args: obj.args ?? obj.arguments ?? {} }
  } catch {
    return null
  }
}

async function chatOnce(
  provider: AiProviderConfig,
  messages: AiChatTurn[],
  cliWorkdir?: string
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  // Gemini API key path: treat as Generative Language API when credential looks like a key.
  if (provider.id === 'gemini' && looksLikeGeminiApiKey(provider.credential)) {
    return chatGeminiApi(provider, messages)
  }
  const res = await completeAiChat({ provider, messages, cliWorkdir })
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, content: res.content }
}

function looksLikeGeminiApiKey(credential: string): boolean {
  const c = credential.trim()
  return c.startsWith('AIza') || (c.length > 20 && !c.includes('/') && !c.includes(' '))
}

async function chatGeminiApi(
  provider: AiProviderConfig,
  messages: AiChatTurn[]
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const result = await generateGeminiContent({
    apiKey: provider.credential,
    model: provider.model,
    messages
  })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, content: result.content }
}

export async function runMollyTurn(req: MollyTurnRequest): Promise<MollyTurnResponse> {
  const toolResults: MollyToolResult[] = []
  let navigate: MollyNavigateTarget | undefined
  const system = [
    TOOL_CATALOG,
    req.activeClusterId ? `Active clusterId hint: ${req.activeClusterId}` : '',
    req.contextHint
      ? `Current MagicLens view (use it for answers; do not open pages): ${req.contextHint}`
      : ''
  ]
    .filter(Boolean)
    .join('\n')

  const messages: AiChatTurn[] = [
    { role: 'system', content: system },
    ...req.history.slice(-10),
    { role: 'user', content: req.text }
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const reply = await chatOnce(req.provider, messages, req.cliWorkdir)
    if (!reply.ok) {
      return { ok: false, error: reply.error, toolResults, navigate }
    }

    const call = extractToolCall(reply.content)
    if (!call) {
      return { ok: true, reply: reply.content.trim(), toolResults, navigate }
    }

    // Inject active cluster if missing
    if (!call.args.clusterId && req.activeClusterId) {
      call.args.clusterId = req.activeClusterId
    }

    const result = await runMollyTool(call)
    toolResults.push({ ...result, navigate: undefined })

    messages.push({ role: 'assistant', content: reply.content })
    messages.push({
      role: 'user',
      content: `Tool ${result.name} result (${result.ok ? 'ok' : 'error'}): ${result.summary}\nDATA:${JSON.stringify(result.data ?? null).slice(0, 8000)}`
    })
  }

  return {
    ok: true,
    reply: 'I gathered cluster data but hit the tool-step limit. Ask me to continue if you need more detail.',
    toolResults,
    navigate
  }
}

export async function runMollyStartup(
  req: MollyStartupCheckRequest
): Promise<MollyStartupCheckResponse> {
  try {
    const findings = await runStartupChecks(req.plan, req.connectedClusterIds)
    if (findings.length === 0) {
      return { ok: true, findings: [] }
    }

    // Speak / announce only actionable items — ignore informational noise (finalizers, etc.).
    const actionable = findings.filter((f) => f.severity === 'warning' || f.severity === 'critical')
    if (actionable.length === 0) {
      return { ok: true, findings }
    }

    const top = actionable.slice(0, 2)
    const spokenSummary = req.plan.speakOnIssues
      ? [
          `Molly found ${actionable.length} issue${actionable.length === 1 ? '' : 's'}.`,
          ...top.map((f) => clipSpoken(`${f.clusterName}: ${f.message}`, 100))
        ].join(' ')
      : undefined
    return { ok: true, findings, spokenSummary }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), findings: [] }
  }
}

function clipSpoken(text: string, max = 140): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}
