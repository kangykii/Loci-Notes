import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'

type JSONContent = {
  type?: string
  attrs?: Record<string, unknown>
  content?: JSONContent[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
  [key: string]: unknown
}

type Atom = {
  id: string
  phrase: string
  definition: string
}

type NoteTemplateData =
  | { kind: 'blank'; body: JSONContent }
  | {
      kind: 'report'
      subtitle: string
      summary: string
      findings: string
      recommendations: string
      appendix: JSONContent
    }
  | {
      kind: 'planner'
      date: string
      priorities: string[]
      tasks: Array<{ id: string; text: string; done: boolean }>
      schedule: Array<{ id: string; time: string; text: string }>
      notes: JSONContent
    }
  | {
      kind: 'slideshow'
      activeSlideId: string
      slides: Array<{ id: string; title: string; body: JSONContent; speakerNotes: string }>
    }

type Note = {
  title: string
  content: JSONContent
  templateId?: string
  templateData?: NoteTemplateData
}

type Project = {
  name: string
}

type PdfSegment = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

type PdfTextOptions = {
  fontSize: number
  lineHeight: number
  gapAfter: number
  indent?: number
  bullet?: string
  muted?: boolean
}

const fileSafe = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'note'

export async function exportNotePdf(note: Note, project: Project | undefined) {
  const templateId = note.templateId ?? 'blank'
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const margin = 18
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - margin * 2
  let y = 22

  const ensurePage = (height: number) => {
    if (y + height <= pageHeight - margin) return
    pdf.addPage()
    y = margin
  }

  const setFont = (segment: PdfSegment, fontSize: number) => {
    const style = segment.bold && segment.italic ? 'bolditalic' : segment.bold ? 'bold' : segment.italic ? 'italic' : 'normal'
    pdf.setFont('helvetica', style)
    pdf.setFontSize(fontSize)
  }

  const drawLine = (segments: PdfSegment[], x: number, baseline: number, fontSize: number, muted = false) => {
    let cursor = x
    pdf.setTextColor(muted ? 118 : 34, muted ? 116 : 34, muted ? 111 : 34)
    segments.forEach((segment) => {
      setFont(segment, fontSize)
      pdf.text(segment.text, cursor, baseline)
      const width = pdf.getTextWidth(segment.text)
      if (segment.underline) {
        pdf.setDrawColor(90, 90, 90)
        pdf.setLineWidth(0.2)
        pdf.line(cursor, baseline + 1.2, cursor + width, baseline + 1.2)
      }
      cursor += width
    })
  }

  const splitLongToken = (segment: PdfSegment, maxWidth: number, fontSize: number) => {
    setFont(segment, fontSize)
    if (pdf.getTextWidth(segment.text) <= maxWidth) return [segment]
    const parts: PdfSegment[] = []
    let part = ''
    for (const char of segment.text) {
      const next = `${part}${char}`
      if (part && pdf.getTextWidth(next) > maxWidth) {
        parts.push({ ...segment, text: part })
        part = char
      } else {
        part = next
      }
    }
    if (part) parts.push({ ...segment, text: part })
    return parts
  }

  const segmentTokens = (segments: PdfSegment[], maxWidth: number, fontSize: number) =>
    segments.flatMap((segment) => {
      setFont(segment, fontSize)
      const pieces = segment.text.match(/\S+\s*|\s+/g) ?? ['']
      return pieces.flatMap((text) => splitLongToken({ ...segment, text }, maxWidth, fontSize))
    })

  const renderSegments = (segments: PdfSegment[], options: PdfTextOptions) => {
    const indent = options.indent ?? 0
    const x = margin + indent
    const width = contentWidth - indent
    const tokens = segmentTokens(segments.length ? segments : [{ text: '' }], width, options.fontSize)
    const lines: PdfSegment[][] = []
    let current: PdfSegment[] = []
    let currentWidth = 0

    tokens.forEach((token) => {
      if (token.text.includes('\n')) {
        token.text.split('\n').forEach((part, index) => {
          if (index > 0) {
            lines.push(current)
            current = []
            currentWidth = 0
          }
          if (!part) return
          const next = { ...token, text: part }
          setFont(next, options.fontSize)
          const tokenWidth = pdf.getTextWidth(next.text)
          current.push(next)
          currentWidth += tokenWidth
        })
        return
      }

      setFont(token, options.fontSize)
      const tokenWidth = pdf.getTextWidth(token.text)
      if (current.length && currentWidth + tokenWidth > width) {
        lines.push(current)
        current = []
        currentWidth = 0
      }
      current.push(token)
      currentWidth += tokenWidth
    })

    if (current.length) lines.push(current)
    if (!lines.length) lines.push([{ text: '' }])

    lines.forEach((line, index) => {
      ensurePage(options.lineHeight)
      if (options.bullet && index === 0) {
        pdf.setTextColor(34, 34, 34)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(options.fontSize)
        pdf.text(options.bullet, margin, y)
      }
      drawLine(line, x, y, options.fontSize, options.muted)
      y += options.lineHeight
    })
    y += options.gapAfter
  }

  const renderImage = (node: JSONContent) => {
    const src = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
    if (!src) return
    if (!src.startsWith('data:image/')) {
      renderSegments([{ text: '[Image]' }], { fontSize: 10, lineHeight: 5, gapAfter: 4, muted: true })
      return
    }

    try {
      const imageWidth = Math.min(contentWidth, Number(node.attrs?.width) || 120)
      const imageHeight = Math.min(80, Number(node.attrs?.height) || imageWidth * 0.56)
      ensurePage(imageHeight + 6)
      const format = src.includes('image/png') ? 'PNG' : src.includes('image/webp') ? 'WEBP' : 'JPEG'
      pdf.addImage(src, format, margin, y, imageWidth, imageHeight)
      y += imageHeight + 6
    } catch {
      renderSegments([{ text: '[Image could not be embedded]' }], { fontSize: 10, lineHeight: 5, gapAfter: 4, muted: true })
    }
  }

  const renderCodeNode = (node: JSONContent) => {
    const rawLines = collectCodeText(node).replace(/\r\n?/g, '\n').split('\n')
    const lines = rawLines.length ? rawLines : ['']
    const fontSize = 9.5
    const lineHeight = 5.4
    const padX = 4
    const textX = margin + padX
    const codeWidth = contentWidth - padX * 2

    y += 1
    lines.forEach((line) => {
      pdf.setFont('courier', 'normal')
      pdf.setFontSize(fontSize)
      const wrapped = pdf.splitTextToSize(line || ' ', codeWidth) as string[]
      ;(wrapped.length ? wrapped : ['']).forEach((part) => {
        ensurePage(lineHeight)
        pdf.setDrawColor(228, 224, 216)
        pdf.setFillColor(247, 246, 242)
        pdf.rect(margin, y, contentWidth, lineHeight, 'FD')
        pdf.setTextColor(36, 35, 33)
        pdf.setFont('courier', 'normal')
        pdf.setFontSize(fontSize)
        pdf.text(part, textX, y + 3.8)
        y += lineHeight
      })
    })
    y += 5
  }

  const renderNode = (node: JSONContent, list?: { type: 'bullet' | 'ordered'; index: number }) => {
    if (node.type === 'heading') {
      const level = Number(node.attrs?.level) || 2
      renderSegments(inlineSegments(node).map((segment) => ({ ...segment, bold: true })), {
        fontSize: level === 1 ? 18 : 15,
        lineHeight: level === 1 ? 8 : 7,
        gapAfter: 4,
      })
      return
    }

    if (node.type === 'paragraph') {
      renderSegments(inlineSegments(node), { fontSize: 11.5, lineHeight: 6.2, gapAfter: 3 })
      return
    }

    if (node.type === 'table') {
      renderTableNode(node)
      return
    }

    if (node.type === 'taskList') {
      ;(node.content ?? []).forEach((item) => renderNode(item))
      y += 2
      return
    }

    if (node.type === 'taskItem') {
      const checked = node.attrs?.checked === true
      renderSegments(inlineSegments(node), { fontSize: 11.5, lineHeight: 6.2, gapAfter: 2, indent: 8, bullet: checked ? '[x]' : '[ ]' })
      return
    }

    if (node.type === 'lociFlashcard') {
      renderSegments([{ text: 'Flashcard', bold: true }], { fontSize: 13, lineHeight: 6, gapAfter: 2 })
      ;(node.content ?? []).forEach((child) => renderNode(child))
      y += 2
      return
    }

    if (node.type === 'lociQuote' || node.type === 'blockquote') {
      const [quote, author] = node.content ?? []
      renderSegments(inlineSegments(quote ?? node).map((segment) => ({ ...segment, italic: true })), { fontSize: 12.5, lineHeight: 6.8, gapAfter: 2, indent: 6 })
      if (author && collectText(author).trim()) {
        renderSegments([{ text: collectText(author).trim(), bold: true }], { fontSize: 10.5, lineHeight: 5.5, gapAfter: 5, indent: 6 })
      }
      return
    }

    if (node.type === 'codeBlock') {
      renderCodeNode(node)
      return
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      ;(node.content ?? []).forEach((item, index) => {
        renderNode(item, { type: node.type === 'orderedList' ? 'ordered' : 'bullet', index: index + 1 })
      })
      y += 2
      return
    }

    if (node.type === 'listItem') {
      const bullet = list?.type === 'ordered' ? `${list.index}.` : '-'
      renderSegments(inlineSegments(node), { fontSize: 11.5, lineHeight: 6.2, gapAfter: 2, indent: 8, bullet })
      return
    }

    if (node.type === 'image') {
      renderImage(node)
      return
    }

    ;(node.content ?? []).forEach((child) => renderNode(child))
  }

  const renderTableNode = (node: JSONContent) => {
    const rows = tableRows(node)
    if (!rows.length) return
    const columnCount = Math.max(...rows.map((row) => row.length))
    const cellWidth = contentWidth / Math.max(1, columnCount)
    rows.forEach((row, rowIndex) => {
      const rowLines = row.map((cell) => pdf.splitTextToSize(cell, cellWidth - 4) as string[])
      const rowHeight = Math.max(8, ...rowLines.map((lines) => lines.length * 5 + 4))
      ensurePage(rowHeight)
      rowLines.forEach((lines, cellIndex) => {
        const x = margin + cellIndex * cellWidth
        pdf.setDrawColor(218, 214, 205)
        pdf.setFillColor(rowIndex === 0 ? 247 : 255, rowIndex === 0 ? 245 : 255, rowIndex === 0 ? 240 : 255)
        pdf.rect(x, y, cellWidth, rowHeight, 'FD')
        pdf.setFont('helvetica', rowIndex === 0 ? 'bold' : 'normal')
        pdf.setFontSize(9.5)
        pdf.setTextColor(34, 34, 34)
        pdf.text(lines.length ? lines : [''], x + 2, y + 5)
      })
      y += rowHeight
    })
    y += 5
  }

  renderSegments([{ text: note.title, bold: true }], { fontSize: 22, lineHeight: 10, gapAfter: 5 })
  renderSegments([{ text: `${project?.name ?? 'Unassigned'} · ${templateLabel(templateId)}` }], {
    fontSize: 9.5,
    lineHeight: 5,
    gapAfter: 10,
    muted: true,
  })

  const data = note.templateData
  if (data?.kind === 'report') {
    renderSegments([{ text: data.subtitle, italic: true }], { fontSize: 12, lineHeight: 6, gapAfter: 6, muted: true })
    renderSegments([{ text: 'Executive Summary', bold: true }], { fontSize: 15, lineHeight: 7, gapAfter: 2 })
    renderSegments([{ text: data.summary }], { fontSize: 11.5, lineHeight: 6.2, gapAfter: 5 })
    renderSegments([{ text: 'Findings', bold: true }], { fontSize: 15, lineHeight: 7, gapAfter: 2 })
    renderSegments([{ text: data.findings }], { fontSize: 11.5, lineHeight: 6.2, gapAfter: 5 })
    renderSegments([{ text: 'Recommendations', bold: true }], { fontSize: 15, lineHeight: 7, gapAfter: 2 })
    renderSegments([{ text: data.recommendations }], { fontSize: 11.5, lineHeight: 6.2, gapAfter: 6 })
    ;(data.appendix.content ?? []).forEach((node) => renderNode(node))
  } else if (data?.kind === 'planner') {
    renderSegments([{ text: data.date || 'Planner', bold: true }], { fontSize: 15, lineHeight: 7, gapAfter: 4 })
    renderSegments([{ text: 'Priorities', bold: true }], { fontSize: 13, lineHeight: 6, gapAfter: 1 })
    data.priorities.filter(Boolean).forEach((priority) => renderSegments([{ text: priority }], { fontSize: 11.5, lineHeight: 6.2, gapAfter: 1, indent: 7, bullet: '-' }))
    renderSegments([{ text: 'Tasks', bold: true }], { fontSize: 13, lineHeight: 6, gapAfter: 1 })
    data.tasks.forEach((task) => renderSegments([{ text: `${task.done ? '[x]' : '[ ]'} ${task.text}` }], { fontSize: 11.5, lineHeight: 6.2, gapAfter: 1, indent: 7, bullet: '-' }))
    renderSegments([{ text: 'Schedule', bold: true }], { fontSize: 13, lineHeight: 6, gapAfter: 1 })
    data.schedule.forEach((item) => renderSegments([{ text: `${item.time}  ${item.text}` }], { fontSize: 11.5, lineHeight: 6.2, gapAfter: 1 }))
    ;(data.notes.content ?? []).forEach((node) => renderNode(node))
  } else if (data?.kind === 'slideshow') {
    data.slides.forEach((slide, index) => {
      if (index > 0) {
        pdf.addPage()
        y = margin
      }
      renderSegments([{ text: slide.title || `Slide ${index + 1}`, bold: true }], { fontSize: 20, lineHeight: 9, gapAfter: 5 })
      ;(slide.body.content ?? []).forEach((node) => renderNode(node))
      if (slide.speakerNotes.trim()) {
        renderSegments([{ text: 'Speaker notes', bold: true }], { fontSize: 11, lineHeight: 5.5, gapAfter: 1, muted: true })
        renderSegments([{ text: slide.speakerNotes }], { fontSize: 10, lineHeight: 5.2, gapAfter: 2, muted: true })
      }
    })
  } else {
    ;((data?.kind === 'blank' ? data.body.content : note.content.content) ?? []).forEach((node) => renderNode(node))
  }
  pdf.save(`${fileSafe(note.title)}.pdf`)
}

export async function exportNoteDocx(note: Note, project: Project | undefined, atoms: Atom[]) {
  const templateId = note.templateId ?? 'blank'
  const atomDefinitions = atoms.filter((atom) => noteHasAtom(note.content, atom.id))
  const bodyChildren = templateDocxParagraphs(note)
  const children = [
    new Paragraph({
      text: note.title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun({ text: `${project?.name ?? 'Unassigned'} · ${templateLabel(templateId)}`, italics: true })],
    }),
    ...bodyChildren,
  ]

  if (atomDefinitions.length > 0) {
    children.push(
      new Paragraph({ text: 'Atom Definitions', heading: HeadingLevel.HEADING_2 }),
      ...atomDefinitions.map(
        (atom) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${atom.phrase}: `, bold: true }),
              new TextRun(atom.definition),
            ],
          }),
      ),
    )
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${fileSafe(note.title)}.docx`)
}

function inlineSegments(node: JSONContent): PdfSegment[] {
  if (node.text) {
    const marks = node.marks ?? []
    return [
      {
        text: node.text,
        bold: marks.some((mark) => mark.type === 'bold'),
        italic: marks.some((mark) => mark.type === 'italic'),
        underline: marks.some((mark) => mark.type === 'atom' || mark.type === 'link'),
      },
    ]
  }

  if (node.type === 'hardBreak') return [{ text: '\n' }]
  if (node.type === 'image') return []

  return (node.content ?? []).flatMap(inlineSegments)
}

function contentToParagraphs(content: JSONContent): Paragraph[] {
  const nodes = content.content ?? []
  return nodes.flatMap((node) => nodeToParagraph(node))
}

function templateDocxParagraphs(note: Note): Paragraph[] {
  const data = note.templateData
  if (data?.kind === 'report') {
    return [
      new Paragraph({ text: data.subtitle, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_2 }),
      new Paragraph(data.summary),
      new Paragraph({ text: 'Findings', heading: HeadingLevel.HEADING_2 }),
      new Paragraph(data.findings),
      new Paragraph({ text: 'Recommendations', heading: HeadingLevel.HEADING_2 }),
      new Paragraph(data.recommendations),
      ...contentToParagraphs(data.appendix),
    ]
  }
  if (data?.kind === 'planner') {
    return [
      new Paragraph({ text: data.date || 'Planner', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: 'Priorities', heading: HeadingLevel.HEADING_2 }),
      ...data.priorities.filter(Boolean).map((priority) => new Paragraph({ text: `- ${priority}` })),
      new Paragraph({ text: 'Tasks', heading: HeadingLevel.HEADING_2 }),
      ...data.tasks.map((task) => new Paragraph({ text: `- ${task.done ? '[x]' : '[ ]'} ${task.text}` })),
      new Paragraph({ text: 'Schedule', heading: HeadingLevel.HEADING_2 }),
      ...data.schedule.map((item) => new Paragraph({ text: `${item.time}  ${item.text}` })),
      ...contentToParagraphs(data.notes),
    ]
  }
  if (data?.kind === 'slideshow') {
    return data.slides.flatMap((slide, index) => [
      new Paragraph({ text: slide.title || `Slide ${index + 1}`, heading: HeadingLevel.HEADING_1 }),
      ...contentToParagraphs(slide.body),
      ...(slide.speakerNotes.trim()
        ? [
            new Paragraph({ text: 'Speaker notes', heading: HeadingLevel.HEADING_2 }),
            new Paragraph(slide.speakerNotes),
          ]
        : []),
    ])
  }
  return contentToParagraphs(data?.kind === 'blank' ? data.body : note.content)
}

function nodeToParagraph(node: JSONContent): Paragraph[] {
  if (node.type === 'heading') {
    return [
      new Paragraph({
        heading: node.attrs?.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
        children: inlineContent(node),
      }),
    ]
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return (node.content ?? []).flatMap((item) => nodeToParagraph(item))
  }

  if (node.type === 'taskList') {
    return (node.content ?? []).flatMap((item) => nodeToParagraph(item))
  }

  if (node.type === 'listItem') {
    const text = collectText(node)
    return [new Paragraph({ text: `- ${text}` })]
  }

  if (node.type === 'taskItem') {
    const text = collectText(node)
    return [new Paragraph({ text: `${node.attrs?.checked === true ? '[x]' : '[ ]'} ${text}` })]
  }

  if (node.type === 'table') {
    return [
      new Paragraph({ text: 'Table', heading: HeadingLevel.HEADING_2 }),
      ...tableRows(node).map((row) => new Paragraph({ text: row.join(' | ') })),
    ]
  }

  if (node.type === 'lociFlashcard') {
    const [question, ...answerParts] = node.content ?? []
    return [
      new Paragraph({ text: 'Flashcard', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ children: [new TextRun({ text: collectText(question ?? { type: 'paragraph' }), bold: true })] }),
      new Paragraph({ text: answerParts.map(collectText).join(' ').trim() }),
    ]
  }

  if (node.type === 'lociQuote' || node.type === 'blockquote') {
    const [quote, author] = node.content ?? []
    return [
      new Paragraph({ children: [new TextRun({ text: collectText(quote ?? node), italics: true })] }),
      ...(author && collectText(author).trim() ? [new Paragraph({ children: [new TextRun({ text: collectText(author).trim(), bold: true })] })] : []),
    ]
  }

  if (node.type === 'codeBlock') {
    const lines = collectCodeText(node).replace(/\r\n?/g, '\n').split('\n')
    return (lines.length ? lines : ['']).map((line) =>
      new Paragraph({
        children: [new TextRun({ text: line, font: 'Courier New' })],
      }),
    )
  }

  if (node.type === 'paragraph') {
    return [new Paragraph({ children: inlineContent(node) })]
  }

  return collectText(node) ? [new Paragraph({ text: collectText(node) })] : []
}

function inlineContent(node: JSONContent): TextRun[] {
  const children = node.content ?? []
  if (!children.length) return [new TextRun('')]

  return children.map((child) => {
    const marks = child.marks ?? []
    return new TextRun({
      text: child.text ?? collectText(child),
      bold: marks.some((mark) => mark.type === 'bold'),
      italics: marks.some((mark) => mark.type === 'italic'),
      underline: marks.some((mark) => mark.type === 'atom') ? {} : undefined,
    })
  })
}

function collectText(node: JSONContent): string {
  if (node.text) return node.text
  return (node.content ?? []).map(collectText).join(' ')
}

function collectCodeText(node: JSONContent): string {
  if (node.text) return node.text
  if (node.type === 'hardBreak') return '\n'
  return (node.content ?? []).map(collectCodeText).join('')
}

function tableRows(node: JSONContent): string[][] {
  return (node.content ?? [])
    .filter((row) => row.type === 'tableRow')
    .map((row) => (row.content ?? []).map((cell) => collectText(cell).replace(/\s+/g, ' ').trim()))
}

function noteHasAtom(content: JSONContent, atomId: string): boolean {
  if (content.marks?.some((mark) => mark.type === 'atom' && mark.attrs?.atomId === atomId)) {
    return true
  }

  return (content.content ?? []).some((child) => noteHasAtom(child, atomId))
}

function templateLabel(value: string) {
  switch (value) {
    case 'report':
      return 'Report'
    case 'planner':
      return 'Planner'
    case 'slideshow':
      return 'Slideshow'
    default:
      return 'Blank page'
  }
}
