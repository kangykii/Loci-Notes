import { createId, nowIso } from '../db'
import type { JSONContent, LociBlock, LociBlockType } from '../db'
import { aiBlockPreview, createAIBlockAttrs } from './aiBlocks'
import { LOCI_BLOCK_ID_ATTR, blockTypeForNode, collectText } from './documentUtils'

export {
  LOCI_BLOCK_ID_ATTR,
  atomMarkFor,
  blockTypeForNode,
  collectAtomIds,
  collectText,
  contentHasAtom,
  remapAtomIds,
} from './documentUtils'

type LegacyLociBlock = LociBlock & {
  children?: LegacyLociBlock[]
}

export type ImageAlignPreset = 'left' | 'center' | 'right'
export type ListBlockType = 'checklist' | 'bulletList' | 'numberedList'
export type FormatBlockType = 'table' | 'quote' | 'image' | 'checklist' | 'bulletList' | 'numberedList' | 'code' | 'math'

export const emptyDoc: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start writing...' }] }],
}

export const blankDoc = (text = ''): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
})

export const headingDoc = (heading: string, body = ''): JSONContent => ({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] },
    { type: 'paragraph', content: body ? [{ type: 'text', text: body }] : [] },
  ],
})

export function cloneTemplateValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function blockIdForNode(node: JSONContent | undefined | null): string | undefined {
  const id = node?.attrs?.[LOCI_BLOCK_ID_ATTR]
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

export function withBlockId(node: JSONContent, blockId: string): JSONContent {
  return {
    ...node,
    attrs: { ...node.attrs, [LOCI_BLOCK_ID_ATTR]: blockId },
  }
}

function topLevelNodesFromContent(content?: JSONContent): JSONContent[] {
  if (!content) return []
  if (content.type === 'doc') return content.content ?? []
  return [content]
}

export function ensureDocumentBlockIds(content?: JSONContent, blocks?: LociBlock[]): JSONContent {
  const base = content?.type === 'doc' ? content : blockDoc(topLevelNodesFromContent(content))
  const nodes = base.content ?? []
  const flatBlocks = flattenLegacyLociBlocks(blocks as LegacyLociBlock[] | undefined)
  const usedIds = new Set<string>()
  let changed = false
  const sourceNodes = nodes.length ? nodes : [{ type: 'paragraph', content: [] }]
  const nextNodes = sourceNodes.map((node, index) => {
    let blockId = blockIdForNode(node)
    if (!blockId || usedIds.has(blockId)) {
      const seeded = flatBlocks[index]?.id
      blockId = seeded && !usedIds.has(seeded) ? seeded : createId('block')
      changed = true
    }
    usedIds.add(blockId)
    if (blockIdForNode(node) !== blockId) {
      return withBlockId(cloneTemplateValue(node), blockId)
    }
    return node
  })
  if (!changed && content?.type === 'doc' && nodes.length === nextNodes.length) return content
  return { ...base, content: nextNodes }
}

export function blocksMatchStoredContent(block: LociBlock, nodeWithId: JSONContent): boolean {
  const storedTop = contentFromBlocks([block]).content?.[0]
  return (
    block.type === blockTypeForNode(nodeWithId) &&
    !!storedTop &&
    nodeContentSignature(storedTop) === nodeContentSignature(nodeWithId)
  )
}

function nodeContentSignature(node: JSONContent): string {
  const next = cloneTemplateValue(node)
  if (next.attrs?.[LOCI_BLOCK_ID_ATTR]) {
    const { [LOCI_BLOCK_ID_ATTR]: _removed, ...rest } = next.attrs
    if (Object.keys(rest).length) next.attrs = rest
    else delete next.attrs
  }
  return JSON.stringify(next)
}

export function blockContentNodes(content?: JSONContent): JSONContent[] {
  if (!content) return []
  return content.type === 'doc' ? content.content ?? [] : [content]
}

export function displayMathLatexInBlock(block: LociBlock): string | null {
  for (const node of blockContentNodes(block.content)) {
    if (node.type !== 'paragraph') continue
    for (const child of node.content ?? []) {
      if (child.type !== 'text') continue
      const mathMark = child.marks?.find((mark) => mark.type === 'lociMathInline')
      if (!mathMark?.attrs?.display) continue
      const latex = mathMark.attrs.latex
      return typeof latex === 'string' && latex.trim() ? latex : (child.text ?? '').trim() || null
    }
  }
  return null
}

export function formatBlockTypeForBlock(block: LociBlock): FormatBlockType | null {
  const contentType = blockTypeForNode(block.content)
  if (
    contentType === 'table' ||
    contentType === 'quote' ||
    contentType === 'image' ||
    contentType === 'checklist' ||
    contentType === 'bulletList' ||
    contentType === 'numberedList' ||
    contentType === 'code' ||
    contentType === 'latex'
  ) return contentType === 'latex' ? 'math' : contentType
  if (
    block.type === 'table' ||
    block.type === 'quote' ||
    block.type === 'image' ||
    block.type === 'checklist' ||
    block.type === 'bulletList' ||
    block.type === 'numberedList' ||
    block.type === 'code'
  ) return block.type
  if (block.type === 'latex' || displayMathLatexInBlock(block)) return 'math'
  return null
}

export function blockDoc(nodes: JSONContent[]): JSONContent {
  return { type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph', content: [] }] }
}

export function createLociBlock(content: JSONContent, type = blockTypeForNode(content)): LociBlock {
  const now = nowIso()
  const id = createId('block')
  let blockContent: JSONContent
  if (content.type === 'doc') {
    const nodes = content.content ?? []
    blockContent = {
      type: 'doc',
      content: nodes.map((node, index) =>
        index === 0 ? withBlockId(cloneTemplateValue(node), id) : cloneTemplateValue(node),
      ),
    }
  } else {
    blockContent = blockDoc([withBlockId(cloneTemplateValue(content), id)])
  }
  return {
    id,
    type,
    content: blockContent,
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeLegacyEditorContent(content: JSONContent): JSONContent {
  const normalizeNode = (node: JSONContent): JSONContent[] => {
    if (!node || typeof node !== 'object') return []
    if (node.type === 'lociFlashcard' || node.type === 'lociCallout') {
      const normalizedChildren = (node.content ?? []).flatMap(normalizeNode)
      return normalizedChildren.length ? normalizedChildren : [paragraphNode(collectText(node))]
    }
    if (node.type === 'lociLatex' || node.type === 'lociMathBlock') {
      const latex = latexDataFromNode(node)
      if (!latex.trim()) return []
      return [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: latex,
          marks: [{ type: 'lociMathInline', attrs: { latex, display: true } }],
        }],
      }]
    }
    const next: JSONContent = { ...node }
    if (node.content) next.content = node.content.flatMap(normalizeNode)
    return [next]
  }

  if (content.type === 'doc') {
    const normalized = (content.content ?? []).flatMap(normalizeNode)
    return { ...content, content: normalized.length ? normalized : [paragraphNode('')] }
  }
  const normalized = normalizeNode(content)
  return normalized.length === 1 ? normalized[0] : blockDoc(normalized)
}

function createBlockFromNode(node: JSONContent, blockId?: string): LociBlock {
  const id = blockId ?? blockIdForNode(node) ?? createId('block')
  const nodeWithId = withBlockId(cloneTemplateValue(node), id)
  const now = nowIso()
  return {
    id,
    type: blockTypeForNode(nodeWithId),
    content: blockDoc([nodeWithId]),
    createdAt: now,
    updatedAt: now,
  }
}

export function paragraphNode(text: string): JSONContent {
  return { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }
}

export function headingOneNode(text: string): JSONContent {
  return { type: 'heading', attrs: { level: 1 }, content: text ? [{ type: 'text', text }] : [] }
}

export function ensureDocumentHeading(content: JSONContent, fallbackTitle: string): { content: JSONContent; changed: boolean } {
  const doc = content?.type === 'doc' ? content : blockDoc([content])
  const nodes = doc.content ?? []
  const firstNode = nodes[0]
  if (firstNode?.type === 'heading' && firstNode.attrs?.level === 1) {
    return { content: doc, changed: false }
  }

  const title = fallbackTitle.trim() || 'Untitled Note'
  return {
    content: {
      ...doc,
      content: [headingOneNode(title), ...nodes],
    },
    changed: true,
  }
}

export function textToEditorContent(text: string): JSONContent {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const content: JSONContent[] = []
  let listItems: JSONContent[] = []
  let listType: 'bulletList' | 'orderedList' | null = null

  const flushList = () => {
    if (!listType || !listItems.length) return
    content.push({ type: listType, content: listItems })
    listItems = []
    listType = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/)
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/)

    if (bulletMatch || orderedMatch) {
      const nextType = bulletMatch ? 'bulletList' : 'orderedList'
      if (listType && listType !== nextType) flushList()
      listType = nextType
      listItems.push({
        type: 'listItem',
        content: [paragraphNode((bulletMatch?.[1] ?? orderedMatch?.[1] ?? '').trim())],
      })
      continue
    }

    flushList()
    content.push(paragraphNode(line.trim()))
  }

  flushList()
  return { type: 'doc', content: content.length ? content : [paragraphNode('')] }
}

