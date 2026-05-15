import { createId, nowIso } from '../db'
import type { Atom, JSONContent, LociBlock, LociBlockType } from '../db'

export type ImageAlignPreset = 'left' | 'center' | 'right'
export type FormatBlockType = 'table' | 'quote' | 'image'

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
  if (node.type === 'lociFlashcard') return 'flashcard'
  if (node.type === 'lociQuote') return 'quote'
  if (node.type === 'bulletList') return 'bulletList'
  if (node.type === 'orderedList') return 'numberedList'
  if (node.type === 'blockquote') return 'quote'
  if (node.type === 'image') return 'image'
  if (node.type === 'horizontalRule') return 'divider'
  if (node.type === 'lociCallout') return 'callout'
  return 'paragraph'
}

export function blockContentNodes(content?: JSONContent): JSONContent[] {
  if (!content) return []
  return content.type === 'doc' ? content.content ?? [] : [content]
}

export function formatBlockTypeForBlock(block: LociBlock): FormatBlockType | null {
  const contentType = blockTypeForNode(block.content)
  if (contentType === 'table' || contentType === 'quote' || contentType === 'image') return contentType
  if (block.type === 'table' || block.type === 'quote' || block.type === 'image') return block.type
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

function createBlockFromNode(node: JSONContent): LociBlock {
  return createLociBlock(blockDoc([node]), blockTypeForNode(node))
}

function sameBlockNode(block: LociBlock, node: JSONContent) {
  const nodes = blockContentNodes(block.content)
  return nodes.length === 1 && JSON.stringify(nodes[0]) === JSON.stringify(node)
}

export function paragraphNode(text: string): JSONContent {
  return { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }
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

export function flashcardBlockDoc(atomId?: string): JSONContent {
  return blockDoc([{
    type: 'lociFlashcard',
    attrs: { atomId: atomId ?? null },
    content: [
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Question' }] },
      paragraphNode('Answer'),
    ],
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
  if (content.text) return content.text
  return (content.content ?? []).map(collectText).join(' ').replace(/\s+/g, ' ').trim()
}

export function tableDataFromNode(node: JSONContent): { columns: string[]; rows: string[][] } {
  const rows = (node.content ?? []).filter((row) => row.type === 'tableRow')
  const cells = rows.map((row) => (row.content ?? []).map((cell) => collectText(cell).trim()))
  return { columns: cells[0] ?? [], rows: cells.slice(1) }
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

export function normalizeBlocksForContent(content: JSONContent, blocks?: LociBlock[], activeIndex = -1): LociBlock[] {
  const nodes = content?.type === 'doc' ? content.content ?? [] : []
  const now = nowIso()
  const sourceNodes = nodes.length ? nodes : [{ type: 'paragraph', content: [] }]
  if (!blocks?.length) return sourceNodes.map((node) => createBlockFromNode(cloneTemplateValue(node)))

  if (sourceNodes.length === blocks.length) {
    return sourceNodes.map((node, index) => {
      const clonedNode = cloneTemplateValue(node)
      return {
        ...blocks[index],
        type: blockTypeForNode(clonedNode),
        content: blockDoc([clonedNode]),
        updatedAt: now,
      }
    })
  }

  const usedBlockIndexes = new Set<number>()
  const takeExactMatch = (node: JSONContent) => {
    const index = blocks.findIndex((block, blockIndex) => !usedBlockIndexes.has(blockIndex) && sameBlockNode(block, node))
    if (index < 0) return null
    usedBlockIndexes.add(index)
    return blocks[index]
  }

  const takeReusableBlock = (preferredIndex: number) => {
    if (preferredIndex >= 0 && preferredIndex < blocks.length && !usedBlockIndexes.has(preferredIndex)) {
      usedBlockIndexes.add(preferredIndex)
      return blocks[preferredIndex]
    }
    const index = blocks.findIndex((_, blockIndex) => !usedBlockIndexes.has(blockIndex))
    if (index < 0) return null
    usedBlockIndexes.add(index)
    return blocks[index]
  }

  const shouldCreateNewBlock = sourceNodes.length > blocks.length && activeIndex >= 0
  return sourceNodes.map((node, index) => {
    const clonedNode = cloneTemplateValue(node)
    const exactMatch = takeExactMatch(node)
    if (exactMatch) {
      return {
        ...exactMatch,
        type: blockTypeForNode(clonedNode),
        content: blockDoc([clonedNode]),
        updatedAt: now,
      }
    }

    if (shouldCreateNewBlock && index !== activeIndex) return createBlockFromNode(clonedNode)

    const reusable = takeReusableBlock(index)
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
  if (type === 'flashcard') return flashcardBlockDoc()
  if (type === 'bulletList') return blockDoc([{ type: 'bulletList', content: [{ type: 'listItem', content: [paragraphNode('List item')] }] }])
  if (type === 'numberedList') return blockDoc([{ type: 'orderedList', content: [{ type: 'listItem', content: [paragraphNode('List item')] }] }])
  if (type === 'quote') return quoteBlockDoc()
  if (type === 'divider') return blockDoc([{ type: 'horizontalRule' }])
  if (type === 'callout') return blockDoc([{ type: 'blockquote', content: [paragraphNode('Callout')] }])
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

export function flashcardsFromContent(content: JSONContent): Array<{ atomId: string; phrase: string; definition: string }> {
  const cards: Array<{ atomId: string; phrase: string; definition: string }> = []
  const visit = (node: JSONContent) => {
    if (node.type === 'lociFlashcard' && typeof node.attrs?.atomId === 'string') {
      const parts = node.content ?? []
      const phrase = collectText(parts[0] ?? { type: 'paragraph' }).trim()
      const definition = collectText({ type: 'doc', content: parts.slice(1) }).trim()
      if (phrase && definition) cards.push({ atomId: node.attrs.atomId, phrase, definition })
      return
    }
    ;(node.content ?? []).forEach(visit)
  }
  visit(content)
  return cards
}

export function atomMarkFor(atom: Atom) {
  return {
    type: 'atom',
    attrs: { atomId: atom.id, phrase: atom.phrase, definition: atom.definition },
  }
}
