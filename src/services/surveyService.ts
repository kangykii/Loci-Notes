import { db, nowIso } from '../db'
import { pb } from '../integrations/pocketbase/client'

export type SurveyPromptKind = 'single-choice' | 'free-text'
export type SurveyPromptPlacement = 'settings' | 'app-banner'
export type SurveyPromptStatus = 'draft' | 'active' | 'archived'

export type SurveyPrompt = {
  id: string
  title: string
  body?: string
  kind: SurveyPromptKind
  options: string[]
  placement: SurveyPromptPlacement
  startsAt?: string
  endsAt?: string
  status: SurveyPromptStatus
  createdAt?: string
  updatedAt: string
}

export type SurveyResponseInput = {
  prompt: SurveyPrompt
  accountId: string
  answer: string
  comment?: string
}

const SURVEY_PROMPT_COLLECTION = 'survey_prompts'
const SURVEY_RESPONSE_COLLECTION = 'survey_responses'
const MAX_ANSWER_LENGTH = 2_000
const MAX_COMMENT_LENGTH = 4_000
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'unknown'

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((option): option is string => isString(option) && option.trim().length > 0).map((option) => option.trim())
}

export function normalizeSurveyPrompt(value: Record<string, unknown>): SurveyPrompt | null {
  if (!isString(value.id) || !isString(value.title) || !value.title.trim()) return null
  const kind = value.kind === 'free-text' ? 'free-text' : 'single-choice'
  const placement = value.placement === 'app-banner' ? 'app-banner' : 'settings'
  const status = value.status === 'draft' || value.status === 'archived' ? value.status : 'active'
  return {
    id: value.id,
    title: value.title.trim(),
    body: isString(value.body) ? value.body : undefined,
    kind,
    options: normalizeOptions(value.options),
    placement,
    startsAt: isString(value.startsAt) ? value.startsAt : undefined,
    endsAt: isString(value.endsAt) ? value.endsAt : undefined,
    status,
    createdAt: isString(value.createdAt) ? value.createdAt : isString(value.created) ? value.created : undefined,
    updatedAt: isString(value.updatedAt) ? value.updatedAt : isString(value.updated) ? value.updated : nowIso(),
  }
}

export function isSurveyPromptActive(prompt: SurveyPrompt, placement: SurveyPromptPlacement, now = nowIso()) {
  if (prompt.status !== 'active') return false
  if (prompt.placement !== placement) return false
  if (prompt.startsAt && prompt.startsAt > now) return false
  if (prompt.endsAt && prompt.endsAt < now) return false
  if (prompt.kind === 'single-choice' && prompt.options.length === 0) return false
  return true
}

export function validateSurveyResponseInput({ prompt, accountId, answer, comment }: SurveyResponseInput) {
  const trimmedAnswer = answer.trim()
  const trimmedComment = comment?.trim() ?? ''
  if (!accountId.trim()) throw new Error('Sign in before answering this prompt.')
  if (!trimmedAnswer) throw new Error('Choose or enter an answer before submitting.')
  if (trimmedAnswer.length > MAX_ANSWER_LENGTH) throw new Error('Survey answer is too long.')
  if (trimmedComment.length > MAX_COMMENT_LENGTH) throw new Error('Survey comment is too long.')
  if (prompt.kind === 'single-choice' && !prompt.options.includes(trimmedAnswer)) {
    throw new Error('Choose one of the available survey options.')
  }
  return { answer: trimmedAnswer, comment: trimmedComment }
}

function promptStateId(accountId: string, promptId: string) {
  return `${accountId}:${promptId}`
}

async function getPromptState(accountId: string, promptId: string) {
  return await db.surveyPromptStates.get(promptStateId(accountId, promptId))
}

async function savePromptState(accountId: string, promptId: string, status: 'dismissed' | 'submitted') {
  await db.surveyPromptStates.put({
    id: promptStateId(accountId, promptId),
    accountId,
    promptId,
    status,
    updatedAt: nowIso(),
  })
}

export const surveyService = {
  async getActivePrompt(accountId: string, placement: SurveyPromptPlacement = 'settings') {
    if (!accountId || !pb.authStore.isValid) return null
    const records = await pb.collection(SURVEY_PROMPT_COLLECTION).getFullList<Record<string, unknown>>({
      filter: `status = "active" && placement = "${placement}"`,
      sort: '-updatedAt',
    })
    const prompts = records
      .map((record) => normalizeSurveyPrompt(record))
      .filter((prompt): prompt is SurveyPrompt => Boolean(prompt))
      .filter((prompt) => isSurveyPromptActive(prompt, placement))

    for (const prompt of prompts) {
      const state = await getPromptState(accountId, prompt.id)
      if (!state || state.status !== 'dismissed' && state.status !== 'submitted') return prompt
    }
    return null
  },

  async dismissPrompt(accountId: string, promptId: string) {
    if (!accountId || !promptId) return
    await savePromptState(accountId, promptId, 'dismissed')
  },

  async submitResponse(input: SurveyResponseInput) {
    const { answer, comment } = validateSurveyResponseInput(input)
    await pb.collection(SURVEY_RESPONSE_COLLECTION).create({
      promptId: input.prompt.id,
      accountId: input.accountId,
      answer,
      comment: comment || undefined,
      appVersion: APP_VERSION,
      createdAt: nowIso(),
    })
    await savePromptState(input.accountId, input.prompt.id, 'submitted')
  },
}
