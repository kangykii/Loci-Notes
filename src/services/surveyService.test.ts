import { describe, expect, it } from 'vitest'
import {
  isSurveyPromptActive,
  normalizeSurveyPrompt,
  validateSurveyResponseInput,
} from './surveyService'
import type { SurveyPrompt } from './surveyService'

const activePrompt: SurveyPrompt = {
  id: 'prompt_1',
  title: 'What should improve next?',
  kind: 'single-choice',
  options: ['Editor', 'Study', 'Sharing'],
  placement: 'settings',
  status: 'active',
  updatedAt: '2026-05-20T00:00:00.000Z',
}

describe('surveyService prompt helpers', () => {
  it('filters active prompts by status, placement, dates, and valid options', () => {
    const now = '2026-05-21T00:00:00.000Z'

    expect(isSurveyPromptActive(activePrompt, 'settings', now)).toBe(true)
    expect(isSurveyPromptActive({ ...activePrompt, status: 'draft' }, 'settings', now)).toBe(false)
    expect(isSurveyPromptActive({ ...activePrompt, placement: 'app-banner' }, 'settings', now)).toBe(false)
    expect(isSurveyPromptActive({ ...activePrompt, startsAt: '2026-05-22T00:00:00.000Z' }, 'settings', now)).toBe(false)
    expect(isSurveyPromptActive({ ...activePrompt, endsAt: '2026-05-20T00:00:00.000Z' }, 'settings', now)).toBe(false)
    expect(isSurveyPromptActive({ ...activePrompt, options: [] }, 'settings', now)).toBe(false)
    expect(isSurveyPromptActive({ ...activePrompt, kind: 'free-text', options: [] }, 'settings', now)).toBe(true)
  })

  it('normalizes PocketBase prompt records conservatively', () => {
    expect(normalizeSurveyPrompt({
      id: 'prompt_remote',
      title: '  Pick one  ',
      body: 'Tell us where to focus.',
      kind: 'free-text',
      options: ['  A  ', '', 4],
      placement: 'app-banner',
      status: 'archived',
      updated: '2026-05-20T00:00:00.000Z',
    })).toMatchObject({
      id: 'prompt_remote',
      title: 'Pick one',
      kind: 'free-text',
      options: ['A'],
      placement: 'app-banner',
      status: 'archived',
      updatedAt: '2026-05-20T00:00:00.000Z',
    })

    expect(normalizeSurveyPrompt({ id: 'missing_title' })).toBeNull()
  })
})

describe('surveyService response validation', () => {
  it('requires a signed-in account and non-empty answer', () => {
    expect(() => validateSurveyResponseInput({
      prompt: activePrompt,
      accountId: '',
      answer: 'Editor',
    })).toThrow('Sign in')

    expect(() => validateSurveyResponseInput({
      prompt: activePrompt,
      accountId: 'user_1',
      answer: ' ',
    })).toThrow('Choose or enter')
  })

  it('requires single-choice answers to match prompt options', () => {
    expect(validateSurveyResponseInput({
      prompt: activePrompt,
      accountId: 'user_1',
      answer: 'Editor',
      comment: '  Polishing blocks would help.  ',
    })).toEqual({
      answer: 'Editor',
      comment: 'Polishing blocks would help.',
    })

    expect(() => validateSurveyResponseInput({
      prompt: activePrompt,
      accountId: 'user_1',
      answer: 'Billing',
    })).toThrow('available survey options')
  })
})
