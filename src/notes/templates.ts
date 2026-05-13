import type { ComponentType } from 'react'
import { Brain, Calendar, ChartNoAxesColumn, Columns3, FileText, Info, Minus, Quote, Table2 } from 'lucide-react'
import { createId, nowIso } from '../db'
import type { JSONContent, LociBlock, LociBlockType, Note, NoteTemplateData, NoteTemplateId } from '../db'
import {
  blankDoc,
  cloneTemplateValue,
  createTemplateBlocks,
  emptyDoc,
  headingDoc,
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

export const noteTemplateIcons: Record<NoteTemplateId, IconComponent> = {
  blank: FileText,
  report: ChartNoAxesColumn,
  planner: Calendar,
  slideshow: Columns3,
}

export const blockPickerOptions: BlockPickerOption[] = [
  { type: 'table', label: 'Table', description: 'Editable study grid with headers.', icon: Table2 },
  { type: 'flashcard', label: 'Flashcard', description: 'Question and answer atom card.', icon: Brain },
  { type: 'quote', label: 'Quote', description: 'Pull out a reference or idea.', icon: Quote },
  { type: 'divider', label: 'Divider', description: 'Separate sections.', icon: Minus },
  { type: 'callout', label: 'Callout', description: 'Highlight an important note.', icon: Info },
]

export function templateStructureLabel(id: NoteTemplateId) {
  if (id === 'report') return 'Subtitle / Summary / Findings / Recommendations / Appendix'
  if (id === 'planner') return 'Date / Priorities / Tasks / Schedule / Notes'
  if (id === 'slideshow') return 'Slide cards / Slide body / Speaker notes'
  return 'Title / Body'
}

export function normalizeTemplateData(templateId: NoteTemplateId, content: JSONContent, data?: NoteTemplateData): NoteTemplateData {
  if (data?.kind === templateId) return data
  if (templateId === 'report') return cloneTemplateValue(getNoteTemplate('report').templateData)
  if (templateId === 'planner') return cloneTemplateValue(getNoteTemplate('planner').templateData)
  if (templateId === 'slideshow') return cloneTemplateValue(getNoteTemplate('slideshow').templateData)
  return { kind: 'blank', body: cloneTemplateValue(content) }
}

export function primaryTemplateContent(note: Note | undefined): JSONContent {
  if (!note) return emptyDoc
  const data = normalizeTemplateData(note.templateId ?? 'blank', note.content ?? emptyDoc, note.templateData)
  if (data.kind === 'blank') return data.body
  if (data.kind === 'report') return data.appendix
  if (data.kind === 'planner') return data.notes
  const slide = data.slides.find((item) => item.id === data.activeSlideId) ?? data.slides[0]
  return slide?.body ?? emptyDoc
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
  if (data.kind === 'blank') return data.body
  if (data.kind === 'report') {
    return {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Summary' }] },
        { type: 'paragraph', content: data.summary ? [{ type: 'text', text: data.summary }] : [] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Findings' }] },
        { type: 'paragraph', content: data.findings ? [{ type: 'text', text: data.findings }] : [] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Recommendations' }] },
        { type: 'paragraph', content: data.recommendations ? [{ type: 'text', text: data.recommendations }] : [] },
        ...(data.appendix.content ?? []),
      ],
    }
  }
  if (data.kind === 'planner') {
    return {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: data.date || 'Planner' }] },
        { type: 'bulletList', content: data.priorities.map((text) => ({ type: 'listItem', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] })) },
        { type: 'bulletList', content: data.tasks.map((task) => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `${task.done ? '[x]' : '[ ]'} ${task.text}` }] }] })) },
        ...(data.notes.content ?? []),
      ],
    }
  }
  return {
    type: 'doc',
    content: data.slides.flatMap((slide, index) => [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: slide.title || `Slide ${index + 1}` }] },
      ...(slide.body.content ?? []),
    ]),
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
