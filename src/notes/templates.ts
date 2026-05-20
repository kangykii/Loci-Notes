import type { ComponentType } from 'react'
import { Calendar, ChartNoAxesColumn, CheckSquare, Code2, Columns3, FileText, List, ListOrdered, Minus, Quote, Radical, Table2 } from 'lucide-react'
import { createId, nowIso } from '../db'
import type { JSONContent, LociBlock, LociBlockType, Note, NoteTemplateData, NoteTemplateId } from '../db'
import {
  blankDoc,
  cloneTemplateValue,
  createTemplateBlocks,
  emptyDoc,
  headingDoc,
  normalizeLegacyEditorContent,
  normalizeBlocksForContent,
  paragraphNode,
} from '../editor/blocks'

type IconComponent = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

export type BlockPickerOption = {
  type: LociBlockType
  label: string
  description: string
  icon: IconComponent
}

export type NoteTemplate = {
  id: NoteTemplateId
  name: string
  description: string
  title: string
  content: JSONContent
  blocks?: LociBlock[]
  templateData: NoteTemplateData
  available: boolean
  comingSoonLabel?: string
}

export const noteTemplates: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank page',
    description: 'A clean pageless note for fast writing.',
    title: 'Untitled Note',
    content: emptyDoc,
    blocks: createTemplateBlocks(emptyDoc),
    templateData: { kind: 'blank', body: emptyDoc },
    available: true,
  },
  {
    id: 'report',
    name: 'Report',
    description: 'Structured sections for findings and recommendations.',
    title: 'Untitled Report',
    content: headingDoc('Appendix', 'Add supporting notes, evidence, and context.'),
    templateData: {
      kind: 'report',
      subtitle: 'Working report',
      summary: 'Write the main finding here.',
      findings: 'Capture evidence, observations, and context.',
      recommendations: 'List the recommended next steps.',
      appendix: headingDoc('Appendix', 'Add supporting notes, evidence, and context.'),
    },
    available: false,
    comingSoonLabel: 'Coming soon',
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'A practical layout for priorities, tasks, and next steps.',
    title: 'Untitled Planner',
    content: blankDoc('Plan the next move.'),
    blocks: createTemplateBlocks({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: "Today's priorities" }] },
        { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [paragraphNode('Define the day')] }] },
        paragraphNode('Plan the next move.'),
      ],
    }),
    templateData: {
      kind: 'planner',
      date: new Date().toISOString().slice(0, 10),
      priorities: ['Top priority', 'Secondary focus', 'Keep in view'],
      tasks: [
        { id: 'task_1', text: 'Define the day', done: false },
        { id: 'task_2', text: 'Review progress', done: false },
      ],
      schedule: [
        { id: 'schedule_1', time: '09:00', text: 'Focus block' },
        { id: 'schedule_2', time: '14:00', text: 'Review block' },
      ],
      notes: blankDoc('Plan the next move.'),
    },
    available: true,
  },
  {
    id: 'slideshow',
    name: 'Slideshow',
    description: 'Slide-style sections that export cleanly later.',
    title: 'Untitled Slideshow',
    content: blankDoc('Introduce the idea.'),
    templateData: {
      kind: 'slideshow',
      activeSlideId: 'slide_1',
      slides: [
        { id: 'slide_1', title: 'Slide 1: Title', body: blankDoc('Introduce the idea.'), speakerNotes: 'Speaker notes for the opening slide.' },
        { id: 'slide_2', title: 'Slide 2: Key Point', body: blankDoc('Add the supporting point.'), speakerNotes: '' },
      ],
    },
    available: false,
    comingSoonLabel: 'Coming soon',
  },
]

export function getNoteTemplate(id: NoteTemplateId = 'blank') {
  return noteTemplates.find((template) => template.id === id) ?? noteTemplates[0]
}

function reportTemplateData() {
  return cloneTemplateValue(getNoteTemplate('report').templateData) as Extract<NoteTemplateData, { kind: 'report' }>
}