export function tableCellNode(text = '', header = false): JSONContent {
  return {
    type: header ? 'tableHeader' : 'tableCell',
    attrs: { colspan: 1, rowspan: 1, colwidth: null },
    content: [paragraphNode(text)],
  }
}

export function tableRowNode(cells: JSONContent[]): JSONContent {
  return { type: 'tableRow', content: cells }
}

export function tableBlockDoc(): JSONContent {
  return blockDoc([{
    type: 'table',
    content: [
      tableRowNode([tableCellNode('Term', true), tableCellNode('Definition', true)]),
      tableRowNode([tableCellNode(''), tableCellNode('')]),
      tableRowNode([tableCellNode(''), tableCellNode('')]),
      tableRowNode([tableCellNode(''), tableCellNode('')]),
    ],
  }])
}

export function tableBlockDocFromData(columns: string[], rows: string[][]): JSONContent {
  const safeColumns = columns.length ? columns : ['Column 1', 'Column 2']
  const normalizedRows = rows.length ? rows : [safeColumns.map(() => '')]
  return blockDoc([{
    type: 'table',
    content: [
      tableRowNode(safeColumns.map((column) => tableCellNode(column, true))),
      ...normalizedRows.map((row) => tableRowNode(safeColumns.map((_, index) => tableCellNode(row[index] ?? '')))),
    ],
  }])
}

