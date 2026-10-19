import type { AiChatTurn } from '@shared/types/aiChat'

/**
 * Demo mode only: a scripted stand-in for the LLM so Molly can be shown without Ollama or an API
 * key. Round one answers with a real tool call (which the demo cluster serves with real demo data,
 * so the chat draws genuine tables/charts); round two writes the plain-language summary.
 */
export function demoMollyReply(messages: AiChatTurn[]): string {
  const last = messages[messages.length - 1]
  if (last?.role === 'user' && last.content.startsWith('Tool ')) return summarise(last.content)

  const q = (last?.content ?? '').toLowerCase()
  const call = (tool: string, args: Record<string, unknown> = {}): string => JSON.stringify({ tool, args })

  if (/log/.test(q)) return call('getPodLogs', { namespace: 'shop', podName: 'storefront-7f8d9c-e6k', tailLines: 30 })
  if (/event|warning/.test(q)) return call('getEvents', { namespace: 'shop' })
  if (/node|cpu|memory|capacity/.test(q)) return call('getNodeMetrics')
  if (/disk|storage|pvc|volume/.test(q)) return call('getUsage', { namespace: 'shop' })
  if (/secur|scan/.test(q)) return call('getSecurity')
  if (/pod|restart|deploy/.test(q)) return call('listResources', { kind: 'Pods', namespace: 'shop' })
  return call('summarizeAnomalies')
}

function summarise(toolMessage: string): string {
  const name = /^Tool (\w+)/.exec(toolMessage)?.[1] ?? ''
  const rec = (items: string[]): string => '\n\nRecommendations:\n' + items.map((i) => `- ${i}`).join('\n')
  switch (name) {
    case 'getPodLogs':
      return 'The last 30 lines of storefront-7f8d9c-e6k look healthy: steady 200s on /api/catalog with p95 around 38 ms, and one slow upstream call to search-index at 412 ms.' +
        rec(['Keep an eye on search-index latency', 'Raise the storefront liveness timeout only if the slow calls repeat'])
    case 'getEvents':
      return 'In shop I see two Warning events: image-resizer failed to pull its image on one replica, and a probe failure on checkout-api that already recovered.' +
        rec(['Check the registry mirror for rate limits', 'Re-run the rollout once the pull succeeds'])
    case 'getNodeMetrics':
      return 'CPU is at 36% and memory at 46% across the cluster. aurora-pool-a-1 is the busiest node at 4.4 cores, and aurora-pool-b-2 is NotReady.' +
        rec(['Cordon and drain aurora-pool-b-2', 'Add one worker to pool A before the next rollout'])
    case 'getUsage':
      return 'catalog-idx is the fullest volume at 78% (6.3 of 8 GiB), followed by shop-data at 62%. Everything else is below 60%.' +
        rec(['Expand catalog-idx to 16 GiB this week', 'Set an alert at 85% for shop volumes'])
    case 'getSecurity':
      return 'The latest scan scored 82/100. The main findings are two containers running as root and one Service exposing a NodePort.' +
        rec(['Set runAsNonRoot on storefront and checkout-api', 'Replace the NodePort with an Ingress rule'])
    case 'listResources':
      return 'There are 14 pods in shop; 13 are Running and image-resizer has 1 of 2 replicas ready. storefront has restarted twice in the last day.' +
        rec(['Describe the image-resizer pod for the pull error', 'Check storefront memory limits'])
    default:
      return 'aurora-prod is Degraded: one of seven nodes is not ready (aurora-pool-b-2) and one pod is pending. image-resizer is running 1 of 2 replicas.' +
        rec(['Drain aurora-pool-b-2 and check its kubelet', 'Look at the image-resizer events for the pull failure'])
  }
}
