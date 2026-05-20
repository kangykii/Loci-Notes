import type { AITextResponse, GatewayAIRequest, ProviderMeta } from './aiTypes'

export type GatewayAIClientRequest = GatewayAIRequest & {
  providerMeta: ProviderMeta
  signal: AbortSignal
}

export async function requestGatewayAIText(request: GatewayAIClientRequest): Promise<AITextResponse> {
  void request
  throw new Error('Cloud AI gateway is not configured yet.')
}
