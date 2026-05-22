import { requestAITextWithPolicy } from './aiOrchestrator'
import type { AITextRequest } from './aiTypes'

export const requestAIText = (request: AITextRequest) => requestAITextWithPolicy(request)
