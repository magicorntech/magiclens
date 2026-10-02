import { parentPort, workerData } from 'node:worker_threads'
import * as zlib from 'node:zlib'

/**
 * Off-main-thread Helm v3 secret decode: base64(gzip(json)).
 * Keeps gunzipSync + JSON.parse off Electron's main process so the UI stays responsive
 * when listing many releases (see worker_threads guidance for Electron freezes).
 */

export interface HelmDecodeWorkerInput {
  payloads: string[]
}

export interface HelmDecodeWorkerResult {
  /** Parallel to payloads; null when a secret could not be decoded. */
  decoded: Array<Record<string, unknown> | null>
}

function decodeOne(base64Value: string): Record<string, unknown> | null {
  try {
    const helmEncoded = Buffer.from(base64Value, 'base64').toString('utf8')
    const gzipped = Buffer.from(helmEncoded, 'base64')
    const json = zlib.gunzipSync(gzipped).toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

const input = workerData as HelmDecodeWorkerInput
const decoded = (input.payloads ?? []).map(decodeOne)
const result: HelmDecodeWorkerResult = { decoded }
parentPort?.postMessage(result)
