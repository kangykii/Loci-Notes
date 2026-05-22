import { createId } from '../db'
import type { FlashcardReviewState, StudyRating } from '../db'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_EASE_FACTOR = 1.3
const DEFAULT_EASE_FACTOR = 2.5

export function createInitialReviewState(setId: string, atomId: string, nowIso: string): FlashcardReviewState {
  return {
    id: createId('review'),
    setId,
    atomId,
    dueAt: nowIso,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    reviewCount: 0,
    lapseCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

export function reviewStateForCard(
  existing: FlashcardReviewState | undefined,
  setId: string,
  atomId: string,
  nowIso: string,
) {
  return existing ?? createInitialReviewState(setId, atomId, nowIso)
}

export function applyStudyRating(
  state: FlashcardReviewState,
  rating: StudyRating,
  reviewedAtIso: string,
): FlashcardReviewState {
  const previousInterval = Math.max(0, state.intervalDays)
  const previousEase = state.easeFactor || DEFAULT_EASE_FACTOR
  let intervalDays: number
  let easeFactor = previousEase
  let lapseCount = state.lapseCount

  if (rating === 'again') {
    intervalDays = 0
    easeFactor = Math.max(MIN_EASE_FACTOR, previousEase - 0.2)
    lapseCount += 1
  } else if (rating === 'hard') {
    intervalDays = previousInterval <= 0 ? 1 : Math.max(1, Math.round(previousInterval * 1.2))
    easeFactor = Math.max(MIN_EASE_FACTOR, previousEase - 0.15)
  } else if (rating === 'good') {
    intervalDays = previousInterval <= 0 ? 1 : Math.max(1, Math.round(previousInterval * previousEase))
  } else {
    intervalDays = previousInterval <= 0 ? 4 : Math.max(2, Math.round(previousInterval * (previousEase + 0.3)))
    easeFactor = previousEase + 0.15
  }

  const reviewedAt = new Date(reviewedAtIso).getTime()
  const dueAt = new Date(reviewedAt + Math.max(0, intervalDays) * DAY_MS).toISOString()

  return {
    ...state,
    dueAt,
    intervalDays,
    easeFactor,
    reviewCount: state.reviewCount + 1,
    lapseCount,
    lastRating: rating,
    updatedAt: reviewedAtIso,
  }
}

export function sortDueAtomIds(atomIds: string[], states: FlashcardReviewState[], nowIso: string) {
  const nowTime = new Date(nowIso).getTime()
  const stateByAtomId = new Map(states.map((state) => [state.atomId, state]))
  const due = atomIds.filter((atomId) => {
    const state = stateByAtomId.get(atomId)
    return !state || new Date(state.dueAt).getTime() <= nowTime
  })
  const source = due.length ? due : atomIds
  return [...source].sort((left, right) => {
    const leftState = stateByAtomId.get(left)
    const rightState = stateByAtomId.get(right)
    if (!leftState && !rightState) return atomIds.indexOf(left) - atomIds.indexOf(right)
    if (!leftState) return -1
    if (!rightState) return 1
    return leftState.dueAt.localeCompare(rightState.dueAt)
  })
}
