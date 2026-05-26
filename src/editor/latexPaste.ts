import type { MarkType, Node as PMNode, Schema } from '@tiptap/pm/model'
import { Fragment, Slice } from '@tiptap/pm/model'
import {
  isDisplayMathLine,
  segmentsContainMath,
  splitMathInText,
  type MathSegment,
} from './latexDetection'

function createMathMark(
  mathMark: MarkType,
  latex: string,
  display: boolean,
  inheritedMarks: readonly import('@tiptap/pm/model').Mark[],
) {
  return [
    ...inheritedMarks.filter((mark) => mark.type.name !== 'lociMathInline'),
    mathMark.create({ latex, display }),
  ]
}

function createInlineTextNodes(
  schema: Schema,
  segments: MathSegment[],
  inheritedMarks: readonly import('@tiptap/pm/model').Mark[],
  mathMark: MarkType,
): PMNode[] {
  const nodes: PMNode[] = []
  for (const segment of segments) {
    if (segment.kind === 'text') {
      if (segment.value) nodes.push(schema.text(segment.value, inheritedMarks))
      continue
    }
    const display = segment.kind === 'block'
    nodes.push(
      schema.text(segment.value, createMathMark(mathMark, segment.value, display, inheritedMarks)),
    )
  }
  return nodes
}

function createDisplayMathParagraph(schema: Schema, latex: string, attrs?: Record<string, unknown>): PMNode {
  const mathMark = schema.marks.lociMathInline
  if (!mathMark) throw new Error('Inline math mark is missing from schema.')
  return schema.nodes.paragraph.create(
    attrs ?? {},
    schema.text(latex, [mathMark.create({ latex, display: true })]),
  )
}

function transformParagraphNode(node: PMNode, schema: Schema, mathMark: MarkType): PMNode | PMNode[] {
  if (node.childCount !== 1 || !node.firstChild?.isText) return node
  const text = node.firstChild.text ?? ''
  const marks = node.firstChild.marks

  if (text.includes('\n')) {
    const lines = text.split('\n')
    const output: PMNode[] = []
    let proseLines: string[] = []

    const flushProse = () => {
      if (!proseLines.length) return
      const paragraphText = proseLines.join('\n')
      proseLines = []
      const paragraphNode = schema.nodes.paragraph.create(node.attrs, schema.text(paragraphText, marks))
      const transformed = transformParagraphNode(paragraphNode, schema, mathMark)
      if (Array.isArray(transformed)) output.push(...transformed)
      else output.push(transformed)
    }

    for (const line of lines) {
      const displayLatex = isDisplayMathLine(line)
      if (displayLatex) {
        flushProse()
        output.push(createDisplayMathParagraph(schema, displayLatex, node.attrs))
        continue
      }
      proseLines.push(line)
    }
    flushProse()
    if (output.length === 1) return output[0]
    if (output.length > 1) return output
  }

  const displayLatex = isDisplayMathLine(text)
  if (displayLatex) return createDisplayMathParagraph(schema, displayLatex, node.attrs)

  const segments = splitMathInText(text)
  if (!segmentsContainMath(segments)) return node

  return schema.nodes.paragraph.create(
    node.attrs,
    createInlineTextNodes(schema, segments, marks, mathMark),
  )
}

function transformNode(node: PMNode, schema: Schema, mathMark: MarkType): PMNode | PMNode[] {
  if (node.isText) {
    const segments = splitMathInText(node.text ?? '')
    if (!segmentsContainMath(segments)) return node
    const nodes = createInlineTextNodes(schema, segments, node.marks, mathMark)
    return nodes.length === 1 ? nodes[0] : nodes
  }

  if (node.type.name === 'lociLatex' || node.type.name === 'lociMathBlock') {
    const latex = String(node.attrs.latex ?? node.textContent ?? '').trim()
    return latex ? createDisplayMathParagraph(schema, latex) : []
  }

  if (node.type.name === 'paragraph') {
    const transformed = transformParagraphNode(node, schema, mathMark)
    if (transformed !== node) return transformed
  }

  if (!node.content.size) return node
  const children: PMNode[] = []
  node.content.forEach((child) => {
    const next = transformNode(child, schema, mathMark)
    if (Array.isArray(next)) children.push(...next)
    else children.push(next)
  })
  return node.copy(Fragment.fromArray(children))
}

function transformFragment(fragment: Fragment, schema: Schema, mathMark: MarkType): Fragment {
  const nodes: PMNode[] = []
  fragment.forEach((child) => {
    const next = transformNode(child, schema, mathMark)
    if (Array.isArray(next)) nodes.push(...next)
    else nodes.push(next)
  })
  return Fragment.fromArray(nodes)
}

export function transformPastedMathSlice(slice: Slice, schema: Schema): Slice {
  const mathMark = schema.marks.lociMathInline
  if (!mathMark) return slice
  const content = transformFragment(slice.content, schema, mathMark)
  return new Slice(content, slice.openStart, slice.openEnd)
}
