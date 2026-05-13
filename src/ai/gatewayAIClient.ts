import type { AITextResponse, GatewayAIRequest, ProviderMeta } from './aiTypes'

export type GatewayAIClientRequest = GatewayAIRequest & {
  providerMeta: ProviderMeta
  signal: AbortSignal
}

export async function requestGatewayAIText(_request: GatewayAIClientRequest): Promise<AITextResponse> {
  throw new Error('Cloud AI gateway is not configured yet.')
}
