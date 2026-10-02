import { Worker } from 'node:worker_threads'
import { join } from 'node:path'
import * as zlib from 'node:zlib'
import type { HelmDecodeWorkerInput, HelmDecodeWorkerResult } from './helmDecodeWorker'

/**
 * Run a one-shot worker script next to the main bundle (`out/main/workers/...`).
 * Workers get their own V8 isolate — CPU work there cannot freeze Electron's UI thread.
 */
export function runWorkerTask<TIn, TOut>(scriptRelativePath: string, workerData: TIn): Promise<TOut> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, scriptRelativePath), { workerData })
    const fail = (err: Error): void => {
      void worker.terminate().catch(() => {})
      reject(err)
    }
    worker.once('message', (message: TOut) => {
      void worker.terminate().catch(() => {})
      resolve(message)
    })
    worker.once('error', fail)
    worker.once('exit', (code) => {
      if (code !== 0) fail(new Error(`Worker exited with code ${code}`))
    })
  })
}

function decodeOneSync(base64Value: string): Record<string, unknown> | null {
  try {
    const helmEncoded = Buffer.from(base64Value, 'base64').toString('utf8')
    const gzipped = Buffer.from(helmEncoded, 'base64')
    const json = zlib.gunzipSync(gzipped).toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function decodeHelmReleasePayloads(
  payloads: string[]
): Promise<HelmDecodeWorkerResult['decoded']> {
  if (payloads.length === 0) return []
  // Small batches aren't worth worker spawn overhead (~10–30MB isolate).
  if (payloads.length < 4) return payloads.map(decodeOneSync)
  try {
    const res = await runWorkerTask<HelmDecodeWorkerInput, HelmDecodeWorkerResult>(
      'workers/helmDecodeWorker.js',
      { payloads }
    )
    return res.decoded
  } catch (err) {
    console.warn('[magiclens] helm decode worker failed, falling back to main thread:', err)
    return payloads.map(decodeOneSync)
  }
}