export function codeBlockDoc(): JSONContent {
  return blockDoc([{
    type: 'codeBlock',
    attrs: { language: null },
    content: [{ type: 'text', text: 'Write code here' }],
  }])
}

/** Display-mode equation as a normal paragraph with an inline math mark. */
export function displayMathParagraphDoc(latex = '\\frac{a}{b} = c'): JSONContent {
  return blockDoc([{
    type: 'paragraph',
    content: [{
      type: 'text',
      text: latex,
      marks: [{ type: 'lociMathInline', attrs: { latex, display: true } }],
    }],
  }])
}

/** @deprecated Legacy alias — use displayMathParagraphDoc. */
export function latexBlockDoc(latex = '\\frac{a}{b} = c'): JSONContent {
  return displayMathParagraphDoc(latex)
}

export function aiBlockDoc(): JSONContent {
  return blockDoc([{
    type: 'lociAIBlock',
    attrs: createAIBlockAttrs(),
  }])
}

export function quoteAuthorNode(text = 'Author'): JSONContent {
  return {
    type: 'paragraph',
    attrs: { 'data-quote-author': true },
    content: text ? [{ type: 'text', text }] : [],
  }
}

export function quoteBlockDoc(showAuthor = true): JSONContent {
  return blockDoc([{
    type: 'lociQuote',
    content: [
      paragraphNode('Quote'),
      ...(showAuthor ? [quoteAuthorNode()] : []),
    ],
  }])
}

