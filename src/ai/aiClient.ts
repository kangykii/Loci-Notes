import { requestDirectAIText } from './directAIClient'
import type { AITextRequest } from './aiTypes'

export const requestAIText = (request: AITextRequest) => requestDirectAIText(request)
