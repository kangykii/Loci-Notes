import type { ZodType } from 'zod'

export type AIProviderId = 'openai' | 'gemini' | 'claude' | 'kimi'
export type AITransportMode = 'directByok' | 'local' | 'gateway'
export type AIResponseFormat = 'text' | 'json'
export type AIJsonSchema = Record<string, unknown>
export type AIStructuredOutput = {
  name: string
  schema: AIJsonSchema
  zodSchema: ZodType
}

export type AIProviderSettings = {
  enabled: boolean
  apiKey: string
  model: string
  baseUrl?: string
}

export type AIUsage = {
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
}

export type ProviderMeta = {
  id: AIProviderId
  name: string
  description: string
  defaultModel: string
  baseUrl: string
  baseUrlLocked?: boolean
}

export type AITextRequest = {
  transportMode?: AITransportMode
  providerId: AIProviderId
  provider: AIProviderSettings
  providerMeta: ProviderMeta
  taskInstruction: string
  userContent: string
  promptCacheKey?: string
  responseFormat?: AIResponseFormat
  structuredOutput?: AIStructuredOutput
  temperature?: number
  maxTokens?: number
  contextManifest?: AIContextManifest
  signal: AbortSignal
}

export type AITextResponse = {
  providerId: AIProviderId
  providerMeta: ProviderMeta
  responseText: string
  usage?: AIUsage
}

export type GatewayAIRequest = {
  providerId: AIProviderId
  model: string
  taskInstruction: string
  userContent: string
  promptCacheKey?: string
  responseFormat?: AIResponseFormat
  structuredOutput?: AIStructuredOutput
  contextManifest?: AIContextManifest
}

export type AIContextItem = {
  id: string
  label: string
  charCount: number
  sensitivity: 'low' | 'medium' | 'high'
  enabledByPolicy: boolean
}

export type AIContextManifest = {
  transportMode: AITransportMode
  totalChars: number
  items: AIContextItem[]
}