export function quoteBlockDocFromData(quote: string, author?: string): JSONContent {
  return blockDoc([{
    type: 'lociQuote',
    content: [
      paragraphNode(quote || 'Quote'),
      ...(author?.trim() ? [quoteAuthorNode(author.trim())] : []),
    ],
  }])
}

export function clampImageNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, number))
}

export function imageBlockDoc(src: string, width = 78, align: ImageAlignPreset = 'center'): JSONContent {
  return blockDoc([{
    type: 'image',
    attrs: {
      src,
      width: clampImageNumber(width, 25, 100, 78),
      align,
      cropMode: 'contain',
      aspect: 'auto',
      offsetX: 50,
      offsetY: 50,
      zoom: 100,
    },
  }])
}

export function tableDataFromNode(node: JSONContent): { columns: string[]; rows: string[][] } {
  const rows = (node.content ?? []).filter((row) => row.type === 'tableRow')
  const cells = rows.map((row) => (row.content ?? []).map((cell) => collectText(cell).trim()))
  return { columns: cells[0] ?? [], rows: cells.slice(1) }
}

export function listDataFromNode(node: JSONContent): { listType: ListBlockType; items: string[] } {
  const listType: ListBlockType =
    node.type === 'taskList' ? 'checklist' : node.type === 'orderedList' ? 'numberedList' : 'bulletList'
  const items = (node.content ?? [])
    .filter((item) => item.type === 'listItem' || item.type === 'taskItem')
    .map((item) => collectText(item).trim())
  return { listType, items }
}

export function listBlockDocFromData(listType: ListBlockType, items: string[]): JSONContent {
  const safeItems = items.length ? items : ['List item']
  if (listType === 'checklist') {
    return blockDoc([{
      type: 'taskList',
      content: safeItems.map((item) => ({
        type: 'taskItem',
        attrs: { checked: false },
        content: [paragraphNode(item)],
      })),
    }])
  }
  const type = listType === 'numberedList' ? 'orderedList' : 'bulletList'
  return blockDoc([{
    type,
    content: safeItems.map((item) => ({
      type: 'listItem',
      content: [paragraphNode(item)],
    })),
  }])
}

export function codeDataFromNode(node: JSONContent): string {
  return (node.content ?? []).map((child) => child.text ?? collectText(child)).join('\n').trim()
}

export function codeBlockDocFromData(code: string): JSONContent {
  return blockDoc([{
    type: 'codeBlock',
    attrs: { language: null },
    content: code ? [{ type: 'text', text: code }] : [],
  }])
}

export function latexDataFromNode(node: JSONContent): string {
  const attrLatex = node.attrs?.latex
  return typeof attrLatex === 'string' ? attrLatex : collectText(node)
}

export function quoteDataFromNode(node: JSONContent): { quote: string; author?: string } {
  const parts = node.content ?? []
  const authorNode = parts.find((part) => part.attrs?.['data-quote-author'])
  const quoteNodes = parts.filter((part) => part !== authorNode)
  return {
    quote: collectText({ type: 'doc', content: quoteNodes }).trim(),
    author: authorNode ? collectText(authorNode).trim() : undefined,
  }
}

export function blocksFromContent(content?: JSONContent): LociBlock[] {
  const seeded = ensureDocumentBlockIds(content)
  const nodes = seeded.type === 'doc' ? seeded.content ?? [] : []
  const sourceNodes = nodes.length ? nodes : [{ type: 'paragraph', content: [] }]
  return sourceNodes.map((node) => createBlockFromNode(cloneTemplateValue(node), blockIdForNode(node)))
}

