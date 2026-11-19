import type { AiTarget } from './schema'

export type AiDraft = {
  operations: unknown[]
  target: AiTarget
  pageId: string
  marker?: string
  sessionId: string
}

const keyOf = (sessionId: string) => `editor.ai.draft:${sessionId}`

export const readAiDraft = (sessionId: string): AiDraft | undefined => {
  const raw = localStorage.getItem(keyOf(sessionId))
  if (!raw) return
  const saved = JSON.parse(raw)
  if (
    saved?.sessionId !== sessionId ||
    !Array.isArray(saved.operations) ||
    !saved.operations.length ||
    (saved.target !== 'new' && saved.target !== 'current')
  )
    return
  return {
    operations: saved.operations,
    target: saved.target,
    pageId: saved.pageId,
    marker: saved.marker,
    sessionId,
  }
}

export const writeAiDraft = (sessionId: string, draft: AiDraft) => {
  try {
    localStorage.setItem(keyOf(sessionId), JSON.stringify(draft))
  } catch {
    // The in-memory partial result remains available if local storage is full.
  }
}

export const clearAiDraft = (sessionId: string) => {
  try {
    localStorage.removeItem(keyOf(sessionId))
  } catch {
    /* storage may be unavailable */
  }
}
