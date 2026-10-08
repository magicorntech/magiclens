import type { AiChatTurn } from '@shared/types/aiChat'

/** Preferred Flash models when primary is overloaded (503) or missing. */
export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
] as const

export function normalizeGeminiModelId(model: string | undefined): string {
  let m = (model || '').trim()
  if (m.startsWith('models/')) m = m.slice('models/'.length)
  if (
    !m ||
    m === 'default' ||
    m.startsWith('gemini-1.') ||
    m.startsWith('gemini-2.0') ||
    m.includes('pro-preview')
  ) {
    return 'gemini-3.8-flash'
  }
  return m
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildContents(messages: AiChatTurn[]): {
  system?: string
  contents: Array<{ role: string; parts: Array<{ text: string }> }>
} {
  const system = messages.find((m) => m.role === 'system')?.content
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  return { system, contents }
}

async function generateOnce(
  key: string,
  model: string,
  messages: AiChatTurn[]
): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; body: string }> {
  const { system, contents } = buildContents(messages)
  let res: Response
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents
        })
      }
    )
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : String(err)
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false, status: res.status, body: body.slice(0, 500) }
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')?.trim()
  if (!content) return { ok: false, status: 200, body: 'empty response' }
  return { ok: true, content, model }
}

function modelCandidates(preferred: string): string[] {
  const primary = normalizeGeminiModelId(preferred)
  const rest = GEMINI_FALLBACK_MODELS.filter((m) => m !== primary)
  return [primary, ...rest]
}

/**
 * Call Gemini generateContent with retries on 429/503 and model fallbacks on sustained overload.
 */
export async function generateGeminiContent(opts: {
  apiKey: string
  model?: string
  messages: AiChatTurn[]
}): Promise<{ ok: true; content: string; model: string } | { ok: false; error: string }> {
  const key = opts.apiKey.trim()
  if (!key) return { ok: false, error: 'Gemini API key required.' }

  const models = modelCandidates(opts.model ?? 'gemini-3.8-flash')
  let lastError = ''

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await generateOnce(key, model, opts.messages)
      if (result.ok) return result

      lastError =
        result.status === 0
          ? result.body
          : `Gemini ${result.status}: ${result.body}`

      const retryable = result.status === 429 || result.status === 503
      if (retryable && attempt < 2) {
        await sleep(400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200))
        continue
      }
      // Overloaded / rate-limited → try next model
      if (retryable) break
      // Hard errors (404, 400, 401) — don't keep flipping models except 404 on retired ids
      if (result.status === 404) break
      return { ok: false, error: lastError }
    }
  }

  if (/429|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(lastError)) {
    return {
      ok: false,
      error:
        'Gemini API kotası doldu (rate limit). AI Studio’da günlük/dakikalık limiti bekle veya faturalandırmayı aç. Metin Flash modelleri bitmiş olabilir — Live model ayrı kotadır.'
    }
  }
  if (/503|UNAVAILABLE|high demand/i.test(lastError)) {
    return {
      ok: false,
      error:
        'Gemini şu an yoğun (503). Birkaç saniye sonra tekrar dene; Molly otomatik olarak alternatif Flash modellerini de denedi.'
    }
  }
  return { ok: false, error: lastError || 'Gemini request failed.' }
}

/** Transcribe recorded microphone audio via Gemini multimodal. */
export async function transcribeGeminiAudio(opts: {
  apiKey: string
  model?: string
  mimeType: string
  base64: string
  locale?: string
}): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const key = opts.apiKey.trim()
  if (!key) return { ok: false, error: 'Gemini API key required.' }
  if (!opts.base64.trim()) return { ok: false, error: 'Empty audio.' }

  const lang = opts.locale?.trim() || 'en-US'
  const prompt =
    `Transcribe the user's speech to plain text. Language hint: ${lang}. ` +
    'Return ONLY the transcript words, with no quotes, labels, or commentary. ' +
    'If the audio is silent or unintelligible, return an empty string.'

  const models = modelCandidates(opts.model ?? 'gemini-3.8-flash')
  let lastError = ''

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        mimeType: opts.mimeType || 'audio/webm',
                        data: opts.base64
                      }
                    },
                    { text: prompt }
                  ]
                }
              ]
            })
          }
        )
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        break
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        lastError = `Gemini ${res.status}: ${body.slice(0, 400)}`
        if ((res.status === 429 || res.status === 503) && attempt < 1) {
          await sleep(500 * (attempt + 1))
          continue
        }
        if (res.status === 429 || res.status === 503 || res.status === 404) break
        return { ok: false, error: lastError }
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')?.trim() ?? ''
      return { ok: true, text, model }
    }
  }

  if (/429|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(lastError)) {
    return {
      ok: false,
      error:
        'Gemini API kotası doldu (rate limit). Transkripsiyon için metin modeli kullanılamıyor — limiti bekle, faturalandır veya Molly’de Gemini Live + Live modeli dene.'
    }
  }
  return {
    ok: false,
    error: lastError || 'Speech transcription failed.'
  }
}