export function contentFromBlocks(blocks?: LociBlock[]): JSONContent {
  if (!blocks?.length) return blankDoc()
  return {
    type: 'doc',
    content: blocks.flatMap((block) => {
      const nodes = blockContentNodes(block.content)
      return nodes.map((node, index) => {
        const cloned = cloneTemplateValue(node)
        return index === 0 ? withBlockId(cloned, block.id) : cloned
      })
    }),
  }
}

export function flattenLegacyLociBlocks(blocks?: LegacyLociBlock[]): LociBlock[] {
  if (!blocks?.length) return []
  return blocks.flatMap((block) => [
    stripLegacyBlockChildren(block),
    ...flattenLegacyLociBlocks(block.children),
  ])
}

function stripLegacyBlockChildren(block: LegacyLociBlock): LociBlock {
  if (!block.children?.length) return block
  const flatBlock = { ...block }
  delete flatBlock.children
  return flatBlock
}

export function normalizeBlocksForContent(content: JSONContent, blocks?: LociBlock[], _activeIndex = -1): LociBlock[] {
  const seeded = ensureDocumentBlockIds(content, blocks)
  const sourceNodes = seeded.type === 'doc' ? seeded.content ?? [] : []
  const nodes = sourceNodes.length ? sourceNodes : [{ type: 'paragraph', content: [] }]
  const now = nowIso()
  const reusableById = new Map(
    flattenLegacyLociBlocks(blocks as LegacyLociBlock[] | undefined).map((block) => [block.id, block]),
  )

  if (!reusableById.size) {
    return nodes.map((node) => createBlockFromNode(cloneTemplateValue(node), blockIdForNode(node)))
  }

  return nodes.map((node) => {
    const clonedNode = cloneTemplateValue(node)
    const blockId = blockIdForNode(clonedNode) ?? createId('block')
    const nodeWithId = blockIdForNode(clonedNode) ? clonedNode : withBlockId(clonedNode, blockId)
    const reusable = reusableById.get(blockId)
    if (!reusable) return createBlockFromNode(nodeWithId, blockId)
    if (blocksMatchStoredContent(reusable, nodeWithId)) return reusable
    return {
      ...reusable,
      type: blockTypeForNode(nodeWithId),
      content: blockDoc([nodeWithId]),
      updatedAt: now,
    }
  })
}

export function headingBlockDoc(level: 1 | 2 | 3): JSONContent {
  return blockDoc([{ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'Heading' }] }])
}

export function blankBlockNode(type: LociBlockType): JSONContent {
  if (type === 'heading') return headingBlockDoc(2)
  if (type === 'checklist') {
    return blockDoc([{
      type: 'taskList',
      content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task' }] }] }],
    }])
  }
  if (type === 'table') return tableBlockDoc()
  if (type === 'bulletList') return listBlockDocFromData('bulletList', ['List item'])
  if (type === 'numberedList') return listBlockDocFromData('numberedList', ['List item'])
  if (type === 'quote') return quoteBlockDoc()
  if (type === 'code') return codeBlockDoc()
  if (type === 'latex') return displayMathParagraphDoc()
  if (type === 'aiBlock') return aiBlockDoc()
  if (type === 'divider') return blockDoc([{ type: 'horizontalRule' }])
  return blockDoc([{ type: 'paragraph', content: [] }])
}

export function createTemplateBlocks(content: JSONContent) {
  return blocksFromContent(content)
}

export function stripAtomMarks(content: JSONContent, atomIds: Set<string>): JSONContent {
  const next: JSONContent = { ...content }
  if (content.marks) {
    const marks = content.marks.filter((mark) => mark.type !== 'atom' || !atomIds.has(String(mark.attrs?.atomId ?? '')))
    if (marks.length) next.marks = marks
    else delete next.marks
  }
  if (content.content) {
    next.content = content.content.map((child) => stripAtomMarks(child, atomIds))
  }
  return next
}

