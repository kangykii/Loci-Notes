export const EDITOR_MARGINALIA_FADE_CHAR_LIMIT = 120

export function cityMarginaliaIndexForNote(noteId: string, cityCount: number): number {
  if (!cityCount) return 0
  let hash = 0
  for (let index = 0; index < noteId.length; index += 1) {
    hash = ((hash * 31) + noteId.charCodeAt(index)) >>> 0
  }
  return hash % cityCount
}

export function editorMarginaliaOpacityFromText(
  text: string,
  fadeCharLimit = EDITOR_MARGINALIA_FADE_CHAR_LIMIT,
): number {
  const weightedCharCount = text.replace(/\s+/g, '').length
  const fadeProgress = Math.min(weightedCharCount / fadeCharLimit, 1)
  return Number((1 - fadeProgress).toFixed(3))
}
