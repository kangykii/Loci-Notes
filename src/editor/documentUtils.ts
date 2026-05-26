import type { Atom, JSONContent, LociBlockType } from '../db'

export const LOCI_BLOCK_ID_ATTR = 'lociBlockId'

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
  if (node.type === 'lociLatex' || node.type === 'lociMathBlock') return 'paragraph'
  if (node.type === 'lociAIBlock') return 'aiBlock'
  if (node.type === 'horizontalRule') return 'divider'
  return 'paragraph'
}

export function collectText(content: JSONContent): string {
  if (!content || typeof content !== 'object') return ''
  if (content.text) return content.text
  return (content.content ?? []).map(collectText).join(' ').replace(/\s+/g, ' ').trim()
}

export function remapAtomIds(content: JSONContent, atomIdMap: Map<string, string>): JSONContent {
  if (!content || typeof content !== 'object') return { type: 'doc', content: [] }
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

export function atomMarkFor(atom: Atom) {
  return {
    type: 'atom',
    attrs: { atomId: atom.id, phrase: atom.phrase, definition: atom.definition },
  }
}

export function contentHasAtom(content: JSONContent, atomId: string): boolean {
  if (!content || typeof content !== 'object') return false
  if (content.attrs?.atomId === atomId) return true
  if (content.marks?.some((mark) => mark.type === 'atom' && mark.attrs?.atomId === atomId)) return true
  return (content.content ?? []).some((child) => contentHasAtom(child, atomId))
}

export function collectAtomIds(content: JSONContent): string[] {
  if (!content || typeof content !== 'object') return []
  const attrAtomId = typeof content.attrs?.atomId === 'string' ? [content.attrs.atomId] : []
  const markAtomIds = (content.marks ?? [])
    .filter((mark) => mark.type === 'atom' && typeof mark.attrs?.atomId === 'string')
    .map((mark) => mark.attrs?.atomId as string)
  return [...attrAtomId, ...markAtomIds, ...(content.content ?? []).flatMap(collectAtomIds)]
}
