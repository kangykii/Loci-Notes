import type { ProviderMeta } from './aiTypes'

export const DEFAULT_AI_TIMEOUT_MS = 60000
export const CLAUDE_REQUIRED_MAX_TOKENS = 4096

export const aiProviders: ProviderMeta[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'General writing, reasoning, and editing support.',
    defaultModel: 'gpt-5.2',
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google hosted Gemini text generation.',
    defaultModel: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    baseUrlLocked: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Messages API for long-form drafting.',
    defaultModel: 'claude-sonnet-4-20250514',
    baseUrl: 'https://api.anthropic.com/v1',
    baseUrlLocked: true,
  },
  {
    id: 'kimi',
    name: 'Kimi',
    description: 'Moonshot/Kimi OpenAI-compatible chat completions.',
    defaultModel: 'kimi-k2.6',
    baseUrl: 'https://api.moonshot.ai/v1',
  },
]
