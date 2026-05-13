export type AIProviderId = 'openai' | 'gemini' | 'claude' | 'kimi'

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
  providerId: AIProviderId
  provider: AIProviderSettings
  providerMeta: ProviderMeta
  taskInstruction: string
  userContent: string
  promptCacheKey?: string
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
}
