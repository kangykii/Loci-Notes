import { invoke } from '@tauri-apps/api/core'
import type { Table } from 'dexie'

import { db } from '../db'
import type { CachedFlashcardQuiz, FlashcardAIHintCache, FlashcardReviewState, FlashcardSet } from '../db'
import {
  listFlashcardReviewStatesFromRust,
  listFlashcardSetsFromRust,
  saveFlashcardReviewStatesBatchToRust,
  saveFlashcardSetsBatchToRust,
  shouldUseRustStorage,
} from '../tauri/workspaceClient'

async function deleteFlashcardSetFromRust(setId: string) {
  await invoke('delete_flashcard_set', { setId })
}

export const flashcardSetsRepository = {
  listByUpdated: () => {
    if (shouldUseRustStorage()) return listFlashcardSetsFromRust()
    return db.flashcardSets.orderBy('updatedAt').reverse().toArray()
  },

  save: async (set: FlashcardSet) => {
    if (shouldUseRustStorage()) {
      await saveFlashcardSetsBatchToRust([set])
      return
    }
    await db.flashcardSets.put(set)
  },

  saveMany: async (sets: FlashcardSet[]) => {
    if (shouldUseRustStorage()) {
      await saveFlashcardSetsBatchToRust(sets)
      return
    }
    await db.flashcardSets.bulkPut(sets)
  },

  delete: async (setId: string) => {
    if (shouldUseRustStorage()) {
      await deleteFlashcardSetFromRust(setId)
      return
    }
    const tables = [db.flashcardSets, db.flashcardReviewStates] as unknown as Table<unknown, string>[]
    await db.transaction('rw', tables, async () => {
      await db.flashcardSets.delete(setId)
      await db.flashcardReviewStates.where('setId').equals(setId).delete()
    })
  },

  listReviewStates: async (setId: string) => {
    if (shouldUseRustStorage()) {
      const states = await listFlashcardReviewStatesFromRust()
      return states.filter((state) => state.setId === setId)
    }
    return db.flashcardReviewStates.where('setId').equals(setId).toArray()
  },

  saveReviewState: async (state: FlashcardReviewState) => {
    if (shouldUseRustStorage()) {
      await saveFlashcardReviewStatesBatchToRust([state])
      return
    }
    await db.flashcardReviewStates.put(state)
  },

  deleteReviewStatesForAtoms: async (setId: string, atomIds: string[]) => {
    if (shouldUseRustStorage()) {
      if (atomIds.length) {
        await invoke('delete_flashcard_review_states', { setId, atomIds })
      }
      return
    }
    await Promise.all(atomIds.map((atomId) => db.flashcardReviewStates.where('[setId+atomId]').equals([setId, atomId]).delete()))
  },

  updateStudyTiming: async (setId: string, durationMs: number, studiedAt: string, mode?: 'flashcards' | 'match' | 'quiz') => {
    const set = shouldUseRustStorage()
      ? (await listFlashcardSetsFromRust()).find((item) => item.id === setId)
      : await db.flashcardSets.get(setId)
    if (!set) return undefined
    const safeDurationMs = Math.max(0, durationMs)
    const nextMatchSessionCount = Math.max(0, set.matchSessionCount ?? 0) + (mode === 'match' ? 1 : 0)
    const nextMatchTotalMs = Math.max(0, set.matchTotalMs ?? 0) + (mode === 'match' ? safeDurationMs : 0)
    const next: FlashcardSet = {
      ...set,
      totalStudyMs: Math.max(0, set.totalStudyMs ?? 0) + safeDurationMs,
      lastStudyDurationMs: safeDurationMs,
      studySessionCount: Math.max(0, set.studySessionCount ?? 0) + 1,
      matchBestMs: mode === 'match'
        ? Math.min(set.matchBestMs && set.matchBestMs > 0 ? set.matchBestMs : safeDurationMs, safeDurationMs)
        : set.matchBestMs,
      matchTotalMs: mode === 'match' ? nextMatchTotalMs : set.matchTotalMs,
      matchSessionCount: mode === 'match' ? nextMatchSessionCount : set.matchSessionCount,
      lastStudiedAt: studiedAt,
      updatedAt: studiedAt,
    }
    await flashcardSetsRepository.save(next)
    return next
  },

  resetStudyProgress: async (setId: string, resetAt: string) => {
    if (shouldUseRustStorage()) {
      const set = (await listFlashcardSetsFromRust()).find((item) => item.id === setId)
      if (!set) return undefined
      const next: FlashcardSet = {
        ...set,
        updatedAt: resetAt,
        lastStudiedAt: undefined,
        totalStudyMs: 0,
        lastStudyDurationMs: 0,
        studySessionCount: 0,
        matchBestMs: 0,
        matchTotalMs: 0,
        matchSessionCount: 0,
        aiHintsByAtomId: {},
        cachedQuiz: undefined,
      }
      await invoke('delete_flashcard_review_states_for_set', { setId })
      await saveFlashcardSetsBatchToRust([next])
      return next
    }

    const tables = [db.flashcardSets, db.flashcardReviewStates] as unknown as Table<unknown, string>[]
    return db.transaction('rw', tables, async () => {
      const set = await db.flashcardSets.get(setId)
      if (!set) return undefined
      const next: FlashcardSet = {
        ...set,
        updatedAt: resetAt,
        lastStudiedAt: undefined,
        totalStudyMs: 0,
        lastStudyDurationMs: 0,
        studySessionCount: 0,
        matchBestMs: 0,
        matchTotalMs: 0,
        matchSessionCount: 0,
        aiHintsByAtomId: {},
        cachedQuiz: undefined,
      }
      await db.flashcardReviewStates.where('setId').equals(setId).delete()
      await db.flashcardSets.put(next)
      return next
    })
  },

  cacheAIHint: async (setId: string, atomId: string, hint: string, generatedAt: string) => {
    const set = shouldUseRustStorage()
      ? (await listFlashcardSetsFromRust()).find((item) => item.id === setId)
      : await db.flashcardSets.get(setId)
    if (!set) return undefined
    const hints: FlashcardAIHintCache = {
      ...(set.aiHintsByAtomId ?? {}),
      [atomId]: { hint, generatedAt },
    }
    const next: FlashcardSet = { ...set, aiHintsByAtomId: hints, updatedAt: generatedAt }
    await flashcardSetsRepository.save(next)
    return next
  },

  cacheQuiz: async (setId: string, cachedQuiz: CachedFlashcardQuiz) => {
    const set = shouldUseRustStorage()
      ? (await listFlashcardSetsFromRust()).find((item) => item.id === setId)
      : await db.flashcardSets.get(setId)
    if (!set) return undefined
    const next: FlashcardSet = { ...set, cachedQuiz, updatedAt: cachedQuiz.generatedAt }
    await flashcardSetsRepository.save(next)
    return next
  },
}
