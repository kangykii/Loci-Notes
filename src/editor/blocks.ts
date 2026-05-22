import { createId, nowIso } from '../db'
import type { Atom, JSONContent, LociBlock, LociBlockType } from '../db'

export type ImageAlignPreset = 'left' | 'center' | 'right'
export type ListBlockType = 'checklist' | 'bulletList' | 'numberedList'
export type FormatBlockType = 'table' | 'quote' | 'image' | 'checklist' | 'bulletList' | 'numberedList' | 'code' | 'latex'

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

export function blockTypeForNode(node: JSONContent): LociBlockType {
  if (node.type === 'doc') return blockTypeForNode(node.content?.[0] ?? { type: 'paragraph' })
  if (node.type === 'heading') return 'heading'
  if (node.type === 'taskList') return 'checklist'
  if (node.type === 'table') return 'table'
  if (node.type === 'lociQuote') return 'quote'
  if (node.type === 'bulletList') return 'bulletList'
  if (node.type === 'orderedList') return 'numberedList'
  if (node.type === 'blockquote') return 'quote'
  if (node.type === 'image') return 'image'
  if (node.type === 'codeBlock') return 'code'
  if (node.type === 'lociLatex') return 'latex'
  if (node.type === 'horizontalRule') return 'divider'
  return 'paragraph'
}

export function blockContentNodes(content?: JSONContent): JSONContent[] {
  if (!content) return []
  return content.type === 'doc' ? content.content ?? [] : [content]
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
  ) return contentType
  if (
    block.type === 'table' ||
    block.type === 'quote' ||
    block.type === 'image' ||
    block.type === 'checklist' ||
    block.type === 'bulletList' ||
    block.type === 'numberedList' ||
    block.type === 'code' ||
    block.type === 'latex'
  ) return block.type
  return null
}