function plannerTemplateData() {
  return cloneTemplateValue(getNoteTemplate('planner').templateData) as Extract<NoteTemplateData, { kind: 'planner' }>
}

function slideshowTemplateData() {
  return cloneTemplateValue(getNoteTemplate('slideshow').templateData) as Extract<NoteTemplateData, { kind: 'slideshow' }>
}

export const noteTemplateIcons: Record<NoteTemplateId, IconComponent> = {
  blank: FileText,
  report: ChartNoAxesColumn,
  planner: Calendar,
  slideshow: Columns3,
}

export const blockPickerOptions: BlockPickerOption[] = [
  { type: 'checklist', label: 'Checklist', description: 'Track tasks with checkable lines.', icon: CheckSquare },
  { type: 'numberedList', label: 'Numbered list', description: 'Ordered steps or ranked points.', icon: ListOrdered },
  { type: 'bulletList', label: 'Bullet list', description: 'Dot-point notes and grouped ideas.', icon: List },
  { type: 'table', label: 'Table', description: 'Editable study grid with headers.', icon: Table2 },
  { type: 'quote', label: 'Quote', description: 'Pull out a reference or idea.', icon: Quote },
  { type: 'code', label: 'Code', description: 'Add a formatted code snippet.', icon: Code2 },
  { type: 'latex', label: 'LaTeX', description: 'Write an equation with a preview.', icon: Radical },
  { type: 'divider', label: 'Divider', description: 'Separate sections.', icon: Minus },
]

export function templateStructureLabel(id: NoteTemplateId) {
  if (id === 'report') return 'Subtitle / Summary / Findings / Recommendations / Appendix'
  if (id === 'planner') return 'Date / Priorities / Tasks / Schedule / Notes'
  if (id === 'slideshow') return 'Slide cards / Slide body / Speaker notes'
  return 'Title / Body'
}

export function normalizeTemplateData(templateId: NoteTemplateId, content: JSONContent, data?: NoteTemplateData): NoteTemplateData {
  if (data?.kind === templateId) {
    if (templateId === 'blank') {
      return { kind: 'blank', body: cloneTemplateValue(data.kind === 'blank' ? data.body ?? content : content) }
    }
    if (templateId === 'report' && data.kind === 'report') {
      const fallback = reportTemplateData()
      return {
        ...fallback,
        ...data,
        appendix: cloneTemplateValue(data.appendix ?? fallback.appendix),
      }
    }
    if (templateId === 'planner' && data.kind === 'planner') {
      const fallback = plannerTemplateData()
      return {
        ...fallback,
        ...data,
        priorities: Array.isArray(data.priorities) ? data.priorities : fallback.priorities,
        tasks: Array.isArray(data.tasks) ? data.tasks : fallback.tasks,
        schedule: Array.isArray(data.schedule) ? data.schedule : fallback.schedule,
        notes: cloneTemplateValue(data.notes ?? fallback.notes),
      }
    }
    if (templateId === 'slideshow' && data.kind === 'slideshow') {
      const fallback = slideshowTemplateData()
      const slides = Array.isArray(data.slides) && data.slides.length ? data.slides : fallback.slides
      return {
        ...fallback,
        ...data,
        activeSlideId: slides.some((slide) => slide.id === data.activeSlideId) ? data.activeSlideId : slides[0]?.id ?? fallback.activeSlideId,
        slides: slides.map((slide) => ({
          ...slide,
          body: cloneTemplateValue(slide.body ?? emptyDoc),
          speakerNotes: slide.speakerNotes ?? '',
        })),
      }
    }
  }
  if (templateId === 'report') return reportTemplateData()
  if (templateId === 'planner') return plannerTemplateData()
  if (templateId === 'slideshow') return slideshowTemplateData()
  return { kind: 'blank', body: cloneTemplateValue(content) }
}