export function collectInlinePlain(node: JSONContent): string {
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'image') return ''
  if (node.text) return node.text
  return (node.content ?? []).map(collectInlinePlain).join('')
}

export function normalizePreviewChunk(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

/** TipTap-aware excerpt: one line per block / list row for dashboard previews. */
export function collectNotePreviewLines(content: JSONContent | undefined | null, maxLines: number): string[] {
  if (!content) return []

  const lines: string[] = []

  function push(raw: string) {
    const t = normalizePreviewChunk(raw)
    if (!t || lines.length >= maxLines) return
    lines.push(t)
  }

  function walkList(list: JSONContent, ordered: boolean) {
    let n = 0
    for (const item of list.content ?? []) {
      if (item.type !== 'listItem') continue
      n += 1
      const bullet = ordered ? `${n}.` : '•'
      walkListItem(item, bullet)
      if (lines.length >= maxLines) return
    }
  }

  function walkListItem(item: JSONContent, bullet: string) {
    let first = true
    for (const child of item.content ?? []) {
      if (lines.length >= maxLines) return
      const ct = child.type ?? 'paragraph'
      if (ct === 'paragraph' || ct === 'heading') {
        for (const part of splitInlineLines(collectInlinePlain(child))) {
          for (const seg of segmentDensePreviewLine(part)) {
            if (!normalizePreviewChunk(seg)) continue
            push(first ? `${bullet} ${seg}` : `  ${seg}`)
            first = false
            if (lines.length >= maxLines) return
          }
        }
      } else if (ct === 'bulletList') {
        walkList(child, false)
      } else if (ct === 'orderedList') {
        walkList(child, true)
      }
    }
  }

  function walk(node: JSONContent) {
    if (lines.length >= maxLines) return
    const type = node.type ?? 'doc'
    if (type === 'doc') {
      for (const child of node.content ?? []) walk(child)
      return
    }
    if (type === 'paragraph' || type === 'heading') {
      for (const part of splitInlineLines(collectInlinePlain(node))) {
        for (const seg of segmentDensePreviewLine(part)) {
          push(seg)
        }
      }
      return
    }
    if (type === 'blockquote') {
      for (const child of node.content ?? []) walk(child)
      return
    }
    if (type === 'lociQuote') {
      for (const child of node.content ?? []) walk(child)
      return
    }
    if (type === 'bulletList') {
      walkList(node, false)
      return
    }
    if (type === 'orderedList') {
      walkList(node, true)
      return
    }
    if (type === 'codeBlock') {
      const code = normalizePreviewChunk(collectInlinePlain(node))
      if (code) push(code)
      return
    }
    if (type === 'lociAIBlock') {
      push(aiBlockPreview(node.attrs))
    }
  }

  walk(content)
  return lines
}

export function splitInlineLines(text: string) {
  return text.split('\n').map(normalizePreviewChunk).filter(Boolean)
}

/** Improves single-block notes: pull leading ISO dates and task markers onto their own lines. */
export function segmentDensePreviewLine(line: string): string[] {
  const t = normalizePreviewChunk(line)
  if (!t) return []

  const chunks: string[] = []
  let rest = t

  const dateHead = /^(\d{4}-\d{2}-\d{2})\b\s*/
  const dm = rest.match(dateHead)
  if (dm) {
    chunks.push(dm[1])
    rest = rest.slice(dm[0].length).trim()
  }

  if (!rest) return chunks

  if (/\[\s*[xX_]?\s*\]/.test(rest)) {
    const taskParts = rest.split(/\s+(?=\[\s*[xX_]?\s*\])/).map(normalizePreviewChunk).filter(Boolean)
    if (taskParts.length > 1) {
      chunks.push(...taskParts)
      return chunks
    }
  }

  const wide = rest.split(/\s{2,}/).map(normalizePreviewChunk).filter(Boolean)
  if (wide.length > 1) {
    chunks.push(...wide)
    return chunks
  }

  chunks.push(rest)
  return chunks
}