export function blockDoc(nodes: JSONContent[]): JSONContent {
  return { type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph', content: [] }] }
}

export function createLociBlock(content: JSONContent, type = blockTypeForNode(content)): LociBlock {
  const now = nowIso()
  return {
    id: createId('block'),
    type,
    content: content.type === 'doc' ? cloneTemplateValue(content) : blockDoc([cloneTemplateValue(content)]),
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

function createBlockFromNode(node: JSONContent): LociBlock {
  return createLociBlock(blockDoc([node]), blockTypeForNode(node))
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

export function latexBlockDoc(latex = '\\frac{a}{b} = c'): JSONContent {
  return blockDoc([{
    type: 'lociLatex',
    attrs: { latex },
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

export function collectText(content: JSONContent): string {
  if (!content || typeof content !== 'object') return ''
  if (content.text) return content.text
  return (content.content ?? []).map(collectText).join(' ').replace(/\s+/g, ' ').trim()
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
  const nodes = content?.type === 'doc' ? content.content ?? [] : []
  const sourceNodes = nodes.length ? nodes : [{ type: 'paragraph', content: [] }]
  return sourceNodes.map((node) => createBlockFromNode(cloneTemplateValue(node)))
}

export function contentFromBlocks(blocks?: LociBlock[]): JSONContent {
  if (!blocks?.length) return blankDoc()
  return {
    type: 'doc',
    content: blocks.flatMap((block) => cloneTemplateValue(blockContentNodes(block.content))),
  }
}

type LegacyLociBlock = LociBlock & {
  children?: LegacyLociBlock[]
}

export function flattenLegacyLociBlocks(blocks?: LegacyLociBlock[]): LociBlock[] {
  if (!blocks?.length) return []
  return blocks.flatMap((block) => [
    stripLegacyBlockChildren(block),
    ...flattenLegacyLociBlocks(block.children),
  ])
}

function stripLegacyBlockChildren(block: LegacyLociBlock): LociBlock {
  const flatBlock = { ...block }
  delete flatBlock.children
  return flatBlock
}

export function normalizeBlocksForContent(content: JSONContent, blocks?: LociBlock[], activeIndex = -1): LociBlock[] {
  const nodes = content?.type === 'doc' ? content.content ?? [] : []
  const now = nowIso()
  const sourceNodes = nodes.length ? nodes : [{ type: 'paragraph', content: [] }]
  const reusableBlocks = flattenLegacyLociBlocks(blocks as LegacyLociBlock[] | undefined)
  if (!reusableBlocks.length) return sourceNodes.map((node) => createBlockFromNode(cloneTemplateValue(node)))

  if (sourceNodes.length === reusableBlocks.length) {
    return sourceNodes.map((node, index) => {
      const clonedNode = cloneTemplateValue(node)
      return {
        ...reusableBlocks[index],
        type: blockTypeForNode(clonedNode),
        content: blockDoc([clonedNode]),
        updatedAt: now,
      }
    })
  }

  const isInsertion = sourceNodes.length > reusableBlocks.length
  const isRemoval = sourceNodes.length < reusableBlocks.length
  const countDelta = sourceNodes.length - reusableBlocks.length
  const changedIndex = activeIndex >= 0
    ? Math.max(0, Math.min(sourceNodes.length - 1, activeIndex))
    : Math.min(sourceNodes.length - 1, reusableBlocks.length - 1)
  const insertedBlockStart = isInsertion ? Math.max(0, changedIndex - countDelta + 1) : -1
  const insertedBlockEnd = isInsertion ? changedIndex : -1
  if (isInsertion && typeof window !== 'undefined' && (window as typeof window & { __LOCI_EDITOR_DEBUG?: boolean }).__LOCI_EDITOR_DEBUG) {
    console.debug('[loci-editor] normalize block count changed', {
      activeIndex,
      insertedBlockStart,
      insertedBlockEnd,
      sourceCount: sourceNodes.length,
      savedCount: reusableBlocks.length,
      savedIds: reusableBlocks.map((block) => block.id),
    })
  }

  const reusableIndexForNode = (index: number) => {
    if (isInsertion && index > insertedBlockEnd) return index - countDelta
    if (isInsertion && index >= insertedBlockStart) return -1
    if (isRemoval && index > changedIndex) return index + (reusableBlocks.length - sourceNodes.length)
    return index
  }

  return sourceNodes.map((node, index) => {
    const clonedNode = cloneTemplateValue(node)
    if (isInsertion && index >= insertedBlockStart && index <= insertedBlockEnd) return createBlockFromNode(clonedNode)

    const reusable = reusableBlocks[reusableIndexForNode(index)]
    if (reusable) {
      return {
        ...reusable,
        type: blockTypeForNode(clonedNode),
        content: blockDoc([clonedNode]),
        updatedAt: now,
      }
    }

    return createBlockFromNode(clonedNode)
  })
}

export function blankBlockNode(type: LociBlockType): JSONContent {
  if (type === 'heading') return blockDoc([{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] }])
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
  if (type === 'latex') return latexBlockDoc()
  if (type === 'divider') return blockDoc([{ type: 'horizontalRule' }])
  return blockDoc([{ type: 'paragraph', content: [] }])
}

export function createTemplateBlocks(content: JSONContent) {
  return blocksFromContent(content)
}

export function contentHasAtom(content: JSONContent, atomId: string): boolean {
  if (content.attrs?.atomId === atomId) return true
  if (content.marks?.some((mark) => mark.type === 'atom' && mark.attrs?.atomId === atomId)) return true
  return (content.content ?? []).some((child) => contentHasAtom(child, atomId))
}

export function collectAtomIds(content: JSONContent): string[] {
  if (!content || typeof content !== 'object') return []
  const attrAtomId = typeof content.attrs?.atomId === 'string' ? [content.attrs.atomId] : []
  const own = (content.marks ?? [])
    .filter((mark) => mark.type === 'atom' && typeof mark.attrs?.atomId === 'string')
    .map((mark) => mark.attrs?.atomId as string)
  return [...attrAtomId, ...own, ...(content.content ?? []).flatMap(collectAtomIds)]
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

export function remapAtomIds(content: JSONContent, atomIdMap: Map<string, string>): JSONContent {
  const next: JSONContent = { ...content }
  if (content.attrs && typeof content.attrs.atomId === 'string') {
    const mappedAtomId = atomIdMap.get(content.attrs.atomId)
    if (mappedAtomId) next.attrs = { ...content.attrs, atomId: mappedAtomId }
  }
  if (content.marks) {
    next.marks = content.marks.map((mark) => {
      if (mark.type !== 'atom' || typeof mark.attrs?.atomId !== 'string') return mark
      const mappedAtomId = atomIdMap.get(mark.attrs.atomId)
      return mappedAtomId ? { ...mark, attrs: { ...mark.attrs, atomId: mappedAtomId } } : mark
    })
  }
  if (content.content) {
    next.content = content.content.map((child) => remapAtomIds(child, atomIdMap))
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

export function atomMarkFor(atom: Atom) {
  return {
    type: 'atom',
    attrs: { atomId: atom.id, phrase: atom.phrase, definition: atom.definition },
  }
}
