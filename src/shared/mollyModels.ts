/** Sentinel: try preferred Live models in order until one connects. */
export const MOLLY_LIVE_MODEL_AUTO = 'auto'

export type MollyLiveModelOption = {
  id: string
  /** Short UI label (English; i18n can map known ids). */
  label: string
}

/**
 * Live / native-audio models Molly can use.
 * Auto order prefers current Live API ids that keep separate quota from text Flash.
 */
export const MOLLY_LIVE_MODEL_OPTIONS: MollyLiveModelOption[] = [
  { id: MOLLY_LIVE_MODEL_AUTO, label: 'Auto (best available)' },
  { id: 'gemini-3.3-flash-live', label: 'Gemini 3.3 Flash Live' },
  { id: 'gemini-3.3-flash-live-preview', label: 'Gemini 3.3 Flash Live (preview)' },
  { id: 'gemini-2.5-flash-preview-native-audio-dialog', label: '2.5 Flash Native Audio Dialog' },
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', label: '2.5 Flash Native Audio (12-2025)' },
  { id: 'gemini-live-2.5-flash-native-audio', label: 'Live 2.5 Flash Native Audio' },
  { id: 'gemini-live-2.5-flash-preview', label: 'Live 2.5 Flash Preview' },
  { id: 'gemini-2.0-flash-live-001', label: '2.0 Flash Live' }
]

/** Auto fallback chain (excludes `auto` sentinel). */
export const MOLLY_LIVE_MODELS_AUTO: string[] = MOLLY_LIVE_MODEL_OPTIONS.filter(
  (o) => o.id !== MOLLY_LIVE_MODEL_AUTO
).map((o) => o.id)

export function resolveMollyLiveModels(preference: string | undefined | null): string[] {
  const raw = (preference ?? MOLLY_LIVE_MODEL_AUTO).trim() || MOLLY_LIVE_MODEL_AUTO
  if (raw === MOLLY_LIVE_MODEL_AUTO) return [...MOLLY_LIVE_MODELS_AUTO]
  // Pinned model first, then auto chain as soft fallbacks (skip duplicate).
  return [raw, ...MOLLY_LIVE_MODELS_AUTO.filter((m) => m !== raw)]
}

/** Detect Gemini quota / rate-limit style failures. */
export function isGeminiRateLimitError(message: string): boolean {
  return /429|RESOURCE_EXHAUSTED|rate.?limit|quota|Too Many Requests|limit: 0/i.test(message)
}

export function geminiRateLimitUserMessage(detail?: string): string {
  const tip =
    'Gemini API kotası doldu (rate limit). AI Studio’da günlük/dakikalık limiti bekle veya faturalandırmayı aç. ' +
    'Live modelleri genelde ayrı kotadır — Molly tercihlerinden Live modelini değiştirip tekrar dene.'
  if (!detail?.trim()) return tip
  return `${tip} (${detail.trim().slice(0, 160)})`
}
