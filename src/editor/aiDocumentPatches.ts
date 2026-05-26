import type { AIDocumentOperation, AIDocumentPatch } from '../ai/aiTasks'
import type { LociBlock } from '../db'
import {
  blockDoc,
  codeBlockDocFromData,
  createLociBlock,
  displayMathParagraphDoc,
  listBlockDocFromData,
  paragraphNode,
  quoteBlockDocFromData,
  tableBlockDocFromData,
} from './blocks'
import { createAIBlockAttrs, validateAIBlockAttrs } from './aiBlocks'

function blockFromOperation(operation: AIDocumentOperation): LociBlock | null {
  if (operation.type === 'paragraph') {
    return createLociBlock(blockDoc([paragraphNode(operation.text)]), 'paragraph')
  }

  if (operation.type === 'heading') {
    return createLociBlock(blockDoc([{
      type: 'heading',
      attrs: { level: operation.level },
      content: operation.text ? [{ type: 'text', text: operation.text }] : [],
    }]), 'heading')
  }

  if (operation.type === 'table') {
    return createLociBlock(tableBlockDocFromData(operation.columns, operation.rows), 'table')
  }

  if (operation.type === 'quote') {
    return createLociBlock(quoteBlockDocFromData(operation.quote, operation.author), 'quote')
  }

  if (operation.type === 'list') {
    return createLociBlock(listBlockDocFromData(operation.listType, operation.items), operation.listType)
  }

  if (operation.type === 'code') {
    return createLociBlock(codeBlockDocFromData(operation.code), 'code')
  }

  if (operation.type === 'latex') {
    return createLociBlock(displayMathParagraphDoc(operation.latex), 'paragraph')
  }

  if (operation.type === 'aiBlock') {
    const attrs = createAIBlockAttrs(operation.attrs)
    const validation = validateAIBlockAttrs(attrs)
    return createLociBlock(blockDoc([{
      type: 'lociAIBlock',
      attrs: validation.attrs,
    }]), 'aiBlock')
  }

  return null
}

export function blocksFromAIDocumentPatch(patch: AIDocumentPatch): LociBlock[] {
  if (patch.intent !== 'insert') return []
  return patch.operations.flatMap((operation) => {
    const block = blockFromOperation(operation)
    return block ? [block] : []
  })
}
