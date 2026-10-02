import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cpus, freemem, hostname, release, totalmem, type as osType } from 'node:os'
import { app, screen } from 'electron'
import packageJson from '../../../package.json'
import { listClusters } from '../persistence/clusterStore'
import { getUiState } from '../persistence/uiState'
import { resourceWatchManager } from '../k8s/resourceWatchManager'

const CRASH_LOG_TAIL_BYTES = 80 * 1024

export type DiagnosticsReason =
  | 'manual'
  | 'unresponsive'
  | 'responsive'
  | 'render-process-gone'
  | 'gpu-process-gone'
  | 'child-process-gone'

export interface DiagnosticsWriteResult {
  path: string
  logsDir: string
  crashDumpsDir: string
}

function safeReadTail(filePath: string, maxBytes: number): string | null {
  try {
    if (!existsSync(filePath)) return null
    const buf = readFileSync(filePath)
    if (buf.length <= maxBytes) return buf.toString('utf8')
    return buf.subarray(buf.length - maxBytes).toString('utf8')
  } catch {
    return null
  }
}

function listDumpNames(dir: string): string[] {
  try {
    if (!existsSync(dir)) return []
    return readdirSync(dir)
      .filter((name) => !name.startsWith('.'))
      .slice(0, 40)
  } catch {
    return []
  }
}

function isoStamp(d = new Date()): string {
  return d.toISOString().replace(/[:.]/g, '-')
}

/**
 * Write a local diagnostics JSON under app logs. No kubeconfigs, tokens, or secrets —
 * only versions, host facts, light UI counts, and crash-log tails for manual share.
 */
export function writeDiagnosticsReport(
  reason: DiagnosticsReason,
  extra?: Record<string, unknown>
): DiagnosticsWriteResult {
  const logsDir = app.getPath('logs')
  const crashDumpsDir = app.getPath('crashDumps')
  mkdirSync(logsDir, { recursive: true })

  let systemVersion: string | undefined
  try {
    systemVersion = process.getSystemVersion?.()
  } catch {
    // optional
  }

  const cpuList = cpus()
  const primary = screen.getPrimaryDisplay()
  const clusters = listClusters()
  const ui = getUiState()
  const metrics = app.getAppMetrics()
  const heap = process.memoryUsage()

  const report = {
    magiclensDiagnosticsVersion: 1,
    reason,
    writtenAt: new Date().toISOString(),
    app: {
      name: app.getName(),
      version: packageJson.version,
      buildNumber: (packageJson as { buildNumber?: string }).buildNumber ?? '',
      packaged: app.isPackaged
    },
    runtime: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch
    },
    host: {
      hostname: hostname(),
      osType: osType(),
      osRelease: release(),
      systemVersion,
      cpuModel: cpuList[0]?.model?.trim() || 'Unknown CPU',
      cpuCores: cpuList.length,
      cpuSpeedMhz: cpuList[0]?.speed ?? 0,
      totalMemoryBytes: totalmem(),
      freeMemoryBytes: freemem(),
      primaryDisplay: {
        width: primary.size.width,
        height: primary.size.height,
        scaleFactor: primary.scaleFactor
      }
    },
    process: {
      pid: process.pid,
      mainHeapUsedBytes: heap.heapUsed,
      mainHeapTotalBytes: heap.heapTotal,
      rssBytes: heap.rss,
      appMetrics: metrics.map((m) => {
        const anyM = m as Electron.ProcessMetric & { name?: string; serviceName?: string }
        return {
          pid: m.pid,
          type: m.type,
          name: anyM.name || anyM.serviceName || m.type,
          cpuPercent: m.cpu.percentCPUUsage,
          memoryBytes: m.memory.workingSetSize * 1024
        }
      })
    },
    appState: {
      clusterCount: clusters.length,
      favoriteCount: clusters.filter((c) => c.isFavorite).length,
      openedTabCount: ui.openedTabs?.length ?? 0,
      activeWatchSessions: resourceWatchManager.sessionCount()
    },
    paths: {
      logsDir,
      crashDumpsDir,
      userData: app.getPath('userData')
    },
    crashLogTail: safeReadTail(join(logsDir, 'main-crash.log'), CRASH_LOG_TAIL_BYTES),
    crashDumpFiles: listDumpNames(crashDumpsDir),
    extra: extra ?? null
  }

  const filePath = join(logsDir, `diagnostics-${isoStamp()}.json`)
  writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  // Also append a one-line pointer into the crash log so chronological grepping finds it.
  try {
    appendFileSync(
      join(logsDir, 'main-crash.log'),
      `[${new Date().toISOString()}] diagnostics written reason=${reason} path=${filePath}\n`
    )
  } catch {
    // best-effort
  }

  return { path: filePath, logsDir, crashDumpsDir }
}

export function getLogsDir(): string {
  return app.getPath('logs')
}

export function getCrashDumpsDir(): string {
  return app.getPath('crashDumps')
}