export function primaryTemplateContent(note: Note | undefined): JSONContent {
  if (!note) return emptyDoc
  const data = normalizeTemplateData(note.templateId ?? 'blank', note.content ?? emptyDoc, note.templateData)
  if (data.kind === 'blank') return normalizeLegacyEditorContent(data.body)
  if (data.kind === 'report') return normalizeLegacyEditorContent(data.appendix)
  if (data.kind === 'planner') return normalizeLegacyEditorContent(data.notes)
  const slide = data.slides.find((item) => item.id === data.activeSlideId) ?? data.slides[0]
  return normalizeLegacyEditorContent(slide?.body ?? emptyDoc)
}

export function updatePrimaryTemplateContent(note: Note, content: JSONContent): NoteTemplateData {
  const data = normalizeTemplateData(note.templateId ?? 'blank', note.content ?? emptyDoc, note.templateData)
  if (data.kind === 'blank') return { ...data, body: content }
  if (data.kind === 'report') return { ...data, appendix: content }
  if (data.kind === 'planner') return { ...data, notes: content }
  return {
    ...data,
    slides: data.slides.map((slide) => (slide.id === data.activeSlideId ? { ...slide, body: content } : slide)),
  }
}

export function templateDataToContent(data: NoteTemplateData): JSONContent {
  if (data.kind === 'blank') return normalizeLegacyEditorContent(data.body ?? emptyDoc)
  if (data.kind === 'report') {
    const appendix = normalizeLegacyEditorContent(data.appendix ?? emptyDoc)
    return {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Summary' }] },
        { type: 'paragraph', content: data.summary ? [{ type: 'text', text: data.summary }] : [] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Findings' }] },
        { type: 'paragraph', content: data.findings ? [{ type: 'text', text: data.findings }] : [] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Recommendations' }] },
        { type: 'paragraph', content: data.recommendations ? [{ type: 'text', text: data.recommendations }] : [] },
        ...(appendix.content ?? []),
      ],
    }
  }
  if (data.kind === 'planner') {
    const priorities = Array.isArray(data.priorities) ? data.priorities : []
    const tasks = Array.isArray(data.tasks) ? data.tasks : []
    const notes = normalizeLegacyEditorContent(data.notes ?? emptyDoc)
    return {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: data.date || 'Planner' }] },
        { type: 'bulletList', content: priorities.map((text) => ({ type: 'listItem', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] })) },
        { type: 'bulletList', content: tasks.map((task) => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `${task.done ? '[x]' : '[ ]'} ${task.text}` }] }] })) },
        ...(notes.content ?? []),
      ],
    }
  }
  const slides = Array.isArray(data.slides) ? data.slides : []
  const content = slides.flatMap((slide, index) => [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: slide.title || `Slide ${index + 1}` }] },
    ...(normalizeLegacyEditorContent(slide.body ?? emptyDoc).content ?? []),
  ])
  return {
    type: 'doc',
    content: content.length ? content : emptyDoc.content,
  }
}

export function templateDataFor(templateId: NoteTemplateId, content = emptyDoc): NoteTemplateData {
  if (templateId === 'blank') return { kind: 'blank', body: cloneTemplateValue(content) }
  const data = cloneTemplateValue(getNoteTemplate(templateId).templateData)
  if (data.kind === 'report') return { ...data, appendix: cloneTemplateValue(content) }
  if (data.kind === 'planner') return { ...data, notes: cloneTemplateValue(content) }
  if (data.kind === 'slideshow') {
    return {
      ...data,
      slides: data.slides.map((slide, index) => (index === 0 ? { ...slide, body: cloneTemplateValue(content) } : slide)),
    }
  }
  return data
}

export function templateBlocksFor(templateId: NoteTemplateId, data: NoteTemplateData) {
  const templateBlocks = getNoteTemplate(templateId).blocks
  if (templateBlocks?.length) return templateBlocks.map((block) => ({ ...block, id: createId('block'), createdAt: nowIso(), updatedAt: nowIso() }))
  return normalizeBlocksForContent(templateDataToContent(data))
}

export { emptyDoc, blankDoc }
