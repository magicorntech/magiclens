/** Seeded starter note path — kept read-only so edits don't fight vault reseeding. */
export const WELCOME_SPARK_PATH = 'Inbox/Welcome.md'

export function isWelcomeSparkNote(note: { path?: string | null }): boolean {
  const path = (note.path ?? '').replace(/\\/g, '/').replace(/^\/+/, '')
  return path.toLowerCase() === WELCOME_SPARK_PATH.toLowerCase()
}
