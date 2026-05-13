/* eslint-disable react-hooks/set-state-in-effect */
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Extension, mergeAttributes, Node as TiptapNode } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Editor as TiptapEditor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  ArrowLeft,
  Brain,
  Calendar,
  ChartNoAxesColumn,
  ChevronDown,
  Code2,
  Columns3,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  History,
  Home,
  ImageIcon,
  Info,
  Keyboard,
  Layers3,
  LinkIcon,
  MoreHorizontal,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Quote,
  RemoveFormatting,
  Search,
  Settings,
  Shield,
  Shuffle as ShuffleIcon,
  Sparkles,
  Sigma,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import { AtomMark } from './AtomMark'
import {
  appendNoteSnapshot,
  createId,
  db,
  ensureSeedData,
  loadNoteSnapshots,
  nowIso,
} from './db'
import { exportNoteDocx, exportNotePdf } from './exports'
import './App.css'

type IconComponent = React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

type JSONContent = {
  type?: string
  attrs?: Record<string, unknown>
  content?: JSONContent[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
  [key: string]: unknown
}

type Project = {
  id: string
  name: string
  description?: string
  color: string
  createdAt: string
}

type Atom = {
  id: string
  phrase: string
  definition: string
  tags: string[]
  createdAt: string
  updatedAt: string
  reviewCount: number
  knownCount: number
}

type FlashcardSet = {
  id: string
  name: string
  description?: string
  atomIds: string[]
  createdAt: string
  updatedAt: string
  lastStudiedAt?: string
}

type NoteTemplateId = 'blank' | 'report' | 'planner' | 'slideshow'
type AIProviderId = 'openai' | 'gemini' | 'claude' | 'kimi'

type LociBlockType =
  | 'paragraph'
  | 'heading'
  | 'checklist'
  | 'table'
  | 'flashcard'
  | 'bulletList'
  | 'numberedList'
  | 'quote'
  | 'image'
  | 'divider'
  | 'callout'
  | 'template'

type LociBlock = {
  id: string
  type: LociBlockType
  content: JSONContent
  attrs?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

type TemplateTask = {
  id: string
  text: string
  done: boolean
}

type TemplateScheduleItem = {
  id: string
  time: string
  text: string
}

type TemplateSlide = {
  id: string
  title: string
  body: JSONContent
  speakerNotes: string
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
      tasks: TemplateTask[]
      schedule: TemplateScheduleItem[]
      notes: JSONContent
    }
  | {
      kind: 'slideshow'
      activeSlideId: string
      slides: TemplateSlide[]
    }

type Note = {
  id: string
  title: string
  projectId: string
  templateId: NoteTemplateId
  templateData: NoteTemplateData
  blocks?: LociBlock[]
  author: string
  tags: string[]
  content: JSONContent
  createdAt: string
  updatedAt: string
}

type NoteSnapshot = {
  id: string
  noteId: string
  savedAt: string
  title: string
  content: JSONContent
  contentHash: string
}

type UserProfile = {
  id: 'local'
  displayName: string
  initials: string
  avatarColor: string
  createdAt: string
  updatedAt: string
}

type AIProviderSettings = {
  enabled: boolean
  apiKey: string
  model: string
  baseUrl?: string
}

type UserSettings = {
  id: 'local'
  defaultAIProvider: AIProviderId
  aiProviders: Record<AIProviderId, AIProviderSettings>
  aiTemperature: number
  aiMaxTokens: number
  aiTimeoutMs?: number
  aiIncludeNoteTitle: boolean
  aiIncludeSelectedText: boolean
  aiIncludeNoteExcerpt: boolean
  aiLastStatus?: 'idle' | 'success' | 'error' | 'timeout'
  aiLastProvider?: AIProviderId
  aiLastUsage?: {
    inputTokens?: number
    outputTokens?: number
    cachedTokens?: number
  }
  aiLastError?: string
  aiLastRequestAt?: string
  highlighterColor: string
  reduceMotion: boolean
  compactMode: boolean
  preferredAtomSubView: 'atoms' | 'sets'
  createdAt: string
  updatedAt: string
}

type View = 'home' | 'editor' | 'projects' | 'atoms' | 'settings'
type AtomSubView = 'atoms' | 'sets' | 'set-edit' | 'study'
type StudyDirection = 'term' | 'definition'
type AtomDialog = {
  phrase: string
  definition: string
  existingId?: string
  from?: number
  to?: number
  mode: 'selection' | 'manual'
}

type SearchHit =
  | { kind: 'note'; note: Note }
  | { kind: 'project'; project: Project }
  | { kind: 'atom'; atom: Atom }

type EditorPanel = 'format' | 'more'

type AITaskType =
  | 'ai_atomise'
  | 'edit_selection'
  | 'generate_insert'
  | 'table_block'
  | 'quote_block'
  | 'answer_with_context'
  | 'summarize_note'
  | 'mark_writing'
  | 'update_project_instructions'
  | 'app_help'
  | 'atom_task'
  | 'general'

type AICommandId = 'rewrite' | 'continue' | 'summarise' | 'atomise' | 'mark' | 'custom'

type EditorRange = { from: number; to: number }
type ImageCropMode = 'contain' | 'cover'
type ImageAspectPreset = 'auto' | 'square' | 'wide' | 'portrait'
type ImageAlignPreset = 'left' | 'center' | 'right'
type ImageCropDragState = {
  startX: number
  startY: number
  startOffsetX: number
  startOffsetY: number
  frameWidth: number
  frameHeight: number
}

type BlockPickerState = {
  open: boolean
  blockId: string
  placement: 'before' | 'after'
  query: string
}

type BlockDropTarget = {
  blockId: string
  top: number
  height: number
  width: number
  left: number
}

type FormatBlockType = 'table' | 'quote' | 'image'

type FormatBlockControlRect = {
  blockId: string
  type: FormatBlockType
  top: number
  left: number
}

type FormatSideControlsRect = FormatBlockControlRect

type AITablePayload = {
  mode: 'create' | 'update'
  columns: string[]
  rows: string[][]
}

type AIQuotePayload = {
  mode: 'create' | 'update'
  quote: string
  author?: string
}

type AIBlockPayload =
  | { kind: 'table'; data: AITablePayload; targetBlockId?: string }
  | { kind: 'quote'; data: AIQuotePayload; targetBlockId?: string }

type AIResult = {
  prompt: string
  taskType: AITaskType
  response: string
  insertableResponse: string
  draftText: string
  actionLabel: string
  canReplaceSelection: boolean
  canInsert: boolean
  canCreateAtoms: boolean
  canApplyBlock?: boolean
  blockPayload?: AIBlockPayload
  provider: AIProviderId
  selection?: { from: number; to: number }
  /** Plain text of the selection when `edit_selection` ran; used for before/after review. */
  selectionOriginalText?: string
  projectInstructionDraft?: string
  canUpdateProjectInstructions?: boolean
}

type ProviderMeta = {
  id: AIProviderId
  name: string
  description: string
  defaultModel: string
  baseUrl: string
  baseUrlLocked?: boolean
}

type FormatOption = {
  id: string
  label: string
  icon: IconComponent
  description: string
  group: 'Structure' | 'Text' | 'Insert' | 'Advanced blocks'
  enabled: boolean
  action?: () => void
  comingSoonLabel?: string
}

type BlockPickerOption = {
  type: LociBlockType
  label: string
  description: string
  icon: IconComponent
}

type AppDialog =
  | {
      kind: 'confirm'
      title: string
      message: string
      confirmLabel: string
      intent?: 'danger' | 'primary'
      onConfirm: () => void | Promise<void>
    }
  | {
      kind: 'prompt'
      title: string
      message?: string
      label: string
      value: string
      placeholder?: string
      secondaryLabel?: string
      secondaryValue?: string
      secondaryPlaceholder?: string
      confirmLabel: string
      onConfirm: (value: string, secondaryValue?: string) => void | Promise<void>
    }

const aiProviders: ProviderMeta[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'General writing, reasoning, and editing support.',
    defaultModel: 'gpt-5.2',
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google hosted Gemini text generation.',
    defaultModel: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    baseUrlLocked: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Messages API for long-form drafting.',
    defaultModel: 'claude-sonnet-4-20250514',
    baseUrl: 'https://api.anthropic.com/v1',
    baseUrlLocked: true,
  },
  {
    id: 'kimi',
    name: 'Kimi',
    description: 'Moonshot/Kimi OpenAI-compatible chat completions.',
    defaultModel: 'kimi-k2.6',
    baseUrl: 'https://api.moonshot.ai/v1',
  },
]

const AI_SYSTEM_INSTRUCTION = [
  "You are Loci Notes' task assistant.",
  'Help the user complete writing and knowledge-management tasks inside the app.',
  'Use provided note, project, and editor context whenever possible.',
  'Keep a neutral tone and prefer precise edits and concise output.',
  'Use plain editor text. Do not use Markdown heading markers, bold markers, code fences, or table syntax.',
  'Do not include greetings, sign-offs, "hope this helps", or meta commentary.',
  'Do not invent facts outside the provided context.',
].join('\n')

const AI_TASK_CONTRACTS: Record<AITaskType, string> = {
  ai_atomise: 'Task: ai_atomise. Return atom candidates as one per line in the format "Phrase - definition". Prefer durable concepts, key terms, named methods, and definitions that help future review.',
  edit_selection: 'Task: edit_selection. Return only the replacement text for the selected passage. Preserve meaning unless the user explicitly asks to change it.',
  generate_insert: 'Task: generate_insert. Return only clean document text that can be inserted at the cursor.',
  table_block: 'Task: table_block. Return strict JSON only, no markdown. Shape: {"mode":"create"|"update","columns":["Column"],"rows":[["Cell"]]}. Use update only when highlighted table context is provided; otherwise use create. Reorganize, clean, add, or edit data according to the user request.',
  quote_block: 'Task: quote_block. Return strict JSON only, no markdown. Shape: {"mode":"create"|"update","quote":"Quote text","author":"Optional author"}. Use update only when highlighted quote context is provided. Do not invent an author; omit author if unknown.',
  answer_with_context: 'Task: answer_with_context. Answer briefly using note/project context. Mention the context used in plain language when useful. Do not format as insertable prose by default.',
  summarize_note: 'Task: summarize_note. Return plain text with short section headings and dash bullets. Do not use Markdown syntax.',
  mark_writing: 'Task: mark_writing. Mark the writing against the supplied marking criteria. Return concise plain-text sections: Overall, Strengths, Improvements, Suggested edit. If no clear criteria are supplied, use the default criteria from context and say that default criteria were used. Do not use Markdown syntax.',
  update_project_instructions: 'Task: update_project_instructions. Draft a concise replacement project description with exactly these plain-text section labels: Summary, Instructions, Writing style, Marking criteria. Use current project memory as the base, integrate reusable guidance from the latest AI draft, and avoid copying note-specific content.',
  app_help: 'Task: app_help. Answer as product guidance for Loci Notes. Do not write document text unless asked.',
  atom_task: 'Task: atom_task. Return atom candidates as one per line in the format "Phrase — definition". Keep definitions short and clear.',
  general: 'Task: general. Answer briefly. Ask for missing context only when necessary.',
}

const DEFAULT_AI_TIMEOUT_MS = 60000
const CLAUDE_REQUIRED_MAX_TOKENS = 4096
const HIGHLIGHTER_COLORS = ['#fff1a8', '#dff4cc', '#d9ecff', '#ffe3d2', '#eadfff'] as const
const DEFAULT_HIGHLIGHTER_COLOR = HIGHLIGHTER_COLORS[0]
const DEFAULT_MARKING_CRITERIA = [
  'Clarity: the writing is easy to follow and uses precise language.',
  'Structure: ideas are ordered logically with clear transitions.',
  'Evidence: claims are supported by relevant examples, facts, or reasoning.',
  'Depth: the writing explains significance rather than only listing points.',
  'Tone: the writing fits the project context and intended reader.',
].join('\n')

type ProjectMemorySections = {
  summary: string
  instructions: string
  writingStyle: string
  markingCriteria: string
}

const PROJECT_MEMORY_HEADINGS: Array<{ key: keyof ProjectMemorySections; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'writingStyle', label: 'Writing style' },
  { key: 'markingCriteria', label: 'Marking criteria' },
]

const PROJECT_MEMORY_FIELD_META: Record<
  keyof ProjectMemorySections,
  { hint: string; placeholder: string; ariaLabel: string }
> = {
  summary: {
    hint: 'Project purpose, topic, audience, and context.',
    placeholder: 'What is this project about?',
    ariaLabel: 'Project summary',
  },
  instructions: {
    hint: 'General AI behavior for this project.',
    placeholder: 'How should AI work in this project?',
    ariaLabel: 'Project instructions',
  },
  writingStyle: {
    hint: 'Tone, structure, and phrasing preferences.',
    placeholder: 'What should the writing sound like?',
    ariaLabel: 'Project writing style',
  },
  markingCriteria: {
    hint: 'Rubric used only by Mark writing.',
    placeholder: 'How should writing be assessed?',
    ariaLabel: 'Project marking criteria',
  },
}

const aiSelectionHighlightKey = new PluginKey<EditorRange | null>('aiSelectionHighlight')
const blockControlsKey = new PluginKey('blockControls')

const LociFlashcard = TiptapNode.create({
  name: 'lociFlashcard',
  group: 'block',
  content: 'block+',
  isolating: true,

  addAttributes() {
    return {
      atomId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-loci-flashcard]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', { ...HTMLAttributes, 'data-loci-flashcard': 'true', class: 'loci-flashcard' }, 0]
  },
})

const LociQuote = TiptapNode.create({
  name: 'lociQuote',
  group: 'block',
  content: 'block+',
  isolating: true,

  parseHTML() {
    return [{ tag: 'figure[data-loci-quote]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', { ...HTMLAttributes, 'data-loci-quote': 'true', class: 'loci-quote' }, 0]
  },
})

const LociImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 78,
        parseHTML: (element) => Number(element.getAttribute('data-image-width')) || 78,
        renderHTML: (attrs) => ({ 'data-image-width': String(attrs.width || 78) }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-image-align') || 'center',
        renderHTML: (attrs) => ({ 'data-image-align': attrs.align || 'center' }),
      },
      cropMode: {
        default: 'contain',
        parseHTML: (element) => element.getAttribute('data-image-crop-mode') || 'contain',
        renderHTML: (attrs) => ({ 'data-image-crop-mode': attrs.cropMode || 'contain' }),
      },
      aspect: {
        default: 'auto',
        parseHTML: (element) => element.getAttribute('data-image-aspect') || 'auto',
        renderHTML: (attrs) => ({ 'data-image-aspect': attrs.aspect || 'auto' }),
      },
      offsetX: {
        default: 50,
        parseHTML: (element) => Number(element.getAttribute('data-image-offset-x')) || 50,
        renderHTML: (attrs) => ({ 'data-image-offset-x': String(attrs.offsetX ?? 50) }),
      },
      offsetY: {
        default: 50,
        parseHTML: (element) => Number(element.getAttribute('data-image-offset-y')) || 50,
        renderHTML: (attrs) => ({ 'data-image-offset-y': String(attrs.offsetY ?? 50) }),
      },
      zoom: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute('data-image-zoom')) || 100,
        renderHTML: (attrs) => ({ 'data-image-zoom': String(attrs.zoom ?? 100) }),
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const width = Number(HTMLAttributes['data-image-width']) || 78
    const offsetX = Number(HTMLAttributes['data-image-offset-x']) || 50
    const offsetY = Number(HTMLAttributes['data-image-offset-y']) || 50
    const zoom = Number(HTMLAttributes['data-image-zoom']) || 100
    const align = HTMLAttributes['data-image-align'] || 'center'
    const cropMode = HTMLAttributes['data-image-crop-mode'] || 'contain'
    const aspect = HTMLAttributes['data-image-aspect'] || 'auto'
    const { src, alt, title } = HTMLAttributes
    return [
      'figure',
      mergeAttributes({
        class: 'loci-image-frame',
        'data-image-width': String(width),
        'data-image-align': align,
        'data-image-crop-mode': cropMode,
        'data-image-aspect': aspect,
        'data-image-offset-x': String(offsetX),
        'data-image-offset-y': String(offsetY),
        'data-image-zoom': String(zoom),
        style: `--image-width:${width}%;--image-position-x:${offsetX}%;--image-position-y:${offsetY}%;--image-zoom:${zoom / 100};`,
      }),
      ['img', { src, alt, title }],
    ]
  },
})

const AISelectionHighlight = Extension.create({
  name: 'aiSelectionHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<EditorRange | null>({
        key: aiSelectionHighlightKey,
        state: {
          init: () => null,
          apply(transaction, previous) {
            const meta = transaction.getMeta(aiSelectionHighlightKey) as { range: EditorRange | null } | undefined
            if (meta) return meta.range
            if (!previous || !transaction.docChanged) return previous
            const from = transaction.mapping.map(previous.from, -1)
            const to = transaction.mapping.map(previous.to, 1)
            return from < to ? { from, to } : null
          },
        },
        props: {
          decorations(state) {
            const range = aiSelectionHighlightKey.getState(state)
            if (!range || range.from >= range.to) return null
            return DecorationSet.create(state.doc, [
              Decoration.inline(range.from, range.to, { class: 'ai-selection-highlight' }),
            ])
          },
        },
      }),
    ]
  },
})

function blockControlWidget(pos: number, blockId: string, blockType: LociBlockType) {
  const icon = (paths: string[], circles: Array<[number, number, number]> = []) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('aria-hidden', 'true')
    paths.forEach((d) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      svg.appendChild(path)
    })
    circles.forEach(([cx, cy, r]) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(cx))
      circle.setAttribute('cy', String(cy))
      circle.setAttribute('r', String(r))
      svg.appendChild(circle)
    })
    return svg
  }
  const wrapper = document.createElement('span')
  wrapper.className = 'block-hover-controls'
  wrapper.contentEditable = 'false'
  wrapper.setAttribute('data-block-id', blockId)
  wrapper.setAttribute('data-block-type', blockType)

  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.className = 'block-control-button block-control-delete'
  deleteButton.setAttribute('aria-label', 'Delete block')
  deleteButton.appendChild(icon(['M6 6l12 12', 'M18 6L6 18']))
  Object.assign(deleteButton.dataset, { blockAction: 'delete', blockId })

  const addButton = document.createElement('button')
  addButton.type = 'button'
  addButton.className = 'block-control-button'
  addButton.setAttribute('aria-label', 'Insert block')
  addButton.appendChild(icon(['M12 5v14', 'M5 12h14']))
  Object.assign(addButton.dataset, { blockAction: 'insert', blockId })

  const dragHandle = document.createElement('button')
  dragHandle.type = 'button'
  dragHandle.className = 'block-control-button block-control-handle'
  dragHandle.setAttribute('aria-label', 'Move block')
  dragHandle.draggable = true
  dragHandle.appendChild(icon([], [[9, 7.5, 1.25], [15, 7.5, 1.25], [9, 12, 1.25], [15, 12, 1.25], [9, 16.5, 1.25], [15, 16.5, 1.25]]))
  Object.assign(dragHandle.dataset, { blockAction: 'drag', blockId })

  wrapper.append(deleteButton, addButton, dragHandle)
  return Decoration.widget(pos, wrapper, { side: -1, key: `block-controls-${blockId}` })
}

const BlockControlsExtension = Extension.create({
  name: 'blockControls',

  addProseMirrorPlugins() {
    return [
      new Plugin<LociBlock[]>({
        key: blockControlsKey,
        props: {
          decorations(state) {
            const blocks = blockControlsKey.getState(state) as LociBlock[] | undefined
            if (!blocks?.length) return null
            const decorations: Decoration[] = []
            let pos = 1
            blocks.forEach((block) => {
              if (!formatBlockTypeForBlock(block)) decorations.push(blockControlWidget(pos, block.id, block.type))
              blockContentNodes(block.content).forEach((node) => {
                pos += state.schema.nodeFromJSON(node).nodeSize
              })
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
        state: {
          init: () => [],
          apply(transaction, previous) {
            const meta = transaction.getMeta(blockControlsKey) as LociBlock[] | undefined
            return meta ?? previous
          },
        },
      }),
    ]
  },
})

function defaultUserSettings(): UserSettings {
  const now = nowIso()
  return {
    id: 'local',
    defaultAIProvider: 'openai',
    aiProviders: {
      openai: { enabled: false, apiKey: '', model: 'gpt-5.2', baseUrl: 'https://api.openai.com/v1' },
      gemini: { enabled: false, apiKey: '', model: 'gemini-2.5-flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
      claude: { enabled: false, apiKey: '', model: 'claude-sonnet-4-20250514', baseUrl: 'https://api.anthropic.com/v1' },
      kimi: { enabled: false, apiKey: '', model: 'kimi-k2.6', baseUrl: 'https://api.moonshot.ai/v1' },
    },
    aiTemperature: 0.4,
    aiMaxTokens: 800,
    aiTimeoutMs: DEFAULT_AI_TIMEOUT_MS,
    aiIncludeNoteTitle: true,
    aiIncludeSelectedText: true,
    aiIncludeNoteExcerpt: true,
    highlighterColor: DEFAULT_HIGHLIGHTER_COLOR,
    reduceMotion: false,
    compactMode: false,
    preferredAtomSubView: 'atoms',
    createdAt: now,
    updatedAt: now,
  }
}

function normalizeUserSettings(settings?: Partial<UserSettings> | null): UserSettings {
  const base = defaultUserSettings()
  if (!settings) return base
  const providers = {
    openai: { ...base.aiProviders.openai, ...settings.aiProviders?.openai },
    gemini: { ...base.aiProviders.gemini, ...settings.aiProviders?.gemini },
    claude: { ...base.aiProviders.claude, ...settings.aiProviders?.claude },
    kimi: { ...base.aiProviders.kimi, ...settings.aiProviders?.kimi },
  }
  if (providers.openai.model === 'gpt-4o-mini') providers.openai.model = base.aiProviders.openai.model
  if (providers.gemini.model === 'gemini-1.5-flash') providers.gemini.model = base.aiProviders.gemini.model
  if (providers.claude.model === 'claude-3-5-haiku-latest') providers.claude.model = base.aiProviders.claude.model
  if (providers.kimi.model === 'kimi-k2-0711-preview') providers.kimi.model = base.aiProviders.kimi.model
  return {
    ...base,
    ...settings,
    aiProviders: providers,
    preferredAtomSubView: settings.preferredAtomSubView === 'sets' ? 'sets' : 'atoms',
  }
}

function sanitizeAIInsertText(text: string) {
  return text
    .replace(/^\s*(sure|certainly|of course|absolutely|here(?:'|’)s|here is)[,.!:\-\s]+/i, '')
    .replace(/\n{0,2}\s*(hope this helps|i hope this helps|let me know if you need anything else|happy to help)[.!]*\s*$/i, '')
    .trim()
}

function cleanAIDraftFormatting(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, ''))
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s{0,3}[-*+]\s+/, '- ')
        .replace(/^\s{0,3}\d+[.)]\s+/, (match) => `${match.trim().replace(/[.)]$/, '.')} `)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trimEnd(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractOpenAIText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (data.output_text) return data.output_text.trim()
  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim()
}

function extractUsage(data: {
  usage?: {
    input_tokens?: number
    output_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number }
    input_tokens_details?: { cached_tokens?: number }
  }
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    cachedContentTokenCount?: number
  }
  usage_metadata?: {
    prompt_token_count?: number
    candidates_token_count?: number
    cached_content_token_count?: number
  }
}) {
  const usage = data.usage
  const camel = data.usageMetadata
  const snake = data.usage_metadata
  return {
    inputTokens: usage?.input_tokens ?? usage?.prompt_tokens ?? camel?.promptTokenCount ?? snake?.prompt_token_count,
    outputTokens: usage?.output_tokens ?? usage?.completion_tokens ?? camel?.candidatesTokenCount ?? snake?.candidates_token_count,
    cachedTokens:
      usage?.input_tokens_details?.cached_tokens ??
      usage?.prompt_tokens_details?.cached_tokens ??
      camel?.cachedContentTokenCount ??
      snake?.cached_content_token_count,
  }
}

function taskFromAICommand(command: AICommandId, hasSelection: boolean): AITaskType | undefined {
  switch (command) {
    case 'rewrite':
      return hasSelection ? 'edit_selection' : 'generate_insert'
    case 'continue':
      return 'generate_insert'
    case 'summarise':
      return 'summarize_note'
    case 'atomise':
      return 'ai_atomise'
    case 'mark':
      return 'mark_writing'
    case 'custom':
      return undefined
  }
}

function defaultPromptForCommand(command: AICommandId, hasSelection: boolean) {
  switch (command) {
    case 'rewrite':
      return hasSelection ? 'Improve the selected writing.' : 'Draft a clearer version for the current note.'
    case 'continue':
      return 'Continue the current note in the same style.'
    case 'summarise':
      return hasSelection ? 'Summarise the selected writing.' : 'Summarise this note.'
    case 'atomise':
      return hasSelection ? 'Atomise the selected writing.' : 'Find atom candidates in this note.'
    case 'mark':
      return hasSelection ? 'Mark the selected writing.' : 'Mark this note.'
    case 'custom':
      return ''
  }
}

function routeAITask(prompt: string, hasSelection: boolean, command?: AICommandId): AITaskType {
  const explicitTask = command ? taskFromAICommand(command, hasSelection) : undefined
  if (explicitTask) return explicitTask

  const q = prompt.toLowerCase().trim()
  if (/\b(table|tabulate|spreadsheet|columns?|rows?|grid|organise .*data|organize .*data)\b/.test(q)) return 'table_block'
  if (/\b(quote|qoute|blockquote|pull quote|pull qoute|cite this|citation|add author|shorten quote|shorten qoute|polish quote|polish qoute)\b/.test(q)) return 'quote_block'
  if (/\b(atomi[sz]e|make atoms?|create atoms?|extract atoms?|key terms?|define terms?|glossary|concept cards?)\b/.test(q)) return 'ai_atomise'
  if (/\b(mark|grade|rubric|criteria|assess|evaluate|feedback|review my writing|score|critique)\b/.test(q)) return 'mark_writing'
  if (/\b(how do i|how to|where is|settings?|export|pdf|docx|create|delete|shortcut|sidebar|project|note history)\b/.test(q)) return 'app_help'
  if (/\b(summar(?:y|ize|ise)|recap|outline|flashcards?|study guide|key points?|explain this note|what is this note saying|tl;?dr)\b/.test(q)) return 'summarize_note'
  if (hasSelection && /\b(rewrite|revise|fix|clean up|sharpen|make sharper|concise|shorten|expand|improve|polish|edit|grammar|tone|clarify|simplify|make academic|make formal|make casual)\b/.test(q)) return 'edit_selection'
  if (/\b(write|draft|compose|add|insert|continue|extend|intro|introduction|paragraph|section|conclusion|next part|turn this into)\b/.test(q)) return 'generate_insert'
  if (/\b(what|why|how|explain|compare|does|is this|means?|meaning|difference between|relationship between)\b/.test(q)) return 'answer_with_context'
  return hasSelection ? 'edit_selection' : 'general'
}

function aiActionConfig(taskType: AITaskType, hasSelection: boolean) {
  return {
    actionLabel:
      taskType === 'edit_selection'
        ? 'Replace selection'
        : taskType === 'atom_task' || taskType === 'ai_atomise'
          ? 'Create atoms'
            : taskType === 'table_block' || taskType === 'quote_block'
              ? 'Apply block'
            : taskType === 'mark_writing'
            ? 'Copy feedback'
          : taskType === 'answer_with_context' || taskType === 'app_help'
            ? 'Copy'
            : 'Insert',
    canReplaceSelection: taskType === 'edit_selection' && hasSelection,
    canInsert: taskType === 'generate_insert' || taskType === 'summarize_note' || taskType === 'general',
    canCreateAtoms: taskType === 'atom_task' || taskType === 'ai_atomise',
    canApplyBlock: taskType === 'table_block' || taskType === 'quote_block',
  }
}

function aiResultTitle(result: AIResult) {
  const promptTitle = result.prompt.trim()
  if (promptTitle) return promptTitle
  if (result.taskType === 'mark_writing') return 'Marked writing'
  if (result.taskType === 'ai_atomise' || result.taskType === 'atom_task') return 'Atomise'
  return 'AI draft'
}

function aiPrimaryActionLabel(result: AIResult) {
  if (result.canReplaceSelection) return 'Apply rewrite'
  if (result.canCreateAtoms) return 'Create atoms'
  if (result.canApplyBlock) return 'Apply block'
  if (result.taskType === 'mark_writing') return 'Add feedback to note'
  return 'Insert draft'
}

function aiDraftLabel(taskType: AITaskType) {
  if (taskType === 'mark_writing') return 'Editable feedback'
  if (taskType === 'ai_atomise' || taskType === 'atom_task') return 'Editable atom candidates'
  if (taskType === 'table_block' || taskType === 'quote_block') return 'Editable block JSON'
  if (taskType === 'update_project_instructions') return 'Editable project instructions'
  return 'Editable draft'
}

function canResultUpdateProjectInstructions(taskType: AITaskType) {
  return taskType === 'mark_writing' || taskType === 'summarize_note' || taskType === 'generate_insert' || taskType === 'edit_selection'
}

function parseProjectMemory(description = ''): ProjectMemorySections {
  const sections: ProjectMemorySections = {
    summary: '',
    instructions: '',
    writingStyle: '',
    markingCriteria: '',
  }
  const headingByLabel = new Map(PROJECT_MEMORY_HEADINGS.map((item) => [item.label.toLowerCase(), item.key]))
  let current: keyof ProjectMemorySections | null = null
  const unsectioned: string[] = []

  for (const line of description.replace(/\r\n?/g, '\n').split('\n')) {
    const key = headingByLabel.get(line.trim().replace(/:$/, '').toLowerCase())
    if (key) {
      current = key
      continue
    }
    if (current) {
      sections[current] = `${sections[current]}${sections[current] ? '\n' : ''}${line}`.trimEnd()
    } else if (line.trim()) {
      unsectioned.push(line)
    }
  }

  if (!Object.values(sections).some((value) => value.trim()) && unsectioned.length) {
    sections.summary = unsectioned.join('\n').trim()
  } else if (unsectioned.length && !sections.summary.trim()) {
    sections.summary = unsectioned.join('\n').trim()
  }

  return sections
}

function serializeProjectMemory(sections: ProjectMemorySections) {
  return PROJECT_MEMORY_HEADINGS
    .map(({ key, label }) => `${label}\n${sections[key].trim()}`)
    .join('\n\n')
    .trim()
}

function updateProjectMemorySection(description: string | undefined, key: keyof ProjectMemorySections, value: string) {
  const sections = parseProjectMemory(description ?? '')
  sections[key] = value
  return serializeProjectMemory(sections)
}

function taskUsesWritingStyle(taskType: AITaskType) {
  return taskType === 'edit_selection' || taskType === 'generate_insert' || taskType === 'summarize_note' || taskType === 'general'
}

function parseAtomCandidates(text: string) {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .map((line) => {
      const [phrase, ...definitionParts] = line.split(/\s+[—-]\s+|:\s+/)
      return { phrase: phrase?.trim() ?? '', definition: definitionParts.join(' - ').trim() }
    })
    .filter((item) => item.phrase && item.definition)
}

function parseAIJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('AI did not return JSON.')
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown
}

function parseAITablePayload(text: string): AITablePayload {
  const value = parseAIJson(text) as Partial<AITablePayload>
  const columns = Array.isArray(value.columns) ? value.columns.map(String).map((item) => item.trim()).filter(Boolean) : []
  const rows = Array.isArray(value.rows)
    ? value.rows.map((row) => {
      if (Array.isArray(row)) return row.map((cell) => String(cell ?? '').trim())
      if (row && typeof row === 'object') return columns.map((column) => String((row as Record<string, unknown>)[column] ?? '').trim())
      return []
    }).filter((row) => row.length > 0)
    : []
  if (!columns.length && rows[0]?.length) {
    return { mode: value.mode === 'update' ? 'update' : 'create', columns: rows[0].map((_, index) => `Column ${index + 1}`), rows }
  }
  if (!columns.length) throw new Error('Table JSON needs columns.')
  return { mode: value.mode === 'update' ? 'update' : 'create', columns, rows }
}

function parseAIQuotePayload(text: string): AIQuotePayload {
  const value = parseAIJson(text) as Partial<AIQuotePayload> & { text?: string; body?: string; content?: string; citation?: string }
  const quoteSource = value.quote ?? value.text ?? value.body ?? value.content
  const quote = typeof quoteSource === 'string' ? quoteSource.trim() : ''
  if (!quote) throw new Error('Quote JSON needs quote text.')
  const authorSource = value.author ?? value.citation
  const author = typeof authorSource === 'string' && authorSource.trim() ? authorSource.trim() : undefined
  return { mode: value.mode === 'update' ? 'update' : 'create', quote, author }
}

function paragraphNode(text: string): JSONContent {
  return { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }
}

function textToEditorContent(text: string): JSONContent {
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

function insertDraftText(editor: NonNullable<ReturnType<typeof useEditor>>, text: string) {
  editor.chain().focus().insertContent(textToEditorContent(text).content ?? []).run()
}

const MARK_WRITING_FEEDBACK_SECTIONS = [
  { key: 'overall', label: 'Overall' },
  { key: 'strengths', label: 'Strengths' },
  { key: 'improvements', label: 'Improvements' },
  { key: 'suggestedEdit', label: 'Suggested edit' },
] as const

type MarkWritingFeedbackKey = (typeof MARK_WRITING_FEEDBACK_SECTIONS)[number]['key']

type MarkWritingFeedbackSections = Record<MarkWritingFeedbackKey, string>

function markWritingSectionHeadingKey(line: string): MarkWritingFeedbackKey | null {
  const normalized = line.trim().replace(/:+\s*$/, '').toLowerCase()
  for (const { key, label } of MARK_WRITING_FEEDBACK_SECTIONS) {
    if (normalized === label.toLowerCase()) return key
  }
  return null
}

function parseMarkWritingFeedback(text: string): MarkWritingFeedbackSections {
  const empty: MarkWritingFeedbackSections = {
    overall: '',
    strengths: '',
    improvements: '',
    suggestedEdit: '',
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let hasHeading = false
  for (const line of lines) {
    if (markWritingSectionHeadingKey(line)) {
      hasHeading = true
      break
    }
  }
  if (!hasHeading) {
    return { ...empty, overall: text.trim() }
  }

  let current: MarkWritingFeedbackKey | null = null
  const buckets: Record<MarkWritingFeedbackKey, string[]> = {
    overall: [],
    strengths: [],
    improvements: [],
    suggestedEdit: [],
  }

  for (const line of lines) {
    const heading = markWritingSectionHeadingKey(line)
    if (heading) {
      current = heading
      continue
    }
    if (current) buckets[current].push(line)
    else buckets.overall.push(line)
  }

  for (const { key } of MARK_WRITING_FEEDBACK_SECTIONS) {
    empty[key] = buckets[key].join('\n').trim()
  }
  return empty
}

function serializeMarkWritingFeedback(sections: MarkWritingFeedbackSections) {
  return MARK_WRITING_FEEDBACK_SECTIONS.map(({ key, label }) => ({ label, body: sections[key].trim() }))
    .filter(({ body }) => body.length > 0)
    .map(({ label, body }) => `${label}\n${body}`)
    .join('\n\n')
    .trim()
}

function MarkWritingFeedbackFields({
  draftText,
  onChange,
}: {
  draftText: string
  onChange: (next: string) => void
}) {
  const sections = parseMarkWritingFeedback(draftText)
  const patch = (key: MarkWritingFeedbackKey, value: string) => {
    onChange(serializeMarkWritingFeedback({ ...sections, [key]: value }))
  }

  return (
    <div className="ai-mark-feedback-cards" role="group" aria-label="Editable feedback sections">
      {MARK_WRITING_FEEDBACK_SECTIONS.map(({ key, label }) => (
        <div key={key} className="ai-mark-feedback-card">
          <span className="ai-mark-feedback-card-title">{label}</span>
          <textarea
            className="ai-mark-feedback-card-input"
            value={sections[key]}
            onChange={(event) => patch(key, event.target.value)}
            aria-label={label}
            rows={key === 'suggestedEdit' ? 5 : 4}
            autoFocus={key === 'overall'}
          />
        </div>
      ))}
    </div>
  )
}

function AiDraftFormattedPreview({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let listItems: string[] = []
  let listKind: 'bullet' | 'ordered' | null = null

  const flushList = () => {
    if (!listKind || !listItems.length) return
    const items = listItems.map((item, index) => (
      <li key={`${nodes.length}-${index}`}>{item}</li>
    ))
    nodes.push(
      listKind === 'bullet' ? (
        <ul key={`list-${nodes.length}`} className="ai-draft-preview-list">
          {items}
        </ul>
      ) : (
        <ol key={`list-${nodes.length}`} className="ai-draft-preview-list ai-draft-preview-list--ordered">
          {items}
        </ol>
      ),
    )
    listItems = []
    listKind = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/)
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/)
    if (bulletMatch || orderedMatch) {
      const nextKind = bulletMatch ? 'bullet' : 'ordered'
      if (listKind && listKind !== nextKind) flushList()
      listKind = nextKind
      listItems.push((bulletMatch?.[1] ?? orderedMatch?.[1] ?? '').trim())
      continue
    }
    flushList()
    const trimmed = line.trim()
    if (trimmed.length) {
      nodes.push(
        <p key={`p-${nodes.length}`} className="ai-draft-preview-p">
          {trimmed}
        </p>,
      )
    }
  }
  flushList()

  if (!nodes.length) {
    return <p className="ai-draft-preview-empty">Nothing to preview yet.</p>
  }
  return <div className="ai-draft-preview-doc">{nodes}</div>
}

function AIBlockFormattedPreview({ payload }: { payload: AIBlockPayload }) {
  if (payload.kind === 'table') {
    return (
      <div className="ai-block-preview">
        <table className="ai-block-preview-table">
          <thead>
            <tr>{payload.data.columns.map((column, index) => <th key={`${column}-${index}`}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {payload.data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {payload.data.columns.map((_, columnIndex) => <td key={columnIndex}>{row[columnIndex] ?? ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="ai-block-preview">
      <figure className="ai-block-preview-quote">
        <p>{payload.data.quote}</p>
        {payload.data.author && <figcaption>{payload.data.author}</figcaption>}
      </figure>
    </div>
  )
}

function hitKey(hit: SearchHit): string {
  switch (hit.kind) {
    case 'note':
      return `note-${hit.note.id}`
    case 'project':
      return `project-${hit.project.id}`
    case 'atom':
      return `atom-${hit.atom.id}`
  }
}

function normalizeSearch(query: string) {
  return query.trim().toLowerCase()
}

const emptyDoc: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start writing...' }] }],
}

const blankDoc = (text = ''): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
})

const headingDoc = (heading: string, body = ''): JSONContent => ({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] },
    { type: 'paragraph', content: body ? [{ type: 'text', text: body }] : [] },
  ],
})

function blockTypeForNode(node: JSONContent): LociBlockType {
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

function blockContentNodes(content?: JSONContent): JSONContent[] {
  if (!content) return []
  return content.type === 'doc' ? content.content ?? [] : [content]
}

function formatBlockTypeForBlock(block: LociBlock): FormatBlockType | null {
  const contentType = blockTypeForNode(block.content)
  if (contentType === 'table' || contentType === 'quote' || contentType === 'image') return contentType
  if (block.type === 'table' || block.type === 'quote' || block.type === 'image') return block.type
  return null
}

function blockDoc(nodes: JSONContent[]): JSONContent {
  return { type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph', content: [] }] }
}

function createLociBlock(content: JSONContent, type = blockTypeForNode(content)): LociBlock {
  const now = nowIso()
  return {
    id: createId('block'),
    type,
    content: content.type === 'doc' ? cloneTemplateValue(content) : blockDoc([cloneTemplateValue(content)]),
    createdAt: now,
    updatedAt: now,
  }
}

function tableCellNode(text = '', header = false): JSONContent {
  return {
    type: header ? 'tableHeader' : 'tableCell',
    attrs: { colspan: 1, rowspan: 1, colwidth: null },
    content: [paragraphNode(text)],
  }
}

function tableRowNode(cells: JSONContent[]): JSONContent {
  return { type: 'tableRow', content: cells }
}

function tableBlockDoc(): JSONContent {
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

function tableBlockDocFromData(columns: string[], rows: string[][]): JSONContent {
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

function flashcardBlockDoc(atomId?: string): JSONContent {
  return blockDoc([{
    type: 'lociFlashcard',
    attrs: { atomId: atomId ?? null },
    content: [
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Question' }] },
      paragraphNode('Answer'),
    ],
  }])
}

function quoteAuthorNode(text = 'Author'): JSONContent {
  return {
    type: 'paragraph',
    attrs: { 'data-quote-author': true },
    content: text ? [{ type: 'text', text }] : [],
  }
}

function quoteBlockDoc(showAuthor = true): JSONContent {
  return blockDoc([{
    type: 'lociQuote',
    content: [
      paragraphNode('Quote'),
      ...(showAuthor ? [quoteAuthorNode()] : []),
    ],
  }])
}

function quoteBlockDocFromData(quote: string, author?: string): JSONContent {
  return blockDoc([{
    type: 'lociQuote',
    content: [
      paragraphNode(quote || 'Quote'),
      ...(author?.trim() ? [quoteAuthorNode(author.trim())] : []),
    ],
  }])
}

function clampImageNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, number))
}

function imageBlockDoc(src: string, width = 78, align: ImageAlignPreset = 'center'): JSONContent {
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

function tableDataFromNode(node: JSONContent): { columns: string[]; rows: string[][] } {
  const rows = (node.content ?? []).filter((row) => row.type === 'tableRow')
  const cells = rows.map((row) => (row.content ?? []).map((cell) => collectText(cell).trim()))
  return { columns: cells[0] ?? [], rows: cells.slice(1) }
}

function quoteDataFromNode(node: JSONContent): { quote: string; author?: string } {
  const parts = node.content ?? []
  const authorNode = parts.find((part) => part.attrs?.['data-quote-author'])
  const quoteNodes = parts.filter((part) => part !== authorNode)
  return {
    quote: collectText({ type: 'doc', content: quoteNodes }).trim(),
    author: authorNode ? collectText(authorNode).trim() : undefined,
  }
}

function blocksFromContent(content?: JSONContent): LociBlock[] {
  const nodes = content?.type === 'doc' ? content.content ?? [] : []
  return [createLociBlock(blockDoc(nodes.length ? nodes : [{ type: 'paragraph', content: [] }]), 'paragraph')]
}

function contentFromBlocks(blocks?: LociBlock[]): JSONContent {
  if (!blocks?.length) return blankDoc()
  return {
    type: 'doc',
    content: blocks.flatMap((block) => cloneTemplateValue(blockContentNodes(block.content))),
  }
}

function normalizeBlocksForContent(content: JSONContent, blocks?: LociBlock[], activeIndex = -1): LociBlock[] {
  const nodes = content?.type === 'doc' ? content.content ?? [] : []
  const now = nowIso()
  const sourceNodes = nodes.length ? nodes : [{ type: 'paragraph', content: [] }]
  if (!blocks?.length) return [createLociBlock(blockDoc(sourceNodes), 'paragraph')]
  const existingNodes = blocks.flatMap((block) => blockContentNodes(block.content))
  if (JSON.stringify(existingNodes) === JSON.stringify(sourceNodes)) {
    return blocks.map((block) => ({
      ...block,
      content: block.content.type === 'doc' ? block.content : blockDoc([block.content]),
      updatedAt: now,
    }))
  }
  if (blocks.length === 1) {
    const existing = blocks[0]
    return [{
      ...existing,
      type: blockTypeForNode(sourceNodes[0] ?? { type: 'paragraph' }),
      content: blockDoc(cloneTemplateValue(sourceNodes)),
      updatedAt: now,
    }]
  }
  const counts = blocks.map((block) => Math.max(1, blockContentNodes(block.content).length))
  const totalPrevious = counts.reduce((sum, count) => sum + count, 0)
  const delta = sourceNodes.length - totalPrevious
  const targetIndex = activeIndex >= 0 && activeIndex < counts.length ? activeIndex : counts.length - 1
  counts[targetIndex] = Math.max(1, counts[targetIndex] + delta)
  let cursor = 0
  return blocks.map((block, index) => {
    const nextNodes = sourceNodes.slice(cursor, cursor + counts[index])
    cursor += counts[index]
    return {
      ...block,
      type: blockTypeForNode(nextNodes[0] ?? { type: 'paragraph' }),
      content: blockDoc(cloneTemplateValue(nextNodes.length ? nextNodes : [{ type: 'paragraph', content: [] }])),
      updatedAt: now,
    }
  })
}

function templateBlocksFor(templateId: NoteTemplateId, data: NoteTemplateData) {
  const templateBlocks = getNoteTemplate(templateId).blocks
  if (templateBlocks?.length) return templateBlocks.map((block) => ({ ...block, id: createId('block'), createdAt: nowIso(), updatedAt: nowIso() }))
  return normalizeBlocksForContent(templateDataToContent(data))
}

function blankBlockNode(type: LociBlockType): JSONContent {
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

function createTemplateBlocks(content: JSONContent) {
  return blocksFromContent(content)
}

type NoteTemplate = {
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

const noteTemplates: NoteTemplate[] = [
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

function getNoteTemplate(id: NoteTemplateId = 'blank') {
  return noteTemplates.find((template) => template.id === id) ?? noteTemplates[0]
}

const noteTemplateIcons: Record<NoteTemplateId, IconComponent> = {
  blank: FileText,
  report: ChartNoAxesColumn,
  planner: Calendar,
  slideshow: Columns3,
}

const blockPickerOptions: BlockPickerOption[] = [
  { type: 'table', label: 'Table', description: 'Editable study grid with headers.', icon: Table2 },
  { type: 'flashcard', label: 'Flashcard', description: 'Question and answer atom card.', icon: Brain },
  { type: 'quote', label: 'Quote', description: 'Pull out a reference or idea.', icon: Quote },
  { type: 'divider', label: 'Divider', description: 'Separate sections.', icon: Minus },
  { type: 'callout', label: 'Callout', description: 'Highlight an important note.', icon: Info },
]

function cloneTemplateValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function templateStructureLabel(id: NoteTemplateId) {
  if (id === 'report') return 'Subtitle / Summary / Findings / Recommendations / Appendix'
  if (id === 'planner') return 'Date / Priorities / Tasks / Schedule / Notes'
  if (id === 'slideshow') return 'Slide cards / Slide body / Speaker notes'
  return 'Title / Body'
}

function normalizeTemplateData(templateId: NoteTemplateId, content: JSONContent, data?: NoteTemplateData): NoteTemplateData {
  if (data?.kind === templateId) return data
  if (templateId === 'report') return cloneTemplateValue(getNoteTemplate('report').templateData)
  if (templateId === 'planner') return cloneTemplateValue(getNoteTemplate('planner').templateData)
  if (templateId === 'slideshow') return cloneTemplateValue(getNoteTemplate('slideshow').templateData)
  return { kind: 'blank', body: cloneTemplateValue(content) }
}

function primaryTemplateContent(note: Note | undefined): JSONContent {
  if (!note) return emptyDoc
  const data = normalizeTemplateData(note.templateId ?? 'blank', note.content ?? emptyDoc, note.templateData)
  if (data.kind === 'blank') return data.body
  if (data.kind === 'report') return data.appendix
  if (data.kind === 'planner') return data.notes
  const slide = data.slides.find((item) => item.id === data.activeSlideId) ?? data.slides[0]
  return slide?.body ?? emptyDoc
}

function updatePrimaryTemplateContent(note: Note, content: JSONContent): NoteTemplateData {
  const data = normalizeTemplateData(note.templateId ?? 'blank', note.content ?? emptyDoc, note.templateData)
  if (data.kind === 'blank') return { ...data, body: content }
  if (data.kind === 'report') return { ...data, appendix: content }
  if (data.kind === 'planner') return { ...data, notes: content }
  return {
    ...data,
    slides: data.slides.map((slide) => (slide.id === data.activeSlideId ? { ...slide, body: content } : slide)),
  }
}

function templateDataToContent(data: NoteTemplateData): JSONContent {
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

function templateDataFor(templateId: NoteTemplateId, content = emptyDoc): NoteTemplateData {
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isWordBoundaryChar(value: string | undefined) {
  return !value || !/[A-Za-z0-9_]/.test(value)
}

function findPhraseRanges(doc: { descendants: (callback: (node: { isText?: boolean; text?: string }, pos: number) => void) => void }, phrase: string) {
  const needle = phrase.trim()
  if (!needle) return []
  const ranges: Array<{ from: number; to: number }> = []
  const matcher = new RegExp(escapeRegExp(needle), 'gi')

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    matcher.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = matcher.exec(node.text))) {
      const index = match.index
      const end = index + match[0].length
      if (isWordBoundaryChar(node.text[index - 1]) && isWordBoundaryChar(node.text[end])) {
        ranges.push({ from: pos + index, to: pos + end })
      }
      if (matcher.lastIndex === index) matcher.lastIndex += 1
    }
  })

  return ranges
}

function markSignature(mark: { type: string; attrs?: Record<string, unknown> }) {
  return JSON.stringify([mark.type, mark.attrs ?? {}])
}

function sameMarks(a?: Array<{ type: string; attrs?: Record<string, unknown> }>, b?: Array<{ type: string; attrs?: Record<string, unknown> }>) {
  const left = a ?? []
  const right = b ?? []
  if (left.length !== right.length) return false
  return left.every((mark, index) => markSignature(mark) === markSignature(right[index]))
}

function mergeAdjacentTextNodes(nodes: JSONContent[]) {
  return nodes.reduce<JSONContent[]>((merged, node) => {
    const previous = merged[merged.length - 1]
    if (previous?.type === 'text' && node.type === 'text' && sameMarks(previous.marks, node.marks)) {
      previous.text = `${previous.text ?? ''}${node.text ?? ''}`
      return merged
    }
    merged.push(node)
    return merged
  }, [])
}

function atomMarkFor(atom: Atom) {
  return {
    type: 'atom',
    attrs: { atomId: atom.id, phrase: atom.phrase, definition: atom.definition },
  }
}

function applyAtomToTextNode(node: JSONContent, atom: Atom) {
  const text = node.text ?? ''
  const needle = atom.phrase.trim()
  if (!text || !needle) return { node, changed: false, count: 0 }

  const matcher = new RegExp(escapeRegExp(needle), 'gi')
  const segments: JSONContent[] = []
  let cursor = 0
  let count = 0
  let match: RegExpExecArray | null

  while ((match = matcher.exec(text))) {
    const index = match.index
    const end = index + match[0].length
    if (!isWordBoundaryChar(text[index - 1]) || !isWordBoundaryChar(text[end])) {
      if (matcher.lastIndex === index) matcher.lastIndex += 1
      continue
    }
    if (index > cursor) segments.push({ ...node, text: text.slice(cursor, index) })
    const existingMarks = (node.marks ?? []).filter((mark) => mark.type !== 'atom' || mark.attrs?.atomId !== atom.id)
    segments.push({ ...node, text: text.slice(index, end), marks: [...existingMarks, atomMarkFor(atom)] })
    count += 1
    cursor = end
    if (matcher.lastIndex === index) matcher.lastIndex += 1
  }

  if (!count) return { node, changed: false, count: 0 }
  if (cursor < text.length) segments.push({ ...node, text: text.slice(cursor) })
  return { node: { ...node, type: 'fragment', content: mergeAdjacentTextNodes(segments) }, changed: true, count }
}

function applyAtomsToContent(content: JSONContent, atomsToMark: Atom[]): { content: JSONContent; changed: boolean; count: number } {
  if (!atomsToMark.length) return { content, changed: false, count: 0 }
  let changed = false
  let count = 0

  if (content.type === 'text') {
    let nodes = [content]
    atomsToMark.forEach((atom) => {
      const nextNodes: JSONContent[] = []
      nodes.forEach((node) => {
        const result = applyAtomToTextNode(node, atom)
        if (result.changed) {
          changed = true
          count += result.count
          nextNodes.push(...(result.node.content ?? [result.node]))
        } else {
          nextNodes.push(result.node)
        }
      })
      nodes = mergeAdjacentTextNodes(nextNodes)
    })
    return nodes.length === 1 ? { content: nodes[0], changed, count } : { content: { type: 'fragment', content: nodes }, changed, count }
  }

  if (!content.content?.length) return { content, changed: false, count: 0 }
  const nextChildren: JSONContent[] = []
  content.content.forEach((child) => {
    const result = applyAtomsToContent(child, atomsToMark)
    changed ||= result.changed
    count += result.count
    if (result.content.type === 'fragment') nextChildren.push(...(result.content.content ?? []))
    else nextChildren.push(result.content)
  })

  return changed ? { content: { ...content, content: nextChildren }, changed, count } : { content, changed: false, count: 0 }
}

function applyAtomMarksToEditor(editor: TiptapEditor, atomsToMark: Atom[]) {
  const atomMarkType = editor.schema.marks.atom
  if (!atomMarkType) return 0

  let transaction = editor.state.tr
  let markCount = 0

  atomsToMark.forEach((atom) => {
    const ranges = findPhraseRanges(editor.state.doc, atom.phrase)
    ranges.forEach(({ from, to }) => {
      transaction = transaction.addMark(from, to, atomMarkType.create({ atomId: atom.id, phrase: atom.phrase, definition: atom.definition }))
      markCount += 1
    })
  })

  if (markCount > 0) editor.view.dispatch(transaction.scrollIntoView())
  return markCount
}

function selectionContainsAtom(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const { from, to, empty } = editor.state.selection
  if (empty) return editor.isActive('atom')
  let contains = false
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (contains || !node.isText) return false
    contains = node.marks.some((mark) => mark.type.name === 'atom')
    return undefined
  })
  return contains
}

/** Notes that are not tied to a real project bucket (not a DB project row). */
const UNASSIGNED_PROJECT_ID = '__unassigned__'

const NOTE_DRAG_MIME = 'application/x-loci-note-id'
const NOTE_MULTI_DRAG_MIME = 'application/x-loci-note-ids'

const DEFAULT_PROFILE_COLOR = '#4c4439'

const PROFILE_COLORS = ['#4c4439', '#111111', '#5d6b52', '#6c5a7c', '#8a5a44', '#3f6673']

type ProfileDraft = {
  displayName: string
  initials: string
  avatarColor: string
}

function createNoteDragPreview(title: string) {
  const preview = document.createElement('div')
  preview.className = 'drag-preview-card'
  preview.textContent = title || 'Untitled Note'
  document.body.appendChild(preview)
  return preview
}

function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [atoms, setAtoms] = useState<Atom[]>([])
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings>(() => defaultUserSettings())
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    displayName: '',
    initials: '',
    avatarColor: DEFAULT_PROFILE_COLOR,
  })
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [activeView, setActiveView] = useState<View>('home')
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [flippedAtomIds, setFlippedAtomIds] = useState<string[]>([])
  const [atomSelectionMode, setAtomSelectionMode] = useState(false)
  const [selectedAtomIds, setSelectedAtomIds] = useState<string[]>([])
  const [atomSubView, setAtomSubView] = useState<AtomSubView>('atoms')
  const [atomHeadingMenuOpen, setAtomHeadingMenuOpen] = useState(false)
  const [editingFlashcardSetId, setEditingFlashcardSetId] = useState<string | null>(null)
  const [flashcardSetTitleEditing, setFlashcardSetTitleEditing] = useState(false)
  const [flashcardSetDraftName, setFlashcardSetDraftName] = useState('')
  const [flashcardSetDraftDescription, setFlashcardSetDraftDescription] = useState('')
  const [flashcardSetDraftAtomIds, setFlashcardSetDraftAtomIds] = useState<string[]>([])
  const [flashcardSetAtomQuery, setFlashcardSetAtomQuery] = useState('')
  const [studyingFlashcardSetId, setStudyingFlashcardSetId] = useState<string | null>(null)
  const [studyAtomIds, setStudyAtomIds] = useState<string[]>([])
  const [studyIndex, setStudyIndex] = useState(0)
  const [studyFlipped, setStudyFlipped] = useState(false)
  const [studyDirection, setStudyDirection] = useState<StudyDirection>('term')
  const [studyShuffle, setStudyShuffle] = useState(false)
  const [studyKnownAtomIds, setStudyKnownAtomIds] = useState<string[]>([])
  const [studyLearningAtomIds, setStudyLearningAtomIds] = useState<string[]>([])
  const [draggedNoteIds, setDraggedNoteIds] = useState<string[]>([])
  const [dragOverProjectId, setDragOverProjectId] = useState('')
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [atomSearchQuery, setAtomSearchQuery] = useState('')
  const [atomProjectFilter, setAtomProjectFilter] = useState('all')
  const [atomProjectMenuOpen, setAtomProjectMenuOpen] = useState(false)
  const [atomUnderlinesVisible, setAtomUnderlinesVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [atomDialog, setAtomDialog] = useState<AtomDialog | null>(null)
  const [notice, setNotice] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchActiveIndex, setSearchActiveIndex] = useState(0)
  const [noteHistoryOpen, setNoteHistoryOpen] = useState(false)
  const [noteSnapshots, setNoteSnapshots] = useState<NoteSnapshot[]>([])
  const [historyPreviewExpanded, setHistoryPreviewExpanded] = useState<Record<string, boolean>>({})
  const [appDialog, setAppDialog] = useState<AppDialog | null>(null)
  const [templateProjectId, setTemplateProjectId] = useState<string | null>(null)
  const [activeEditorPanel, setActiveEditorPanel] = useState<EditorPanel | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiPromptFocused, setAiPromptFocused] = useState(false)
  const [highlightPaletteOpen, setHighlightPaletteOpen] = useState(false)
  const [highlighterArmed, setHighlighterArmed] = useState(false)
  const [activeAICommand, setActiveAICommand] = useState<AICommandId>('custom')
  const [aiModePillVisible, setAiModePillVisible] = useState(false)
  const [aiPromptHintDismissedFor, setAiPromptHintDismissedFor] = useState('')
  const [aiPromptHintVisible, setAiPromptHintVisible] = useState(false)
  const [blockPicker, setBlockPicker] = useState<BlockPickerState>({ open: false, blockId: '', placement: 'after', query: '' })
  const [draggedBlockId, setDraggedBlockId] = useState('')
  const [blockDropTargets, setBlockDropTargets] = useState<BlockDropTarget[]>([])
  const [formatSideControls, setFormatSideControls] = useState<FormatSideControlsRect | null>(null)
  const [formatBlockControls, setFormatBlockControls] = useState<FormatBlockControlRect[]>([])
  const [imageCropEditing, setImageCropEditing] = useState(false)
  const [imageCropDragging, setImageCropDragging] = useState(false)
  const [aiMarkingCriteria] = useState(DEFAULT_MARKING_CRITERIA)
  const [aiContextRange, setAiContextRange] = useState<EditorRange | null>(null)
  const [aiRunning, setAiRunning] = useState(false)
  const [aiInstructionUpdating, setAiInstructionUpdating] = useState(false)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [showSaveState, setShowSaveState] = useState(true)
  const [dashboardNow] = useState(() => new Date())
  const notesRef = useRef<Note[]>([])
  const selectedNoteIdRef = useRef('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const aiPromptInputRef = useRef<HTMLInputElement>(null)
  const flashcardSetTitleInputRef = useRef<HTMLInputElement>(null)
  const atomsTitleSwitcherRef = useRef<HTMLDivElement | null>(null)
  const atomProjectFilterRef = useRef<HTMLDivElement | null>(null)
  const flashcardProjectFilterRef = useRef<HTMLDivElement | null>(null)
  const aiContextRangeRef = useRef<EditorRange | null>(null)
  const highlighterArmedRef = useRef(false)
  const highlighterColorRef = useRef<string>(DEFAULT_HIGHLIGHTER_COLOR)
  const lastPaintedHighlightRangeRef = useRef('')
  const documentScrollRef = useRef<HTMLElement | null>(null)
  const sidebarOpenTimerRef = useRef<number | null>(null)
  const sidebarCloseTimerRef = useRef<number | null>(null)
  const blockEditorShellRef = useRef<HTMLDivElement | HTMLElement | null>(null)
  const createBlockAfterActiveRef = useRef<() => boolean>(() => false)
  const floatingEditorWrapRef = useRef<HTMLDivElement | null>(null)
  const formatDialogRef = useRef<HTMLElement | null>(null)
  const userScrollVetoUntilRef = useRef(0)
  const snapshotDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStateDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const atomSyncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiPromptHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressEditorPersistRef = useRef(false)
  const editorRef = useRef<TiptapEditor | null>(null)
  const blockUndoStackRef = useRef<Array<{ noteId: string; blocks: LociBlock[] }>>([])
  const pendingEnterBlockIndexRef = useRef<number | null>(null)
  const suppressProjectNavUntilRef = useRef(0)
  const imageCropDragRef = useRef<ImageCropDragState | null>(null)

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0]
  const selectedProject = projects.find((project) => project.id === selectedNote?.projectId)
  const openedProject = projects.find((project) => project.id === selectedProjectId)
  const selectedTemplateData = selectedNote
    ? normalizeTemplateData(selectedNote.templateId ?? 'blank', selectedNote.content ?? emptyDoc, selectedNote.templateData)
    : null
  const hasExplicitAIContext = Boolean(aiContextRange)
  const profileDisplayName = localProfile?.displayName ?? 'Loci Notes'
  const profileInitials = localProfile?.initials ?? 'LN'
  const profileAvatarColor = localProfile?.avatarColor ?? DEFAULT_PROFILE_COLOR
  const activeProjectForQuickNav = activeView === 'editor' ? selectedProject : openedProject
  const projectQuickNotes = useMemo(
    () =>
      activeProjectForQuickNav
        ? notes.filter((note) => note.projectId === activeProjectForQuickNav.id).sort(sortByCreated)
        : [],
    [activeProjectForQuickNav, notes],
  )
  const unassignedNotes = useMemo(() => {
    const projectIds = new Set(projects.map((project) => project.id))
    return notes
      .filter((note) => note.projectId === UNASSIGNED_PROJECT_ID || !projectIds.has(note.projectId))
      .sort(sortByUpdated)
  }, [notes, projects])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId
  }, [selectedNoteId])

  const loadData = useCallback(async () => {
    await ensureSeedData()
    const [storedNotes, storedAtoms, storedFlashcardSets, storedProjects, storedProfile, storedSettings] = await Promise.all([
      db.notes.orderBy('updatedAt').reverse().toArray(),
      db.atoms.orderBy('updatedAt').reverse().toArray(),
      db.flashcardSets.orderBy('updatedAt').reverse().toArray(),
      db.projects.orderBy('name').toArray(),
      db.userProfiles.get('local'),
      db.userSettings.get('local'),
    ])
    const normalizedSettings = normalizeUserSettings(storedSettings)
    if (!storedSettings) await db.userSettings.put(normalizedSettings)

    const projectIds = new Set(storedProjects.map((p) => p.id))

    const normalized = await Promise.all(
      storedNotes.map(async (note) => {
        const nextPid =
          note.projectId === UNASSIGNED_PROJECT_ID || projectIds.has(note.projectId)
            ? note.projectId
            : UNASSIGNED_PROJECT_ID
        const templateId = note.templateId ?? 'blank'
        const templateData = normalizeTemplateData(templateId, note.content ?? emptyDoc, note.templateData)
        const content = templateDataToContent(templateData)
        const blocks = normalizeBlocksForContent(content, note.blocks)
        const next: Note = {
          ...note,
          tags: [],
          projectId: nextPid,
          templateId,
          templateData,
          blocks,
          content,
        }

        const changed = nextPid !== note.projectId || (note.tags?.length ?? 0) > 0 || !note.templateId || !note.templateData || !note.blocks

        if (changed) await db.notes.put(next)

        return next
      }),
    )

    setNotes(normalized)
    setAtoms(storedAtoms.map((atom) => ({ ...atom, tags: atom.tags ?? [] })))
    setFlashcardSets(storedFlashcardSets.map((set) => ({ ...set, atomIds: set.atomIds ?? [] })))
    const normalizedProjects = storedProjects.map((project) => ({ ...project, description: project.description ?? '' }))
    if (storedProjects.some((project) => project.description === undefined)) {
      await db.projects.bulkPut(normalizedProjects)
    }
    setProjects(normalizedProjects)
    setLocalProfile(storedProfile ?? null)
    setUserSettings(normalizedSettings)
    setAtomSubView(normalizedSettings.preferredAtomSubView)
    setProfileLoaded(true)
    setSelectedNoteId((current) => current || normalized[0]?.id || '')
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    return () => {
      if (snapshotDebounceRef.current) clearTimeout(snapshotDebounceRef.current)
      if (saveStateDelayRef.current) clearTimeout(saveStateDelayRef.current)
      if (atomSyncDebounceRef.current) clearTimeout(atomSyncDebounceRef.current)
      if (aiPromptHintTimerRef.current) clearTimeout(aiPromptHintTimerRef.current)
    }
  }, [])

  function setEditorContentFromSync(content: JSONContent) {
    const currentEditor = editorRef.current
    if (!currentEditor) return
    const scrollEl = documentScrollRef.current
    const scrollTop = scrollEl?.scrollTop
    suppressEditorPersistRef.current = true
    currentEditor.commands.setContent(content, { emitUpdate: false })
    suppressEditorPersistRef.current = false
    if (scrollEl && scrollTop !== undefined) {
      requestAnimationFrame(() => {
        scrollEl.scrollTop = Math.min(scrollTop, scrollEl.scrollHeight - scrollEl.clientHeight)
      })
    }
  }

  async function syncAtomMarksForNotes(notesToSync: Note[], atomsToUse = atoms) {
    if (!notesToSync.length || !atomsToUse.length) return 0
    const now = nowIso()
    const updatedNotes: Note[] = []
    let markCount = 0

    notesToSync.forEach((note) => {
      const result = applyAtomsToContent(note.content, atomsToUse)
      if (!result.changed) return
      const templateData = templateDataFor(note.templateId, result.content)
      const blocks = normalizeBlocksForContent(result.content, note.blocks)
      updatedNotes.push({ ...note, content: result.content, templateData, blocks, updatedAt: now })
      markCount += result.count
    })

    if (!updatedNotes.length) return 0
    const updatedById = new Map(updatedNotes.map((note) => [note.id, note]))
    const nextNotes = notesRef.current.map((note) => updatedById.get(note.id) ?? note).sort(sortByUpdated)
    notesRef.current = nextNotes
    setNotes(nextNotes)
    await db.notes.bulkPut(updatedNotes)
    const openNote = updatedById.get(selectedNoteIdRef.current)
    if (openNote) setEditorContentFromSync(primaryTemplateContent(openNote))
    return markCount
  }

  function projectAtomsForNote(note: Note, atomsToUse = atoms) {
    const projectNotes = notesRef.current.filter((item) => item.projectId === note.projectId)
    return atomsToUse.filter((atom) => projectNotes.some((item) => contentHasAtom(item.content, atom.id)))
  }

  async function syncProjectAtomMarks(projectId: string, atomsToUse = atoms) {
    const projectNotes = notesRef.current.filter((note) => note.projectId === projectId)
    return syncAtomMarksForNotes(projectNotes, atomsToUse)
  }

  const persistNote = useCallback(async (patch: Partial<Note>, noteId = selectedNoteIdRef.current) => {
    const target = notesRef.current.find((note) => note.id === noteId)
    if (!target) return

    const nextPatch = { ...patch }
    if ((nextPatch.content || nextPatch.templateData) && !nextPatch.blocks) {
      const content = nextPatch.content ?? (nextPatch.templateData ? templateDataToContent(nextPatch.templateData) : target.content)
      nextPatch.blocks = normalizeBlocksForContent(content, target.blocks)
    }
    const updated = { ...target, ...nextPatch, updatedAt: nowIso() }
    notesRef.current = notesRef.current.map((note) => (note.id === noteId ? updated : note)).sort(sortByUpdated)
    setNotes((current) => current.map((note) => (note.id === noteId ? updated : note)).sort(sortByUpdated))
    setShowSaveState(false)
    if (saveStateDelayRef.current) clearTimeout(saveStateDelayRef.current)
    setSaving(true)
    await db.notes.put(updated)
    setSaving(false)
    saveStateDelayRef.current = setTimeout(() => {
      setShowSaveState(true)
      saveStateDelayRef.current = null
    }, 3000)

    if ('title' in patch || 'content' in patch || 'templateData' in patch) {
      const flashcards = flashcardsFromContent(updated.content)
      if (flashcards.length) {
        const changedAtoms = flashcards
          .map((card) => {
            const existing = atoms.find((atom) => atom.id === card.atomId)
            if (!existing || (existing.phrase === card.phrase && existing.definition === card.definition)) return null
            return { ...existing, phrase: card.phrase, definition: card.definition, updatedAt: nowIso() }
          })
          .filter((atom): atom is Atom => Boolean(atom))
        if (changedAtoms.length) {
          await db.atoms.bulkPut(changedAtoms)
          setAtoms((current) => current.map((atom) => changedAtoms.find((item) => item.id === atom.id) ?? atom))
        }
      }

      if (snapshotDebounceRef.current) clearTimeout(snapshotDebounceRef.current)
      snapshotDebounceRef.current = setTimeout(() => {
        snapshotDebounceRef.current = null
        void appendNoteSnapshot({
          id: updated.id,
          title: updated.title,
          content: updated.content,
        })
      }, 5000)
      if (atomSyncDebounceRef.current) clearTimeout(atomSyncDebounceRef.current)
      atomSyncDebounceRef.current = setTimeout(() => {
        atomSyncDebounceRef.current = null
        const latest = notesRef.current.find((note) => note.id === updated.id)
        if (!latest) return
        const linkedAtoms = projectAtomsForNote(latest)
        if (!linkedAtoms.length) return
        void syncAtomMarksForNotes([latest], linkedAtoms)
      }, 1200)
    }
  }, [atoms])

  const handleNoteDropTargetDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const persistNotesProject = useCallback(async (noteIds: string[], targetProjectId: string) => {
    const noteIdSet = new Set(noteIds)
    const updatedNotes = notesRef.current
      .filter((note) => noteIdSet.has(note.id) && note.projectId !== targetProjectId)
      .map((note) => ({ ...note, projectId: targetProjectId, updatedAt: nowIso() }))
    if (!updatedNotes.length) return

    const updatedById = new Map(updatedNotes.map((note) => [note.id, note]))
    const nextNotes = notesRef.current.map((note) => updatedById.get(note.id) ?? note).sort(sortByUpdated)
    notesRef.current = nextNotes
    setNotes(nextNotes)
    await db.notes.bulkPut(updatedNotes)
  }, [])

  const handleNoteDragStart = useCallback((event: React.DragEvent<HTMLElement>, noteId: string) => {
    const selectedSet = new Set(selectedNoteIds)
    const noteIds = selectedSet.has(noteId) ? selectedNoteIds.filter((id) => notesRef.current.some((note) => note.id === id)) : [noteId]
    event.dataTransfer.setData(NOTE_DRAG_MIME, noteId)
    event.dataTransfer.setData(NOTE_MULTI_DRAG_MIME, JSON.stringify(noteIds))
    event.dataTransfer.effectAllowed = 'move'
    const note = notesRef.current.find((item) => item.id === noteId)
    const previewTitle = noteIds.length > 1 ? `${noteIds.length} notes` : note?.title ?? 'Untitled Note'
    const preview = createNoteDragPreview(previewTitle)
    event.dataTransfer.setDragImage(preview, 18, 18)
    requestAnimationFrame(() => preview.remove())
    setDraggedNoteIds(noteIds)
  }, [selectedNoteIds])

  const handleNoteDragEnd = useCallback(() => {
    setDraggedNoteIds([])
    setDragOverProjectId('')
  }, [])

  const assignNoteToProjectDrop = useCallback(
    (event: React.DragEvent<HTMLElement>, targetProjectId: string) => {
      event.preventDefault()
      event.stopPropagation()
      const noteIdsPayload = event.dataTransfer.getData(NOTE_MULTI_DRAG_MIME)
      const noteIds = noteIdsPayload ? JSON.parse(noteIdsPayload) as string[] : [event.dataTransfer.getData(NOTE_DRAG_MIME)]
      const validNoteIds = Array.from(new Set(noteIds.filter(Boolean)))
      if (!validNoteIds.length) return
      suppressProjectNavUntilRef.current = Date.now() + 400
      setDraggedNoteIds([])
      setDragOverProjectId('')
      setSelectedNoteIds((current) => current.filter((id) => !validNoteIds.includes(id)))
      void persistNotesProject(validNoteIds, targetProjectId)
    },
    [persistNotesProject],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      LociImage.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true, renderWrapper: true }),
      TableRow,
      TableHeader,
      TableCell,
      LociFlashcard,
      LociQuote,
      AtomMark,
      AISelectionHighlight,
      BlockControlsExtension,
    ],
    content: primaryTemplateContent(selectedNote),
    editorProps: {
      attributes: { class: 'note-editor' },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter') return false
        pendingEnterBlockIndexRef.current = activeBlockIndex()
        if (!event.shiftKey) return false
        event.preventDefault()
        return createBlockAfterActiveRef.current()
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      if (suppressEditorPersistRef.current) return
      const id = selectedNoteIdRef.current
      const note = notesRef.current.find((item) => item.id === id)
      if (!note) return
      const templateData = updatePrimaryTemplateContent(note, updatedEditor.getJSON())
      const content = templateDataToContent(templateData)
      const activeIndex = pendingEnterBlockIndexRef.current ?? activeBlockIndex()
      pendingEnterBlockIndexRef.current = null
      const blocks = normalizeBlocksForContent(content, note.blocks, activeIndex)
      void persistNote({ templateData, content, blocks }, id)
    },
  }, [selectedNoteId])

  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  useEffect(() => {
    if (!editor || !selectedNote) return
    const nextContent = primaryTemplateContent(selectedNote)
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) setEditorContentFromSync(nextContent)
  }, [editor, selectedNote])

  useEffect(() => {
    if (!editor || !selectedNote) return
    editor.view.dispatch(editor.state.tr.setMeta(blockControlsKey, selectedNote.blocks ?? normalizeBlocksForContent(selectedNote.content)))
  }, [editor, selectedNote])

  const syncFormatSideControls = useCallback(() => {
    const shell = blockEditorShellRef.current
    const editorDom = mountedEditorDom(editor)
    const activeType: FormatBlockType | null = editor?.isActive('table') ? 'table' : editor?.isActive('lociQuote') ? 'quote' : editor?.isActive('image') ? 'image' : null
    if (!shell || !editorDom || !activeType) {
      setFormatSideControls(null)
      return
    }
    const activeElement = document.activeElement instanceof Element ? document.activeElement : null
    const selectedNode = editor.view.nodeDOM(editor.state.selection.from)
    const selectedElement = selectedNode instanceof Element ? selectedNode : selectedNode?.parentElement ?? null
    const selectionNode = activeType === 'table'
      ? editorDom.querySelector('.selectedCell')?.closest('table')
      : activeType === 'image'
        ? selectedElement?.closest('.note-editor .loci-image-frame')
        : activeElement?.closest('.note-editor .loci-quote')
    const target = selectionNode ?? (
      activeType === 'table'
        ? activeElement?.closest('.note-editor table')
        : activeType === 'image'
          ? selectedElement?.closest('.note-editor .loci-image-frame') ?? editorDom.querySelector('.loci-image-frame.ProseMirror-selectednode')
          : editorDom.querySelector('.loci-quote')
    )
    if (!(target instanceof HTMLElement)) {
      setFormatSideControls(null)
      return
    }
    const shellRect = shell.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    setFormatSideControls({
      blockId: '',
      type: activeType,
      top: targetRect.top - shellRect.top,
      left: Math.max(0, shellRect.width + 8),
    })
  }, [editor])

  const clearAIContextRange = useCallback(() => {
    aiContextRangeRef.current = null
    setAiContextRange(null)
  }, [])

  const clearAISelectionHighlight = useCallback(() => {
    clearAIContextRange()
    setAiPromptFocused(false)
    if (editor) editor.view.dispatch(editor.state.tr.setMeta(aiSelectionHighlightKey, { range: null }))
  }, [clearAIContextRange, editor])

  const captureAIContextRange = useCallback(() => {
    if (!editor) return aiContextRangeRef.current
    if (editor.state.selection.empty) return aiContextRangeRef.current
    const range = { from: editor.state.selection.from, to: editor.state.selection.to }
    aiContextRangeRef.current = range
    setAiContextRange(range)
    return range
  }, [editor])

  useEffect(() => {
    setActiveEditorPanel(null)
    setHighlighterArmed(false)
    clearAIContextRange()
    lastPaintedHighlightRangeRef.current = ''
  }, [clearAIContextRange, selectedNoteId])

  useEffect(() => {
    highlighterArmedRef.current = highlighterArmed
  }, [highlighterArmed])

  useEffect(() => {
    highlighterColorRef.current = userSettings.highlighterColor || DEFAULT_HIGHLIGHTER_COLOR
  }, [userSettings.highlighterColor])

  useEffect(() => {
    if (!editor) return
    const syncSelectionState = () => {
      const { from, to, empty } = editor.state.selection
      if (!empty && highlighterArmedRef.current) {
        const rangeKey = `${from}:${to}:${highlighterColorRef.current}`
        if (lastPaintedHighlightRangeRef.current !== rangeKey) {
          lastPaintedHighlightRangeRef.current = rangeKey
          editor.commands.setHighlight({ color: highlighterColorRef.current })
        }
      }
    }
    syncSelectionState()
    editor.on('selectionUpdate', syncSelectionState)
    editor.on('transaction', syncSelectionState)
    return () => {
      editor.off('selectionUpdate', syncSelectionState)
      editor.off('transaction', syncSelectionState)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const range = aiPromptFocused ? aiContextRange : aiResult?.selection ?? null
    editor.view.dispatch(editor.state.tr.setMeta(aiSelectionHighlightKey, { range }))
  }, [aiContextRange, aiPromptFocused, aiResult?.selection, editor])

  useEffect(() => {
    if (!activeEditorPanel) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (activeEditorPanel === 'format') {
        const dialog = formatDialogRef.current
        if (!dialog || dialog.contains(event.target as Node)) return
        setActiveEditorPanel(null)
        return
      }
      const wrap = floatingEditorWrapRef.current
      if (!wrap || wrap.contains(event.target as Node)) return
      setActiveEditorPanel(null)
    }

    document.addEventListener('mousedown', closeOnOutsidePointer)
    return () => document.removeEventListener('mousedown', closeOnOutsidePointer)
  }, [activeEditorPanel])

  useEffect(() => {
    if (!atomHeadingMenuOpen) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (atomsTitleSwitcherRef.current?.contains(event.target as Node)) return
      setAtomHeadingMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAtomHeadingMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [atomHeadingMenuOpen])

  useEffect(() => {
    if (!atomProjectMenuOpen) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (atomProjectFilterRef.current?.contains(target) || flashcardProjectFilterRef.current?.contains(target)) return
      setAtomProjectMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAtomProjectMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [atomProjectMenuOpen])

  useEffect(() => {
    if (!flashcardSetTitleEditing) return
    flashcardSetTitleInputRef.current?.focus()
    flashcardSetTitleInputRef.current?.select()
  }, [flashcardSetTitleEditing])

  useEffect(() => {
    if (!editor) return
    const clearTransientHighlights = (event: MouseEvent) => {
      const target = event.target as Node
      const editorEl = editor.view.dom
      const toolbarEl = floatingEditorWrapRef.current
      if (editorEl.contains(target) || toolbarEl?.contains(target)) return
      setHighlighterArmed(false)
      setHighlightPaletteOpen(false)
      clearAIContextRange()
    }

    document.addEventListener('mousedown', clearTransientHighlights)
    return () => document.removeEventListener('mousedown', clearTransientHighlights)
  }, [clearAIContextRange, editor])

  useEffect(() => {
    if (!editor || activeView !== 'editor' || searchOpen || atomDialog || noteHistoryOpen)
      return
    const scrollEl = documentScrollRef.current
    if (!scrollEl) return

    const veto = () => {
      userScrollVetoUntilRef.current = Date.now() + 800
    }

    const vetoKeyboardScroll = (event: KeyboardEvent) => {
      if (['PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) veto()
    }

    const adjustCaretScroll = () => {
      if (Date.now() < userScrollVetoUntilRef.current) return
      if (!editor.view) return
      const pos = editor.state.selection.from
      let coords
      try {
        coords = editor.view.coordsAtPos(pos)
      } catch {
        return
      }
      const caretMid = (coords.top + coords.bottom) / 2
      const sr = scrollEl.getBoundingClientRect()
      const rel = caretMid - sr.top
      const h = sr.height
      const topGuard = 92
      const bottomGuard = Math.min(190, h * 0.24)
      if (rel < topGuard) {
        scrollEl.scrollTop += rel - topGuard
        return
      }
      if (rel > h - bottomGuard) {
        scrollEl.scrollTop += rel - (h - bottomGuard)
      }
    }

    let rafQueued = false
    const queueAdjust = () => {
      if (rafQueued) return
      rafQueued = true
      requestAnimationFrame(() => {
        rafQueued = false
        adjustCaretScroll()
      })
    }

    const onSel = () => queueAdjust()
    const onTrx = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) queueAdjust()
    }

    editor.on('selectionUpdate', onSel)
    editor.on('transaction', onTrx)
    scrollEl.addEventListener('wheel', veto, { passive: true })
    scrollEl.addEventListener('touchmove', veto, { passive: true })
    scrollEl.addEventListener('pointerdown', veto, { passive: true })
    document.addEventListener('keydown', vetoKeyboardScroll)

    return () => {
      editor.off('selectionUpdate', onSel)
      editor.off('transaction', onTrx)
      scrollEl.removeEventListener('wheel', veto)
      scrollEl.removeEventListener('touchmove', veto)
      scrollEl.removeEventListener('pointerdown', veto)
      document.removeEventListener('keydown', vetoKeyboardScroll)
    }
  }, [
    editor,
    activeView,
    searchOpen,
    atomDialog,
    noteHistoryOpen,
  ])

  const atomCards = useMemo(() => buildAtomCards(atoms, notes, projects), [atoms, notes, projects])
  const filteredAtomCards = useMemo(() => {
    const query = normalizeSearch(atomSearchQuery)
    return atomCards.filter((card) => {
      const matchesQuery =
        !query ||
        card.atom.phrase.toLowerCase().includes(query) ||
        card.atom.definition.toLowerCase().includes(query) ||
        card.atom.tags.some((tag) => tag.toLowerCase().includes(query))
      const matchesProject =
        atomProjectFilter === 'all' ||
        (atomProjectFilter === 'none' && card.projectIds.length === 0) ||
        card.projectIds.includes(atomProjectFilter)
      return matchesQuery && matchesProject
    })
  }, [atomCards, atomProjectFilter, atomSearchQuery])
  const visibleAtomIds = useMemo(() => filteredAtomCards.map((card) => card.atom.id), [filteredAtomCards])
  const selectedVisibleAtomCount = visibleAtomIds.filter((id) => selectedAtomIds.includes(id)).length
  const allVisibleAtomsSelected = visibleAtomIds.length > 0 && selectedVisibleAtomCount === visibleAtomIds.length
  const atomProjectOptions = useMemo(
    () => [
      { value: 'all', label: 'All projects' },
      ...projects.map((project) => ({ value: project.id, label: project.name })),
      { value: 'none', label: 'No project yet' },
    ],
    [projects],
  )
  const atomProjectFilterLabel = atomProjectOptions.find((option) => option.value === atomProjectFilter)?.label ?? 'All projects'
  const editingFlashcardSet = flashcardSets.find((set) => set.id === editingFlashcardSetId) ?? null
  const studyingFlashcardSet = flashcardSets.find((set) => set.id === studyingFlashcardSetId) ?? null
  const flashcardSetDraftCards = useMemo(
    () => atomCards.filter((card) => flashcardSetDraftAtomIds.includes(card.atom.id)),
    [atomCards, flashcardSetDraftAtomIds],
  )
  const flashcardSetPickerCards = useMemo(() => {
    const query = normalizeSearch(flashcardSetAtomQuery)
    return atomCards.filter((card) => {
      if (!query) return true
      return (
        card.atom.phrase.toLowerCase().includes(query) ||
        card.atom.definition.toLowerCase().includes(query) ||
        card.projectNames.some((name) => name.toLowerCase().includes(query))
      )
    })
  }, [atomCards, flashcardSetAtomQuery])
  const studyAtoms = useMemo(() => {
    const atomById = new Map(atoms.map((atom) => [atom.id, atom]))
    return studyAtomIds.map((id) => atomById.get(id)).filter((atom): atom is Atom => Boolean(atom))
  }, [atoms, studyAtomIds])
  const activeStudyAtom = studyAtoms[studyIndex] ?? null
  const studyKnownCount = studyKnownAtomIds.length
  const studyLearningCount = studyLearningAtomIds.length
  const studyTotalCount = studyKnownCount + studyAtoms.length
  const studyRoundComplete = studyTotalCount > 0 && studyAtoms.length === 0

  const aiCommands = useMemo(
    () => {
      const base: Array<{ id: AICommandId; label: string; description: string; contextual?: boolean }> = hasExplicitAIContext
        ? [
        { id: 'custom', label: 'Custom', description: 'Run a custom instruction' },
        { id: 'rewrite', label: 'Rewrite', description: 'Improve the selected text', contextual: true },
        { id: 'atomise', label: 'Atomise', description: 'Find durable concepts', contextual: true },
        { id: 'mark', label: 'Mark writing', description: 'Assess against criteria', contextual: true },
        { id: 'summarise', label: 'Summarise', description: 'Condense the selection' },
      ]
    : [
        { id: 'custom', label: 'Custom', description: 'Run a custom instruction' },
        { id: 'continue', label: 'Continue', description: 'Keep writing in context', contextual: true },
        { id: 'summarise', label: 'Summarise', description: 'Condense this note' },
        { id: 'atomise', label: 'Atomise', description: 'Find note concepts' },
        { id: 'mark', label: 'Mark writing', description: 'Assess against criteria' },
      ]
      return base
    },
    [hasExplicitAIContext],
  )

  useEffect(() => {
    if (aiCommands.some((command) => command.id === activeAICommand)) return
    const nextCommand = aiCommands[0]?.id ?? 'custom'
    setActiveAICommand(nextCommand)
    if (nextCommand === 'custom') setAiModePillVisible(false)
  }, [activeAICommand, aiCommands])

  const cycleAICommand = (direction: 1 | -1 = 1) => {
    if (!aiCommands.length) return
    const currentIndex = Math.max(0, aiCommands.findIndex((command) => command.id === activeAICommand))
    const nextIndex = (currentIndex + direction + aiCommands.length) % aiCommands.length
    setActiveAICommand(aiCommands[nextIndex].id)
    setAiModePillVisible(aiCommands[nextIndex].id !== 'custom')
  }

  const activeAICommandMeta = aiCommands.find((command) => command.id === activeAICommand)
  const visibleAICommand = aiModePillVisible && activeAICommand !== 'custom' ? activeAICommandMeta : null
  const aiPromptHint =
    /\batomi[sz]e\b/i.test(aiPrompt)
      ? 'Press Shift+Tab to switch to Atomise'
      : /\bmark\b/i.test(aiPrompt)
        ? 'Press Shift+Tab to switch to Mark'
        : /\bsummari[sz]e|summarise|summarize\b/i.test(aiPrompt)
          ? 'Press Shift+Tab to switch to Summarise'
          : /\brewrite\b/i.test(aiPrompt)
            ? 'Press Shift+Tab to switch to Rewrite'
            : /\bcontinue\b/i.test(aiPrompt)
              ? 'Press Shift+Tab to switch to Continue'
              : ''

  useEffect(() => {
    if (aiPromptHintTimerRef.current) {
      clearTimeout(aiPromptHintTimerRef.current)
      aiPromptHintTimerRef.current = null
    }
    const promptKey = aiPrompt.trim().toLowerCase()
    if (!aiPromptHint || !promptKey || promptKey === aiPromptHintDismissedFor) {
      setAiPromptHintVisible(false)
      return
    }
    setAiPromptHintVisible(true)
    aiPromptHintTimerRef.current = setTimeout(() => {
      setAiPromptHintVisible(false)
      aiPromptHintTimerRef.current = null
    }, 4200)
  }, [aiPrompt, aiPromptHint, aiPromptHintDismissedFor])

  const dashboardStats = useMemo(() => {
    const recentNote = [...notes].sort(sortByUpdated)[0]
    const projectIds = new Set(projects.map((project) => project.id))
    const sevenDaysAgo = dashboardNow.getTime() - 6 * 24 * 60 * 60 * 1000
    const notesUpdatedThisWeek = notes.filter((note) => new Date(note.updatedAt).getTime() >= sevenDaysAgo).length
    const recentAtomCount = atoms.filter((atom) => new Date(atom.createdAt).getTime() >= sevenDaysAgo).length
    const topProjects = projects
      .map((project) => ({
        project,
        fileCount: notes.filter((note) => note.projectId === project.id).length,
        atomCount: atomCards.filter((card) => card.projectIds.includes(project.id)).length,
      }))
      .sort((a, b) => b.fileCount - a.fileCount || a.project.name.localeCompare(b.project.name))
      .slice(0, 3)
    const today = new Date(dashboardNow)
    today.setHours(0, 0, 0, 0)
    const activity = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const next = new Date(date)
      next.setDate(date.getDate() + 1)
      const count = notes.filter((note) => {
        const updated = new Date(note.updatedAt)
        return updated >= date && updated < next
      }).length
      return {
        label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1),
        count,
      }
    })
    const maxActivity = Math.max(1, ...activity.map((day) => day.count))
    const activeDayKeys = new Set(
      notes.map((note) => {
        const date = new Date(note.updatedAt)
        date.setHours(0, 0, 0, 0)
        return date.toISOString().slice(0, 10)
      }),
    )
    const todayKey = today.toISOString().slice(0, 10)
    const streakCursor = new Date(today)
    if (!activeDayKeys.has(todayKey)) streakCursor.setDate(streakCursor.getDate() - 1)
    let dailyStreak = 0
    while (activeDayKeys.has(streakCursor.toISOString().slice(0, 10))) {
      dailyStreak += 1
      streakCursor.setDate(streakCursor.getDate() - 1)
    }
    const wroteToday = activeDayKeys.has(todayKey)

    const recentNotePreviewLines = recentNote ? collectNotePreviewLines(recentNote.content, 6) : []

    return {
      recentNote,
      recentNotePreviewLines,
      recentProjectName: recentNote
        ? projects.find((project) => project.id === recentNote.projectId)?.name ?? 'Loose file'
        : 'No project yet',
      looseFileCount: notes.filter((note) => note.projectId === UNASSIGNED_PROJECT_ID || !projectIds.has(note.projectId)).length,
      dailyStreak,
      wroteToday,
      notesUpdatedThisWeek,
      recentAtomCount,
      topProjects,
      activity,
      maxActivity,
    }
  }, [atomCards, atoms, dashboardNow, notes, projects])

  const searchNormalized = useMemo(() => normalizeSearch(searchQuery), [searchQuery])

  const searchHits = useMemo((): SearchHit[] => {
    if (!searchNormalized) return []
    const matchedNotes = notes.filter((note) => {
      const contentLower = collectText(note.content ?? emptyDoc).toLowerCase()
      return (
        note.title.toLowerCase().includes(searchNormalized) ||
        contentLower.includes(searchNormalized)
      )
    })
    const matchedProjects = projects.filter((project) => project.name.toLowerCase().includes(searchNormalized))
    const matchedAtoms = atoms.filter(
      (atom) =>
        atom.phrase.toLowerCase().includes(searchNormalized) ||
        atom.definition.toLowerCase().includes(searchNormalized) ||
        (atom.tags ?? []).some((tag) => tag.toLowerCase().includes(searchNormalized)),
    )
    return [
      ...matchedNotes.map((note): SearchHit => ({ kind: 'note', note })),
      ...matchedProjects.map((project): SearchHit => ({ kind: 'project', project })),
      ...matchedAtoms.map((atom): SearchHit => ({ kind: 'atom', atom })),
    ]
  }, [atoms, notes, projects, searchNormalized])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchActiveIndex(0)
  }, [])

  const closeAppDialog = useCallback(() => {
    setAppDialog(null)
  }, [])

  const submitAppDialog = useCallback(async () => {
    const dialog = appDialog
    if (!dialog) return
    if (dialog.kind === 'prompt') {
      const value = dialog.value.trim()
      if (!value) return
      setAppDialog(null)
      await dialog.onConfirm(value, dialog.secondaryValue?.trim())
      return
    }
    setAppDialog(null)
    await dialog.onConfirm()
  }, [appDialog])

  const openProfileModal = () => {
    setProfileDraft({
      displayName: localProfile?.displayName ?? '',
      initials: localProfile?.initials ?? '',
      avatarColor: localProfile?.avatarColor ?? DEFAULT_PROFILE_COLOR,
    })
    setProfileModalOpen(true)
  }

  const saveLocalProfile = async () => {
    const displayName = profileDraft.displayName.trim()
    if (!displayName) return
    const now = nowIso()
    const profile: UserProfile = {
      id: 'local',
      displayName,
      initials: normalizeInitials(profileDraft.initials || initialsFromName(displayName)),
      avatarColor: profileDraft.avatarColor || DEFAULT_PROFILE_COLOR,
      createdAt: localProfile?.createdAt ?? now,
      updatedAt: now,
    }
    await db.userProfiles.put(profile)
    setLocalProfile(profile)
    setProfileModalOpen(false)
  }

  const saveUserSettings = async (next: UserSettings) => {
    const normalized = normalizeUserSettings({ ...next, updatedAt: nowIso() })
    await db.userSettings.put(normalized)
    setUserSettings(normalized)
  }

  const updateUserSettings = (patch: Partial<UserSettings>) => {
    void saveUserSettings({ ...userSettings, ...patch })
  }

  const updateAIProvider = (providerId: AIProviderId, patch: Partial<UserSettings['aiProviders'][AIProviderId]>) => {
    const nextProviders = {
      ...userSettings.aiProviders,
      [providerId]: {
        ...userSettings.aiProviders[providerId],
        ...patch,
      },
    }
    void saveUserSettings({ ...userSettings, aiProviders: nextProviders })
  }

  const switchAtomWorkspace = (nextView: 'atoms' | 'sets') => {
    setAtomSubView(nextView)
    setAtomHeadingMenuOpen(false)
    if (nextView === 'atoms') {
      setEditingFlashcardSetId(null)
      setStudyingFlashcardSetId(null)
      setStudyFlipped(false)
    } else {
      setAtomSelectionMode(false)
      setSelectedAtomIds([])
    }
    if (userSettings.preferredAtomSubView !== nextView) {
      updateUserSettings({ preferredAtomSubView: nextView })
    }
  }

  const requestAIText = async (taskInstruction: string, userContent: string, signal: AbortSignal) => {
    const providerId = userSettings.defaultAIProvider
    const providerMeta = aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0]
    const provider = userSettings.aiProviders[providerId]
    const apiKey = provider.apiKey.trim()
    if (!provider.enabled || !apiKey) throw new Error(`Missing ${providerMeta.name} API key.`)

    let responseText = ''
    let usage: UserSettings['aiLastUsage']
    if (providerId === 'gemini') {
      const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: taskInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
      responseText = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
      usage = extractUsage(data)
    } else if (providerId === 'openai') {
      const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify({
          model: provider.model,
          instructions: taskInstruction,
          input: userContent,
          prompt_cache_key: selectedNote?.id ?? 'loci-notes-local',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
      responseText = extractOpenAIText(data)
      usage = extractUsage(data)
    } else {
      const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }
      const body: Record<string, unknown> = {
        model: provider.model,
        messages: [
          { role: 'system', content: taskInstruction },
          { role: 'user', content: userContent },
        ],
      }
      let url = `${baseUrl}/chat/completions`
      if (providerId === 'claude') {
        url = `${baseUrl}/messages`
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
        delete headers.Authorization
        body.max_tokens = CLAUDE_REQUIRED_MAX_TOKENS
        body.system = taskInstruction
        body.messages = [{ role: 'user', content: userContent }]
      }
      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
      responseText =
        providerId === 'claude'
          ? data?.content?.map((part: { text?: string }) => part.text ?? '').join('').trim()
          : data?.choices?.[0]?.message?.content?.trim()
      usage = extractUsage(data)
    }

    if (!responseText) throw new Error(`${providerMeta.name} returned an empty response.`)
    return { providerId, providerMeta, responseText, usage }
  }

  const buildAIContext = (taskType: AITaskType, selection?: EditorRange) => {
    const appParts = [`Current view: ${activeView}`]
    if (selectedNote) appParts.push(`Note title: ${selectedNote.title}`)
    if (selectedProject) appParts.push(`Project: ${selectedProject.name}`)
    if (selectedNote) appParts.push(`Template: ${selectedNote.templateId}`)
    const parts: string[] = [`App context:\n${appParts.join('\n')}`]
    const projectMemory = parseProjectMemory(selectedProject?.description ?? '')
    if (projectMemory.summary.trim()) {
      parts.push(`Project summary:\n${projectMemory.summary.trim()}`)
    }
    if (projectMemory.instructions.trim()) {
      parts.push(`Project instructions:\n${projectMemory.instructions.trim()}`)
    }
    if (taskUsesWritingStyle(taskType) && projectMemory.writingStyle.trim()) {
      parts.push(`Project writing style:\n${projectMemory.writingStyle.trim()}`)
    }
    if (taskType === 'mark_writing') {
      const criteria = projectMemory.markingCriteria.trim() || aiMarkingCriteria.trim() || DEFAULT_MARKING_CRITERIA
      parts.push(`${projectMemory.markingCriteria.trim() ? 'Project marking criteria' : 'Default marking criteria'}:\n${criteria}`)
    }
    if (selectedProject) {
      const styleSamples = notes
        .filter((note) => note.projectId === selectedProject.id && note.id !== selectedNote?.id)
        .sort(sortByUpdated)
        .slice(0, 3)
        .map((note) => `${note.title}: ${collectNotePreviewLines(note.content, 3).join(' ') || collectText(note.content).slice(0, 260)}`)
        .filter((sample) => sample.trim().length > 0)
      if (styleSamples.length) {
        parts.push(`Writing style signals from this project:\n${styleSamples.join('\n')}`)
      }
    }
    if (editor) {
      const { from, to } = selection ?? editor.state.selection
      const selectedText = selection ? editor.state.doc.textBetween(from, to, ' ').trim() : ''
      if (selectedText) parts.push(`Selected text:\n${selectedText}`)
      const nearbyStart = Math.max(0, from - 900)
      const nearbyEnd = Math.min(editor.state.doc.content.size, to + 900)
      const nearby = editor.state.doc.textBetween(nearbyStart, nearbyEnd, '\n').trim()
      if (nearby && nearby !== selectedText) parts.push(`Nearby editor context:\n${nearby}`)
    }
    if (selectedNote) {
      const outline = collectNotePreviewLines(selectedNote.content, 8).join('\n')
      if (outline) parts.push(`Compact note outline:\n${outline}`)
      const excerptLimit = taskType === 'summarize_note' || taskType === 'answer_with_context' || taskType === 'atom_task' || taskType === 'ai_atomise' || taskType === 'mark_writing' || taskType === 'update_project_instructions' ? 4200 : 1600
      const excerpt = collectText(selectedNote.content).slice(0, excerptLimit)
      if (excerpt) parts.push(`${excerptLimit > 1600 ? 'Bounded note excerpt' : 'Short note excerpt'}:\n${excerpt}`)
    }
    const highlighted = selection ? highlightedFormatBlock(selection) : null
    if (highlighted?.block.type === 'table') {
      const tableNode = blockContentNodes(highlighted.block.content).find((node) => node.type === 'table')
      if (tableNode) {
        const table = tableDataFromNode(tableNode)
        parts.push(`Highlighted table block JSON:\n${JSON.stringify({ blockId: highlighted.block.id, columns: table.columns, rows: table.rows })}`)
      }
    }
    if (highlighted?.block.type === 'quote') {
      const quoteNode = blockContentNodes(highlighted.block.content).find((node) => node.type === 'lociQuote' || node.type === 'blockquote')
      if (quoteNode) {
        parts.push(`Highlighted quote block JSON:\n${JSON.stringify({ blockId: highlighted.block.id, ...quoteDataFromNode(quoteNode) })}`)
      }
    }
    return parts.join('\n\n')
  }

  const requestAICompletion = async (prompt: string, command: AICommandId = activeAICommand) => {
    const providerId = userSettings.defaultAIProvider
    const providerMeta = aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0]
    const provider = userSettings.aiProviders[providerId]
    const apiKey = provider.apiKey.trim()
    if (!provider.enabled || !apiKey) {
      setNotice(`Add a ${providerMeta.name} API key in Settings first.`)
      setActiveView('settings')
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: 'error',
        aiLastProvider: providerId,
        aiLastError: `Missing ${providerMeta.name} API key.`,
        aiLastRequestAt: nowIso(),
      })
      return
    }

    const selection = editor ? aiContextRangeRef.current ?? undefined : undefined
    const taskType = routeAITask(prompt, !!selection, command)
    const selectionOriginalText =
      selection && editor && taskType === 'edit_selection'
        ? editor.state.doc.textBetween(selection.from, selection.to, '\n')
        : undefined
    const actionConfig = aiActionConfig(taskType, !!selection)
    const taskInstruction = `${AI_SYSTEM_INSTRUCTION}\n\nUse the project memory sections supplied in context according to their labels. Do not treat Writing style as Marking criteria unless the criteria explicitly says style matters.\n\n${AI_TASK_CONTRACTS[taskType]}`
    const context = buildAIContext(taskType, selection)
    const userContent = `${context ? `Context:\n${context}\n\n` : ''}User request:\n${prompt.trim()}`
    const timeoutMs = userSettings.aiTimeoutMs ?? DEFAULT_AI_TIMEOUT_MS
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    setAiRunning(true)
    setNotice('')
    try {
      let responseText = ''
      let usage: UserSettings['aiLastUsage']
      if (providerId === 'gemini') {
        const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
        const response = await fetch(`${baseUrl}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: taskInstruction }] },
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
        responseText = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
        usage = extractUsage(data)
      } else if (providerId === 'openai') {
        const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
        const response = await fetch(`${baseUrl}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: provider.model,
            instructions: taskInstruction,
            input: userContent,
            prompt_cache_key: selectedNote?.id ?? 'loci-notes-local',
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
        responseText = extractOpenAIText(data)
        usage = extractUsage(data)
      } else {
        const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        }
        const body: Record<string, unknown> = {
          model: provider.model,
          messages: [
            { role: 'system', content: taskInstruction },
            { role: 'user', content: userContent },
          ],
        }
        let url = `${baseUrl}/chat/completions`
        if (providerId === 'claude') {
          url = `${baseUrl}/messages`
          headers['x-api-key'] = apiKey
          headers['anthropic-version'] = '2023-06-01'
          delete headers.Authorization
          body.max_tokens = CLAUDE_REQUIRED_MAX_TOKENS
          body.system = taskInstruction
          body.messages = [{ role: 'user', content: userContent }]
        }
        const response = await fetch(url, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify(body),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
        responseText =
          providerId === 'claude'
            ? data?.content?.map((part: { text?: string }) => part.text ?? '').join('').trim()
            : data?.choices?.[0]?.message?.content?.trim()
        usage = extractUsage(data)
      }

      if (!responseText) throw new Error(`${providerMeta.name} returned an empty response.`)
      const insertableResponse = cleanAIDraftFormatting(sanitizeAIInsertText(responseText))
      const highlighted = selection ? highlightedFormatBlock(selection) : null
      const blockPayload: AIBlockPayload | undefined =
        taskType === 'table_block'
          ? {
              kind: 'table',
              data: parseAITablePayload(responseText),
              targetBlockId: highlighted?.block.type === 'table' ? highlighted.block.id : undefined,
            }
          : taskType === 'quote_block'
            ? {
                kind: 'quote',
                data: parseAIQuotePayload(responseText),
                targetBlockId: highlighted?.block.type === 'quote' ? highlighted.block.id : undefined,
              }
            : undefined
      setAiResult({
        prompt,
        taskType,
        response: responseText,
        insertableResponse,
        draftText: insertableResponse || responseText,
        blockPayload,
        provider: providerId,
        selection,
        selectionOriginalText,
        canUpdateProjectInstructions: !!selectedProject && canResultUpdateProjectInstructions(taskType),
        ...actionConfig,
      })
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: 'success',
        aiLastProvider: providerId,
        aiLastError: '',
        aiLastUsage: usage,
        aiLastRequestAt: nowIso(),
      })
      setAiPrompt('')
      setAiPromptFocused(false)
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'AbortError'
      const message = timedOut
        ? `Timed out after ${Math.round(timeoutMs / 1000)}s.`
        : error instanceof TypeError
          ? 'The provider request was blocked by the browser or network.'
          : error instanceof Error
            ? error.message
            : 'AI request failed.'
      setNotice(`${providerMeta.name}: ${message}`)
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: timedOut ? 'timeout' : 'error',
        aiLastProvider: providerId,
        aiLastError: message,
        aiLastRequestAt: nowIso(),
      })
    } finally {
      window.clearTimeout(timeoutId)
      setAiRunning(false)
    }
  }

  const submitAIPrompt = (command: AICommandId = activeAICommand) => {
    const fallbackPrompt = defaultPromptForCommand(command, hasExplicitAIContext)
    const prompt = aiPrompt.trim() || fallbackPrompt
    if (!prompt || aiRunning) return
    void requestAICompletion(prompt, command)
  }

  const createAtomsFromAIResult = async () => {
    if (!aiResult) return
    const candidates = parseAtomCandidates(aiResult.draftText)
    if (!candidates.length) {
      setNotice('No atom candidates found in the AI response.')
      return
    }
    const now = nowIso()
    const created = candidates.map((candidate) => ({
      id: createId('atom'),
      phrase: candidate.phrase,
      definition: candidate.definition,
      tags: [],
      createdAt: now,
      updatedAt: now,
      reviewCount: 0,
      knownCount: 0,
    }))
    await db.atoms.bulkPut(created)
    setAtoms((current) => [...created, ...current])
    const markCount = selectedNote ? await syncProjectAtomMarks(selectedNote.projectId, created) : editor ? applyAtomMarksToEditor(editor, created) : 0
    setAiResult(null)
    clearAISelectionHighlight()
    setNotice(`Created ${created.length} atom${created.length === 1 ? '' : 's'}${markCount ? ` and linked ${markCount} note match${markCount === 1 ? '' : 'es'}` : ''}.`)
  }

  const draftProjectInstructionsFromAIResult = async () => {
    if (!aiResult || !selectedProject) return
    const providerId = userSettings.defaultAIProvider
    const providerMeta = aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0]
    const provider = userSettings.aiProviders[providerId]
    if (!provider.enabled || !provider.apiKey.trim()) {
      setNotice(`Add a ${providerMeta.name} API key in Settings first.`)
      setActiveView('settings')
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: 'error',
        aiLastProvider: providerId,
        aiLastError: `Missing ${providerMeta.name} API key.`,
        aiLastRequestAt: nowIso(),
      })
      return
    }

    const timeoutMs = userSettings.aiTimeoutMs ?? DEFAULT_AI_TIMEOUT_MS
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    const taskInstruction = `${AI_SYSTEM_INSTRUCTION}\n\n${AI_TASK_CONTRACTS.update_project_instructions}`
    const context = buildAIContext('update_project_instructions')
    const userContent = [
      context ? `Context:\n${context}` : '',
      `Current project memory:\n${serializeProjectMemory(parseProjectMemory(selectedProject.description ?? '')) || '(empty)'}`,
      `Latest AI task: ${aiResult.taskType}`,
      `Latest user request:\n${aiResult.prompt}`,
      `Latest editable AI draft or feedback:\n${aiResult.draftText}`,
      'Draft a replacement project description that can be saved directly.',
    ].filter(Boolean).join('\n\n')

    setAiInstructionUpdating(true)
    setNotice('')
    try {
      const result = await requestAIText(taskInstruction, userContent, controller.signal)
      const projectInstructionDraft = cleanAIDraftFormatting(sanitizeAIInsertText(result.responseText))
      setAiResult((current) => (current ? { ...current, projectInstructionDraft } : current))
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: 'success',
        aiLastProvider: result.providerId,
        aiLastError: '',
        aiLastUsage: result.usage,
        aiLastRequestAt: nowIso(),
      })
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'AbortError'
      const message = timedOut
        ? `Timed out after ${Math.round(timeoutMs / 1000)}s.`
        : error instanceof TypeError
          ? 'The provider request was blocked by the browser or network.'
          : error instanceof Error
            ? error.message
            : 'AI request failed.'
      setNotice(`${providerMeta.name}: ${message}`)
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: timedOut ? 'timeout' : 'error',
        aiLastProvider: providerId,
        aiLastError: message,
        aiLastRequestAt: nowIso(),
      })
    } finally {
      window.clearTimeout(timeoutId)
      setAiInstructionUpdating(false)
    }
  }

  const closeAIResult = () => {
    setAiResult(null)
    clearAISelectionHighlight()
  }

  const openProjectQuickNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId)
    setActiveView('editor')
    setActiveEditorPanel(null)
    setNoteHistoryOpen(false)
    setNotice('')
  }, [])

  const switchProjectQuickNote = useCallback(
    (direction: 1 | -1) => {
      if (activeView !== 'editor' || projectQuickNotes.length < 2 || !selectedNote) return
      const currentIndex = projectQuickNotes.findIndex((note) => note.id === selectedNote.id)
      if (currentIndex === -1) return
      const nextIndex = (currentIndex + direction + projectQuickNotes.length) % projectQuickNotes.length
      openProjectQuickNote(projectQuickNotes[nextIndex].id)
    },
    [activeView, openProjectQuickNote, projectQuickNotes, selectedNote],
  )

  useEffect(() => {
    const onDocKeyDown = (event: KeyboardEvent) => {
      const isProjectTabShortcut =
        (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.key === 'PageDown' || event.key === 'PageUp')
      if (isProjectTabShortcut && !appDialog && !searchOpen && !atomDialog && !noteHistoryOpen && !templateProjectId) {
        event.preventDefault()
        switchProjectQuickNote(event.key === 'PageDown' ? 1 : -1)
        return
      }
      if (event.key === 'Escape' && appDialog) {
        event.preventDefault()
        closeAppDialog()
        return
      }
      if (event.key === 'Escape' && atomDialog) {
        event.preventDefault()
        setAtomDialog(null)
        return
      }
      if (event.key === 'Escape' && profileModalOpen && localProfile) {
        event.preventDefault()
        setProfileModalOpen(false)
        return
      }
      if (event.key === 'Escape' && templateProjectId) {
        event.preventDefault()
        setTemplateProjectId(null)
        return
      }
      if (event.key === 'Escape' && activeEditorPanel) {
        event.preventDefault()
        setActiveEditorPanel(null)
        return
      }
      if (event.key === 'Escape' && imageCropEditing) {
        event.preventDefault()
        setImageCropEditing(false)
        return
      }
      if (event.key === 'Escape' && aiPromptFocused) {
        event.preventDefault()
        setAiPromptFocused(false)
        clearAIContextRange()
        aiPromptInputRef.current?.blur()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (atomDialog) return
        setSearchQuery('')
        setSearchActiveIndex(0)
        setSearchOpen((prev) => !prev)
      } else if (event.key === 'Escape' && noteHistoryOpen) {
        event.preventDefault()
        setNoteHistoryOpen(false)
      } else if (event.key === 'Escape' && searchOpen && !atomDialog) {
        event.preventDefault()
        closeSearch()
      }
    }
    document.addEventListener('keydown', onDocKeyDown)
    return () => document.removeEventListener('keydown', onDocKeyDown)
  }, [activeEditorPanel, aiPromptFocused, appDialog, atomDialog, clearAIContextRange, closeAppDialog, closeSearch, imageCropEditing, localProfile, noteHistoryOpen, profileModalOpen, searchOpen, switchProjectQuickNote, templateProjectId])

  
  useEffect(() => {
    if (!searchHits.length) {
      setSearchActiveIndex(0)
      return
    }
    setSearchActiveIndex((i) => Math.min(i, searchHits.length - 1))
  }, [searchHits.length, searchNormalized])

  useEffect(() => {
    if (!searchOpen) return
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen || !searchHits.length) return
    const active = document.querySelector<HTMLElement>('.global-search-hit.is-active')
    active?.scrollIntoView({ block: 'nearest' })
  }, [searchOpen, searchActiveIndex, searchHits.length])

  const activateHit = useCallback(
    (hit: SearchHit) => {
      switch (hit.kind) {
        case 'note':
          setSelectedNoteId(hit.note.id)
          setSelectedProjectId('')
          setActiveView('editor')
          break
        case 'project':
          setSelectedProjectId(hit.project.id)
          setActiveView('projects')
          break
        case 'atom':
          setSelectedProjectId('')
          setActiveView('atoms')
          break
      }
      closeSearch()
    },
    [closeSearch],
  )

  const openNoteHistory = useCallback(async () => {
    setActiveEditorPanel(null)
    const id = selectedNoteIdRef.current
    if (!id) return
    setNoteHistoryOpen(true)
    setHistoryPreviewExpanded({})
    const rows = await loadNoteSnapshots(id)
    setNoteSnapshots(rows)
  }, [])

  const restoreNoteSnapshot = useCallback(
    (snap: NoteSnapshot) => {
      const id = selectedNoteIdRef.current
      if (!id || snap.noteId !== id) return
      setAppDialog({
        kind: 'confirm',
        title: 'Restore saved version',
        message: 'Replace this note with this saved version? The current title and body will be overwritten.',
        confirmLabel: 'Restore',
        intent: 'danger',
      onConfirm: async () => {
          await persistNote({ title: snap.title, templateId: 'blank', templateData: { kind: 'blank', body: snap.content }, content: snap.content }, id)
          editor?.commands.setContent(snap.content)
          const rows = await loadNoteSnapshots(id)
          setNoteSnapshots(rows)
          setNoteHistoryOpen(false)
        },
      })
    },
    [editor, persistNote],
  )

  const openTemplateChooser = (projectOverrideId?: string) => {
    setActiveEditorPanel(null)
    setTemplateProjectId(projectOverrideId || UNASSIGNED_PROJECT_ID)
  }

  const createNoteFromTemplate = async (templateId: NoteTemplateId, projectOverrideId?: string) => {
    const template = getNoteTemplate(templateId)
    if (!template.available) return
    const projectId = projectOverrideId || templateProjectId || UNASSIGNED_PROJECT_ID
    const templateData = templateDataFor(templateId, template.content)
      const content = templateDataToContent(templateData)
      const blocks = templateBlocksFor(templateId, templateData)
      const note: Note = {
      id: createId('note'),
      title: template.title,
      projectId,
      templateId,
      templateData,
        blocks,
      author: profileDisplayName,
      tags: [],
        content,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    await db.notes.put(note)
    setTemplateProjectId(null)
    setNotes((current) => [note, ...current])
    setSelectedNoteId(note.id)
    setSelectedNoteIds([])
    setSelectedProjectId(projectId === UNASSIGNED_PROJECT_ID ? '' : projectId)
    setActiveView('editor')
  }

  const persistTemplateData = (templateData: NoteTemplateData) => {
    void persistNote({ templateData, content: templateDataToContent(templateData) })
  }

  const persistBlocks = (blocks: LociBlock[]) => {
    if (!selectedNote) return
    const content = contentFromBlocks(blocks)
    const templateData = updatePrimaryTemplateContent(selectedNote, content)
    void persistNote({ blocks, templateData, content: templateDataToContent(templateData) })
    if (editor) {
      const scrollEl = documentScrollRef.current
      const scrollTop = scrollEl?.scrollTop
      suppressEditorPersistRef.current = true
      editor.commands.setContent(content, { emitUpdate: false })
      editor.view.dispatch(editor.state.tr.setMeta(blockControlsKey, blocks))
      suppressEditorPersistRef.current = false
      if (scrollEl && scrollTop !== undefined) {
        requestAnimationFrame(() => {
          scrollEl.scrollTop = Math.min(scrollTop, scrollEl.scrollHeight - scrollEl.clientHeight)
        })
      }
    }
  }

  const selectedBlocks = selectedNote?.blocks ?? (selectedNote ? normalizeBlocksForContent(selectedNote.content) : [])
  const selectedBlocksKey = JSON.stringify(selectedBlocks)
  const visibleBlockPickerOptions = blockPickerOptions.filter((option) => {
    const query = blockPicker.query.trim().toLowerCase()
    if (!query) return true
    return `${option.label} ${option.description} ${option.type}`.toLowerCase().includes(query)
  })

  const highlightedFormatBlock = useCallback((range: EditorRange): { block: LociBlock; index: number } | null => {
    if (!editor) return null
    let runningPos = 1
    for (let index = 0; index < selectedBlocks.length; index += 1) {
      const block = selectedBlocks[index]
      const blockSize = blockContentNodes(block.content).reduce((total, node) => total + editor.schema.nodeFromJSON(node).nodeSize, 0)
      const blockFrom = runningPos
      const blockTo = runningPos + blockSize
      runningPos = blockTo
      const formatType = formatBlockTypeForBlock(block)
      if (!formatType) continue
      const touchesBlock = range.from < blockTo && range.to > blockFrom
      if (touchesBlock) return { block, index }
    }
    return null
  }, [editor, selectedBlocksKey])

  const measureFormatBlockControls = useCallback(() => {
    const shell = blockEditorShellRef.current
    const editorDom = mountedEditorDom(editor)
    if (!shell || !editorDom) {
      setFormatBlockControls([])
      return
    }
    const shellRect = shell.getBoundingClientRect()
    const children = Array.from(editorDom.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    let childIndex = 0
    const controls: FormatBlockControlRect[] = []
    selectedBlocks.forEach((block) => {
      const count = Math.max(1, blockContentNodes(block.content).length)
      const blockChildren = children.slice(childIndex, childIndex + count)
      childIndex += count
      const formatType = formatBlockTypeForBlock(block)
      if (!formatType || !blockChildren.length) return
      const rects = blockChildren.map((child) => child.getBoundingClientRect())
      const top = Math.min(...rects.map((rect) => rect.top))
      controls.push({
        blockId: block.id,
        type: formatType,
        top: top - shellRect.top + 3,
        left: -82,
      })
    })
    setFormatBlockControls((current) => (JSON.stringify(current) === JSON.stringify(controls) ? current : controls))
  }, [editor, selectedBlocksKey])

  useLayoutEffect(() => {
    measureFormatBlockControls()
  }, [measureFormatBlockControls])

  useEffect(() => {
    if (!editor) return
    syncFormatSideControls()
    measureFormatBlockControls()
    editor.on('selectionUpdate', syncFormatSideControls)
    editor.on('transaction', syncFormatSideControls)
    editor.on('transaction', measureFormatBlockControls)
    window.addEventListener('resize', syncFormatSideControls)
    window.addEventListener('resize', measureFormatBlockControls)
    documentScrollRef.current?.addEventListener('scroll', syncFormatSideControls)
    documentScrollRef.current?.addEventListener('scroll', measureFormatBlockControls)
    return () => {
      editor.off('selectionUpdate', syncFormatSideControls)
      editor.off('transaction', syncFormatSideControls)
      editor.off('transaction', measureFormatBlockControls)
      window.removeEventListener('resize', syncFormatSideControls)
      window.removeEventListener('resize', measureFormatBlockControls)
      documentScrollRef.current?.removeEventListener('scroll', syncFormatSideControls)
      documentScrollRef.current?.removeEventListener('scroll', measureFormatBlockControls)
    }
  }, [editor, measureFormatBlockControls, syncFormatSideControls])

  const insertBlock = (blockId: string, type: LociBlockType, placement: 'before' | 'after' = 'after') => {
    if (!selectedBlocks.length) return
    const index = selectedBlocks.findIndex((block) => block.id === blockId)
    const insertIndex = index < 0 ? selectedBlocks.length : index + (placement === 'after' ? 1 : 0)
    const nextBlocks = [...selectedBlocks]
    nextBlocks.splice(insertIndex, 0, createLociBlock(blankBlockNode(type), type))
    persistBlocks(nextBlocks)
    setBlockPicker({ open: false, blockId: '', placement: 'after', query: '' })
  }

  const insertFlashcardAfterActive = () => {
    if (!selectedNote || !selectedBlocks.length) return
    const now = nowIso()
    const atom: Atom = {
      id: createId('atom'),
      phrase: 'Question',
      definition: 'Answer',
      tags: ['Flashcard'],
      createdAt: now,
      updatedAt: now,
      reviewCount: 0,
      knownCount: 0,
    }
    const insertIndex = activeBlockIndex() + 1
    const block = createLociBlock(flashcardBlockDoc(atom.id), 'flashcard')
    block.attrs = { atomId: atom.id }
    const nextBlocks = [...selectedBlocks]
    nextBlocks.splice(insertIndex, 0, block)
    void db.atoms.put(atom)
    setAtoms((current) => [atom, ...current])
    persistBlocks(nextBlocks)
    setNotice('Flashcard block added and linked as an atom.')
  }

  const insertImageAfterActive = (src: string) => {
    if (!src) return
    if (!selectedBlocks.length) {
      editor?.chain().focus().insertContent(imageBlockDoc(src).content?.[0] ?? { type: 'image', attrs: { src } }).run()
      return
    }
    const insertIndex = Math.min(selectedBlocks.length, activeBlockIndex() + 1)
    const nextBlocks = [...selectedBlocks]
    nextBlocks.splice(insertIndex, 0, createLociBlock(imageBlockDoc(src), 'image'))
    persistBlocks(nextBlocks)
    setNotice('Image block added.')
  }

  const applyAIBlockPayload = (payload: AIBlockPayload) => {
    if (!selectedBlocks.length) return
    const content = payload.kind === 'table'
      ? tableBlockDocFromData(payload.data.columns, payload.data.rows)
      : quoteBlockDocFromData(payload.data.quote, payload.data.author)
    const type: LociBlockType = payload.kind === 'table' ? 'table' : 'quote'
    const targetIndex = payload.targetBlockId ? selectedBlocks.findIndex((block) => block.id === payload.targetBlockId) : -1
    const nextBlocks = [...selectedBlocks]
    if (targetIndex >= 0 && nextBlocks[targetIndex].type === type) {
      nextBlocks[targetIndex] = {
        ...nextBlocks[targetIndex],
        content,
        updatedAt: nowIso(),
      }
    } else {
      const insertIndex = Math.min(selectedBlocks.length, activeBlockIndex() + 1)
      nextBlocks.splice(insertIndex, 0, createLociBlock(content, type))
    }
    persistBlocks(nextBlocks)
  }

  const activeBlockIndex = () => {
    if (!editor) return Math.max(0, selectedBlocks.length - 1)
    const selectionFrom = editor.state.selection.from
    let runningPos = 1
    for (let index = 0; index < selectedBlocks.length; index += 1) {
      const blockSize = blockContentNodes(selectedBlocks[index].content).reduce((total, node) => total + editor.schema.nodeFromJSON(node).nodeSize, 0)
      if (selectionFrom <= runningPos + blockSize) return index
      runningPos += blockSize
    }
    return Math.max(0, selectedBlocks.length - 1)
  }

  const createBlockAfterActive = () => {
    if (!selectedBlocks.length) return false
    const insertIndex = activeBlockIndex() + 1
    const nextBlocks = [...selectedBlocks]
    nextBlocks.splice(insertIndex, 0, createLociBlock(blankBlockNode('paragraph'), 'paragraph'))
    persistBlocks(nextBlocks)
    requestAnimationFrame(() => {
      if (!editorRef.current) return
      const scrollEl = documentScrollRef.current
      const scrollTop = scrollEl?.scrollTop
      const pos = 1 + nextBlocks.slice(0, insertIndex).reduce(
        (total, block) => total + blockContentNodes(block.content).reduce((sum, node) => sum + editorRef.current!.schema.nodeFromJSON(node).nodeSize, 0),
        0,
      )
      editorRef.current.commands.setTextSelection(Math.max(1, pos + 1))
      editorRef.current.commands.focus(undefined, { scrollIntoView: false })
      if (scrollEl && scrollTop !== undefined) scrollEl.scrollTop = Math.min(scrollTop, scrollEl.scrollHeight - scrollEl.clientHeight)
    })
    return true
  }

  const runTableCommand = (command: 'addRow' | 'removeRow' | 'addColumn' | 'removeColumn') => {
    if (!editor) return
    const chain = editor.chain().focus()
    if (command === 'addRow') chain.addRowAfter().run()
    if (command === 'removeRow') chain.deleteRow().run()
    if (command === 'addColumn') chain.addColumnAfter().run()
    if (command === 'removeColumn') chain.deleteColumn().run()
    requestAnimationFrame(syncFormatSideControls)
  }

  const updateImageAttributes = (attrs: Partial<{
    width: number
    align: ImageAlignPreset
    cropMode: ImageCropMode
    aspect: ImageAspectPreset
    offsetX: number
    offsetY: number
    zoom: number
  }>) => {
    if (!editor) return
    editor.chain().focus().updateAttributes('image', attrs).run()
    requestAnimationFrame(() => {
      syncFormatSideControls()
      measureFormatBlockControls()
    })
  }

  const currentImageAttrs = () => {
    const attrs = editor?.getAttributes('image') ?? {}
    return {
      width: clampImageNumber(attrs.width, 25, 100, 78),
      cropMode: attrs.cropMode === 'cover' ? 'cover' as ImageCropMode : 'contain' as ImageCropMode,
      aspect: ['auto', 'square', 'wide', 'portrait'].includes(String(attrs.aspect)) ? attrs.aspect as ImageAspectPreset : 'auto',
      offsetX: clampImageNumber(attrs.offsetX, 0, 100, 50),
      offsetY: clampImageNumber(attrs.offsetY, 0, 100, 50),
      zoom: clampImageNumber(attrs.zoom, 100, 240, 100),
    }
  }

  const cycleImageAspect = () => {
    const order: ImageAspectPreset[] = ['auto', 'wide', 'square', 'portrait']
    const current = currentImageAttrs().aspect
    updateImageAttributes({ aspect: order[(order.indexOf(current) + 1) % order.length] })
  }

  const zoomImage = (delta: number) => {
    const attrs = currentImageAttrs()
    updateImageAttributes({ zoom: clampImageNumber(attrs.zoom + delta, 100, 240, 100), cropMode: 'cover', aspect: attrs.aspect === 'auto' ? 'wide' : attrs.aspect })
  }

  const selectImageFrame = (frame: HTMLElement) => {
    if (!editor) return false
    const pos = editor.view.posAtDOM(frame, 0)
    const node = editor.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'image') return false
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)))
    return true
  }

  const handleImageCropPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!imageCropEditing || !editor) return
    const frame = event.target instanceof Element ? event.target.closest<HTMLElement>('.loci-image-frame') : null
    if (!frame) return
    event.preventDefault()
    event.stopPropagation()
    if (!selectImageFrame(frame)) return
    const attrs = currentImageAttrs()
    const rect = frame.getBoundingClientRect()
    imageCropDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: attrs.offsetX,
      startOffsetY: attrs.offsetY,
      frameWidth: Math.max(1, rect.width),
      frameHeight: Math.max(1, rect.height),
    }
    setImageCropDragging(true)
    frame.setPointerCapture(event.pointerId)
  }

  const handleImageCropPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!imageCropEditing || !imageCropDragRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const drag = imageCropDragRef.current
    updateImageAttributes({
      offsetX: clampImageNumber(drag.startOffsetX - ((event.clientX - drag.startX) / drag.frameWidth) * 100, 0, 100, 50),
      offsetY: clampImageNumber(drag.startOffsetY - ((event.clientY - drag.startY) / drag.frameHeight) * 100, 0, 100, 50),
    })
  }

  const handleImageCropPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (!imageCropDragRef.current) return
    event.preventDefault()
    event.stopPropagation()
    imageCropDragRef.current = null
    setImageCropDragging(false)
  }

  const toggleQuoteAuthor = () => {
    if (!editor) return
    const { state } = editor
    let updated = false
    state.doc.descendants((node, pos) => {
      if (updated || node.type.name !== 'lociQuote') return false
      const hasAuthor = node.content.childCount > 1
      const insertPos = pos + node.nodeSize - 1
      if (hasAuthor) {
        const author = node.child(node.content.childCount - 1)
        editor.chain().focus().deleteRange({ from: insertPos - author.nodeSize, to: insertPos }).run()
      } else {
        editor.chain().focus().insertContentAt(insertPos, quoteAuthorNode()).run()
      }
      updated = true
      return false
    })
    requestAnimationFrame(syncFormatSideControls)
  }

  const renderFormatSideControls = () => {
    if (!editor || !formatSideControls) return null
    return (
      <div className="format-side-controls" style={{ top: formatSideControls.top, left: formatSideControls.left }} onMouseDown={(event) => event.preventDefault()}>
        {formatSideControls.type === 'table' && (
          <>
            <button type="button" aria-label="Add table row" onClick={() => runTableCommand('addRow')}><span aria-hidden>R+</span></button>
            <button type="button" aria-label="Remove table row" onClick={() => runTableCommand('removeRow')}><span aria-hidden>R-</span></button>
            <button type="button" aria-label="Add table column" onClick={() => runTableCommand('addColumn')}><span aria-hidden>C+</span></button>
            <button type="button" aria-label="Remove table column" onClick={() => runTableCommand('removeColumn')}><span aria-hidden>C-</span></button>
          </>
        )}
        {formatSideControls.type === 'quote' && (
          <button type="button" aria-label="Toggle quote author" onClick={toggleQuoteAuthor}><span aria-hidden>Au</span></button>
        )}
        {formatSideControls.type === 'image' && (
          <>
            <button type="button" aria-label="Fit image to page width" onClick={() => updateImageAttributes({ width: 100, cropMode: 'contain', aspect: 'auto', offsetX: 50, offsetY: 50, zoom: 100 })}><span aria-hidden>Fit</span></button>
            <button
              type="button"
              aria-label={imageCropEditing ? 'Finish cropping image' : 'Crop image'}
              onClick={() => {
                if (imageCropEditing) {
                  setImageCropEditing(false)
                  return
                }
                const attrs = currentImageAttrs()
                updateImageAttributes({ cropMode: 'cover', aspect: attrs.aspect === 'auto' ? 'wide' : attrs.aspect, zoom: Math.max(120, attrs.zoom) })
                setImageCropEditing(true)
              }}
            >
              <span aria-hidden>{imageCropEditing ? 'Done' : 'Crop'}</span>
            </button>
            <button className="format-side-control-wide" type="button" aria-label="Cycle crop aspect ratio" onClick={cycleImageAspect}><span aria-hidden>Aspect Ratio</span></button>
            {imageCropEditing && (
              <>
                <button type="button" aria-label="Zoom crop out" onClick={() => zoomImage(-10)}><span aria-hidden>Z-</span></button>
                <button type="button" aria-label="Zoom crop in" onClick={() => zoomImage(10)}><span aria-hidden>Z+</span></button>
              </>
            )}
            <button type="button" aria-label="Align image left" onClick={() => updateImageAttributes({ align: 'left' })}><span aria-hidden>L</span></button>
            <button type="button" aria-label="Align image center" onClick={() => updateImageAttributes({ align: 'center' })}><span aria-hidden>C</span></button>
            <button type="button" aria-label="Align image right" onClick={() => updateImageAttributes({ align: 'right' })}><span aria-hidden>R</span></button>
          </>
        )}
      </div>
    )
  }

  const renderFormatBlockControls = () => {
    if (!formatBlockControls.length) return null
    return (
      <div className="format-block-controls-layer" aria-hidden={false}>
        {formatBlockControls.map((control) => (
          <span
            key={control.blockId}
            className="block-hover-controls format-block-hover-controls"
            style={{ top: control.top, left: control.left }}
            data-block-id={control.blockId}
            data-block-type={control.type}
            contentEditable={false}
          >
            <button className="block-control-button block-control-delete" type="button" aria-label="Delete format block" data-block-action="delete" data-block-id={control.blockId}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
            </button>
            <button className="block-control-button" type="button" aria-label="Insert block after format block" data-block-action="insert" data-block-id={control.blockId}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            </button>
            <button className="block-control-button block-control-handle" type="button" aria-label="Move format block" draggable data-block-action="drag" data-block-id={control.blockId}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="7.5" r="1.25" /><circle cx="15" cy="7.5" r="1.25" />
                <circle cx="9" cy="12" r="1.25" /><circle cx="15" cy="12" r="1.25" />
                <circle cx="9" cy="16.5" r="1.25" /><circle cx="15" cy="16.5" r="1.25" />
              </svg>
            </button>
          </span>
        ))}
      </div>
    )
  }

  useEffect(() => {
    createBlockAfterActiveRef.current = createBlockAfterActive
  }, [createBlockAfterActive])

  const measureBlockDropTargets = () => {
    const shell = blockEditorShellRef.current
    const editorDom = editor?.view.dom
    if (!shell || !editorDom) return []
    const shellRect = shell.getBoundingClientRect()
    const children = Array.from(editorDom.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    if (!children.length) return []
    let childIndex = 0
    return selectedBlocks.flatMap((block): BlockDropTarget[] => {
      const count = Math.max(1, blockContentNodes(block.content).length)
      const blockChildren = children.slice(childIndex, childIndex + count)
      childIndex += count
      if (!blockChildren.length) return []
      const rects = blockChildren.map((child) => child.getBoundingClientRect())
      const top = Math.min(...rects.map((rect) => rect.top))
      const bottom = Math.max(...rects.map((rect) => rect.bottom))
      const left = Math.min(...rects.map((rect) => rect.left))
      const right = Math.max(...rects.map((rect) => rect.right))
      return [{
        blockId: block.id,
        top: top - shellRect.top,
        left: Math.max(0, left - shellRect.left),
        width: Math.min(shellRect.width, right - left),
        height: bottom - top,
      }]
    })
  }

  const deleteBlock = (blockId: string) => {
    if (selectedBlocks.length <= 1) return
    if (selectedNote) {
      blockUndoStackRef.current = [
        ...blockUndoStackRef.current.slice(-19),
        { noteId: selectedNote.id, blocks: cloneTemplateValue(selectedBlocks) },
      ]
    }
    persistBlocks(selectedBlocks.filter((block) => block.id !== blockId))
  }

  const moveBlockToIndex = (blockId: string, dropIndex: number) => {
    const sourceIndex = selectedBlocks.findIndex((block) => block.id === blockId)
    if (sourceIndex < 0) return
    const boundedDropIndex = Math.max(0, Math.min(dropIndex, selectedBlocks.length))
    if (boundedDropIndex === sourceIndex || boundedDropIndex === sourceIndex + 1) return
    const nextBlocks = [...selectedBlocks]
    const [block] = nextBlocks.splice(sourceIndex, 1)
    const adjustedIndex = boundedDropIndex > sourceIndex ? boundedDropIndex - 1 : boundedDropIndex
    nextBlocks.splice(adjustedIndex, 0, block)
    persistBlocks(nextBlocks)
  }

  const moveBlockBelowTarget = (blockId: string, targetBlockId: string) => {
    const targetIndex = selectedBlocks.findIndex((block) => block.id === targetBlockId)
    if (targetIndex < 0) return
    moveBlockToIndex(blockId, targetIndex + 1)
  }

  const handleBlockControlsClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-block-action]') : null
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    const blockId = target.dataset.blockId ?? ''
    const action = target.dataset.blockAction ?? ''
    if (!blockId) return
    if (action === 'insert') setBlockPicker({ open: true, blockId, placement: 'after', query: '' })
    if (action === 'delete') deleteBlock(blockId)
  }

  const handleBlockDragStart = (event: React.DragEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-block-action="drag"]') : null
    if (!target?.dataset.blockId) {
      event.preventDefault()
      return
    }
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-loci-block', target.dataset.blockId)
    event.dataTransfer.setDragImage(target, 11, 11)
    setDraggedBlockId(target.dataset.blockId)
    requestAnimationFrame(() => setBlockDropTargets(measureBlockDropTargets()))
  }

  const handleBlockDropTargetDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleBlockDropTargetDrop = (event: React.DragEvent<HTMLElement>, targetBlockId: string) => {
    const blockId = event.dataTransfer.getData('application/x-loci-block') || draggedBlockId
    if (!blockId) return
    event.preventDefault()
    event.stopPropagation()
    moveBlockBelowTarget(blockId, targetBlockId)
    setDraggedBlockId('')
    setBlockDropTargets([])
  }

  const handleBlockDragEnd = () => {
    setDraggedBlockId('')
    setBlockDropTargets([])
  }

  const renderBlockDropOverlay = () =>
    draggedBlockId ? (
      <div className="block-drop-overlay" aria-hidden>
        {blockDropTargets
          .filter((target) => target.blockId !== draggedBlockId)
          .map((target) => (
          <span
            key={target.blockId}
            className="block-drop-target"
            style={{ top: target.top, left: target.left, width: target.width, height: target.height }}
            onDragOver={handleBlockDropTargetDragOver}
            onDrop={(event) => handleBlockDropTargetDrop(event, target.blockId)}
          />
        ))}
      </div>
    ) : null

  useEffect(() => {
    const restoreDeletedBlock = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey) return
      const activeElement = document.activeElement
      if (!editor?.isFocused && !editor?.view.dom.contains(activeElement)) return
      const latest = blockUndoStackRef.current.at(-1)
      if (!latest || latest.noteId !== selectedNoteIdRef.current) return
      event.preventDefault()
      event.stopPropagation()
      blockUndoStackRef.current = blockUndoStackRef.current.slice(0, -1)
      persistBlocks(cloneTemplateValue(latest.blocks))
    }

    document.addEventListener('keydown', restoreDeletedBlock, true)
    return () => document.removeEventListener('keydown', restoreDeletedBlock, true)
  }, [editor, persistBlocks])

  const updatePlannerTask = (taskId: string, patch: Partial<TemplateTask>) => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'planner') return
    persistTemplateData({
      ...selectedTemplateData,
      tasks: selectedTemplateData.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    })
  }

  const updatePlannerSchedule = (itemId: string, patch: Partial<TemplateScheduleItem>) => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'planner') return
    persistTemplateData({
      ...selectedTemplateData,
      schedule: selectedTemplateData.schedule.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    })
  }

  const addPlannerTask = () => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'planner') return
    persistTemplateData({
      ...selectedTemplateData,
      tasks: [...selectedTemplateData.tasks, { id: createId('task'), text: 'New task', done: false }],
    })
  }

  const removePlannerTask = (taskId: string) => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'planner') return
    persistTemplateData({
      ...selectedTemplateData,
      tasks: selectedTemplateData.tasks.filter((task) => task.id !== taskId),
    })
  }

  const addPlannerSchedule = () => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'planner') return
    persistTemplateData({
      ...selectedTemplateData,
      schedule: [...selectedTemplateData.schedule, { id: createId('schedule'), time: '09:00', text: 'New block' }],
    })
  }

  const removePlannerSchedule = (itemId: string) => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'planner') return
    persistTemplateData({
      ...selectedTemplateData,
      schedule: selectedTemplateData.schedule.filter((item) => item.id !== itemId),
    })
  }

  const addSlide = () => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'slideshow') return
    const slide: TemplateSlide = {
      id: createId('slide'),
      title: `Slide ${selectedTemplateData.slides.length + 1}`,
      body: blankDoc('Add slide content.'),
      speakerNotes: '',
    }
    persistTemplateData({
      ...selectedTemplateData,
      activeSlideId: slide.id,
      slides: [...selectedTemplateData.slides, slide],
    })
  }

  const updateSlide = (slideId: string, patch: Partial<TemplateSlide>) => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'slideshow') return
    persistTemplateData({
      ...selectedTemplateData,
      slides: selectedTemplateData.slides.map((slide) => (slide.id === slideId ? { ...slide, ...patch } : slide)),
    })
  }

  const removeSlide = (slideId: string) => {
    if (!selectedTemplateData || selectedTemplateData.kind !== 'slideshow' || selectedTemplateData.slides.length <= 1) return
    const slides = selectedTemplateData.slides.filter((slide) => slide.id !== slideId)
    persistTemplateData({
      ...selectedTemplateData,
      activeSlideId: slides[0]?.id ?? '',
      slides,
    })
  }

  const deleteNote = async (noteOverride?: Note) => {
    const note = noteOverride ?? selectedNote
    if (!note) return
    setAppDialog({
      kind: 'confirm',
      title: 'Delete note',
      message: `Delete "${note.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      intent: 'danger',
      onConfirm: async () => {
        await db.transaction('rw', db.notes, db.noteSnapshots, async () => {
          await db.notes.delete(note.id)
          await db.noteSnapshots.where('noteId').equals(note.id).delete()
        })
        const remaining = notesRef.current.filter((item) => item.id !== note.id)
        notesRef.current = remaining
        setNotes(remaining)
        if (selectedNoteIdRef.current === note.id) {
          setSelectedNoteId(remaining[0]?.id ?? '')
        }
        setActiveEditorPanel(null)
        setNoteHistoryOpen(false)
        setNotice('')
        if (selectedNoteIdRef.current === note.id) setActiveView(remaining.length ? 'editor' : 'home')
      },
    })
  }

  const deleteSelectedAtoms = async () => {
    const atomIds = selectedAtomIds.filter((id) => atoms.some((atom) => atom.id === id))
    if (!atomIds.length) return
    setAppDialog({
      kind: 'confirm',
      title: `Delete ${atomIds.length} atom${atomIds.length === 1 ? '' : 's'}`,
      message: 'The text will stay in your notes, but the atom links will be removed.',
      confirmLabel: 'Delete',
      intent: 'danger',
      onConfirm: async () => {
        const atomIdSet = new Set(atomIds)
        const touchedNotes = notes
          .filter((note) => collectAtomIds(note.content).some((atomId) => atomIdSet.has(atomId)))
          .map((note) => ({ ...note, content: stripAtomMarks(note.content, atomIdSet), updatedAt: nowIso() }))
        const updatedSets = flashcardSets
          .map((set) => ({ ...set, atomIds: set.atomIds.filter((atomId) => !atomIdSet.has(atomId)), updatedAt: nowIso() }))
          .filter((set, index) => set.atomIds.length !== flashcardSets[index].atomIds.length)

        await db.transaction('rw', db.atoms, db.notes, db.flashcardSets, async () => {
          await db.atoms.bulkDelete(atomIds)
          if (touchedNotes.length) await db.notes.bulkPut(touchedNotes)
          if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
        })

        setAtoms((current) => current.filter((item) => !atomIdSet.has(item.id)))
        if (updatedSets.length) {
          setFlashcardSets((current) =>
            current.map((set) => updatedSets.find((updated) => updated.id === set.id) ?? set),
          )
        }
        setFlippedAtomIds((current) => current.filter((id) => !atomIdSet.has(id)))
        setSelectedAtomIds([])
        setAtomSelectionMode(false)
        setNotes((current) =>
          current
            .map((note) => touchedNotes.find((updated) => updated.id === note.id) ?? note)
            .sort(sortByUpdated),
        )
      },
    })
  }

  const toggleSelectVisibleAtoms = () => {
    setAtomSelectionMode(true)
    setSelectedAtomIds((current) => {
      if (allVisibleAtomsSelected) return current.filter((id) => !visibleAtomIds.includes(id))
      return Array.from(new Set([...current, ...visibleAtomIds]))
    })
  }

  const openCreateFlashcardSet = (atomIds = selectedAtomIds) => {
    setEditingFlashcardSetId(null)
    setFlashcardSetTitleEditing(false)
    setFlashcardSetDraftName('')
    setFlashcardSetDraftDescription('')
    setFlashcardSetDraftAtomIds(Array.from(new Set(atomIds.filter((id) => atoms.some((atom) => atom.id === id)))))
    setFlashcardSetAtomQuery('')
    setAtomSelectionMode(false)
    setSelectedAtomIds([])
    setAtomSubView('set-edit')
  }

  const openEditFlashcardSet = (set: FlashcardSet) => {
    setEditingFlashcardSetId(set.id)
    setFlashcardSetTitleEditing(false)
    setFlashcardSetDraftName(set.name)
    setFlashcardSetDraftDescription(set.description ?? '')
    setFlashcardSetDraftAtomIds(set.atomIds.filter((id) => atoms.some((atom) => atom.id === id)))
    setFlashcardSetAtomQuery('')
    setAtomSubView('set-edit')
  }

  const saveFlashcardSet = async () => {
    const name = flashcardSetDraftName.trim()
    if (!name || !flashcardSetDraftAtomIds.length) return
    const now = nowIso()
    const existing = editingFlashcardSet
    const next: FlashcardSet = {
      id: existing?.id ?? createId('set'),
      name,
      description: flashcardSetDraftDescription.trim(),
      atomIds: Array.from(new Set(flashcardSetDraftAtomIds)),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastStudiedAt: existing?.lastStudiedAt,
    }
    await db.flashcardSets.put(next)
    setFlashcardSets((current) =>
      [next, ...current.filter((set) => set.id !== next.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    )
    setEditingFlashcardSetId(null)
    setAtomSubView('sets')
  }

  const deleteFlashcardSet = async (set: FlashcardSet) => {
    setAppDialog({
      kind: 'confirm',
      title: 'Delete flashcard set',
      message: `Delete "${set.name}"? The atoms will stay in your library.`,
      confirmLabel: 'Delete',
      intent: 'danger',
      onConfirm: async () => {
        await db.flashcardSets.delete(set.id)
        setFlashcardSets((current) => current.filter((item) => item.id !== set.id))
        if (studyingFlashcardSetId === set.id) {
          setStudyingFlashcardSetId(null)
          setAtomSubView('sets')
        }
      },
    })
  }

  const toggleFlashcardSetAtom = (atomId: string) => {
    setFlashcardSetDraftAtomIds((current) =>
      current.includes(atomId) ? current.filter((id) => id !== atomId) : [...current, atomId],
    )
  }

  const startFlashcardStudy = async (set: FlashcardSet) => {
    const availableIds = set.atomIds.filter((id) => atoms.some((atom) => atom.id === id))
    const nextIds = studyShuffle ? shuffleList(availableIds) : availableIds
    if (!nextIds.length) return
    const now = nowIso()
    const updatedSet = { ...set, lastStudiedAt: now }
    await db.flashcardSets.put(updatedSet)
    setFlashcardSets((current) => current.map((item) => (item.id === set.id ? updatedSet : item)))
    setStudyingFlashcardSetId(set.id)
    setStudyAtomIds(nextIds)
    setStudyIndex(0)
    setStudyFlipped(false)
    setStudyKnownAtomIds([])
    setStudyLearningAtomIds([])
    setAtomSubView('study')
  }

  const moveStudyCard = (direction: 1 | -1) => {
    setStudyIndex((current) => {
      if (!studyAtoms.length) return 0
      return (current + direction + studyAtoms.length) % studyAtoms.length
    })
    setStudyFlipped(false)
  }

  const markStudyCardAgain = () => {
    if (!activeStudyAtom) return
    const atomId = activeStudyAtom.id
    setStudyLearningAtomIds((current) => (current.includes(atomId) ? current : [...current, atomId]))
    setStudyAtomIds((current) => {
      if (current.length <= 1) return current
      const withoutCurrent = current.filter((id) => id !== atomId)
      return [...withoutCurrent, atomId]
    })
    setStudyIndex((current) => {
      if (studyAtoms.length <= 1) return 0
      return Math.min(current, studyAtoms.length - 2)
    })
    setStudyFlipped(false)
  }

  const markStudyCardKnown = () => {
    if (!activeStudyAtom) return
    const atomId = activeStudyAtom.id
    setStudyKnownAtomIds((current) => (current.includes(atomId) ? current : [...current, atomId]))
    setStudyLearningAtomIds((current) => current.filter((id) => id !== atomId))
    setStudyAtomIds((current) => current.filter((id) => id !== atomId))
    setStudyIndex((current) => {
      if (studyAtoms.length <= 1) return 0
      return Math.min(current, studyAtoms.length - 2)
    })
    setStudyFlipped(false)
  }

  const restartStudyRound = () => {
    if (!studyingFlashcardSet) return
    const availableIds = studyingFlashcardSet.atomIds.filter((id) => atoms.some((atom) => atom.id === id))
    setStudyAtomIds(studyShuffle ? shuffleList(availableIds) : availableIds)
    setStudyKnownAtomIds([])
    setStudyLearningAtomIds([])
    setStudyIndex(0)
    setStudyFlipped(false)
  }

  const deleteProject = async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const projectNotes = notes.filter((note) => note.projectId === projectId)
    const projectNoteIds = new Set(projectNotes.map((note) => note.id))
    const deletedProjectAtomIds = new Set(projectNotes.flatMap((note) => collectAtomIds(note.content)))
    const keptNotes = notes.filter((note) => note.projectId !== projectId)
    const keptAtomIds = new Set(keptNotes.flatMap((note) => collectAtomIds(note.content)))
    const atomIdsToDelete = Array.from(deletedProjectAtomIds).filter((atomId) => !keptAtomIds.has(atomId))

    setAppDialog({
      kind: 'confirm',
      title: 'Delete project',
      message: `Delete "${project.name}"? This will delete ${projectNotes.length} files and ${atomIdsToDelete.length} project-only atoms.`,
      confirmLabel: 'Delete',
      intent: 'danger',
      onConfirm: async () => {
        const snapshots = await db.noteSnapshots.toArray()
        const snapshotIdsToDelete = snapshots.filter((snapshot) => projectNoteIds.has(snapshot.noteId)).map((snapshot) => snapshot.id)

        const deletedAtomIdSet = new Set(atomIdsToDelete)
        const updatedSets = flashcardSets
          .map((set) => ({ ...set, atomIds: set.atomIds.filter((atomId) => !deletedAtomIdSet.has(atomId)), updatedAt: nowIso() }))
          .filter((set, index) => set.atomIds.length !== flashcardSets[index].atomIds.length)

        await db.transaction('rw', [db.projects, db.notes, db.atoms, db.noteSnapshots, db.flashcardSets], async () => {
          await db.projects.delete(projectId)
          if (projectNotes.length) await db.notes.bulkDelete(projectNotes.map((note) => note.id))
          if (snapshotIdsToDelete.length) await db.noteSnapshots.bulkDelete(snapshotIdsToDelete)
          if (atomIdsToDelete.length) await db.atoms.bulkDelete(atomIdsToDelete)
          if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
        })

        setProjects((current) => current.filter((item) => item.id !== projectId))
        setNotes(keptNotes.sort(sortByUpdated))
        setAtoms((current) => current.filter((atom) => !atomIdsToDelete.includes(atom.id)))
        if (updatedSets.length) {
          setFlashcardSets((current) =>
            current.map((set) => updatedSets.find((updated) => updated.id === set.id) ?? set),
          )
        }
        setFlippedAtomIds((current) => current.filter((id) => !atomIdsToDelete.includes(id)))
        setSelectedProjectId('')
        if (selectedNote && projectNoteIds.has(selectedNote.id)) {
          setSelectedNoteId(keptNotes[0]?.id ?? '')
          setActiveView(keptNotes.length ? 'editor' : 'projects')
        }
      },
    })
  }

  const createProject = async () => {
    setAppDialog({
      kind: 'prompt',
      title: 'New project',
      label: 'Project name',
      value: '',
      placeholder: 'Project name',
      secondaryLabel: 'Description',
      secondaryValue: '',
      secondaryPlaceholder: 'What belongs here?',
      confirmLabel: 'Create project',
      onConfirm: async (name, description) => {
        const project: Project = { id: createId('project'), name, description: description ?? '', color: '#111111', createdAt: nowIso() }
        await db.projects.put(project)
        setProjects((current) => [...current, project].sort((a, b) => a.name.localeCompare(b.name)))
      },
    })
  }

  const duplicateProject = async (project: Project) => {
    const duplicatedProject: Project = {
      ...project,
      id: createId('project'),
      name: `${project.name} Copy`,
      createdAt: nowIso(),
    }
    await db.projects.put(duplicatedProject)
    setProjects((current) => [...current, duplicatedProject].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const updateProjectDescription = async (projectId: string, description: string) => {
    await db.projects.update(projectId, { description })
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, description } : project)))
  }

  const updateProjectName = async (projectId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    await db.projects.update(projectId, { name: nextName })
    setProjects((current) =>
      current
        .map((project) => (project.id === projectId ? { ...project, name: nextName } : project))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  const atomiseSelection = () => {
    if (!editor) return
    const { from, to, empty } = editor.state.selection
    if (selectionContainsAtom(editor)) {
      const chain = editor.chain().focus()
      if (empty) chain.extendMarkRange('atom')
      chain.unsetAtom().run()
      setActiveEditorPanel(null)
      setNotice('Atom link removed.')
      return
    }

    if (empty) {
      setNotice('')
      setActiveEditorPanel(null)
      setAtomDialog({
        phrase: '',
        definition: '',
        mode: 'manual',
      })
      return
    }

    const phrase = editor.state.doc.textBetween(from, to, ' ').trim()
    if (!phrase) return
    const existing = atoms.find((atom) => atom.phrase.toLowerCase() === phrase.toLowerCase())
    setNotice('')
    setAtomDialog({
      phrase,
      definition: existing?.definition ?? '',
      existingId: existing?.id,
      from,
      to,
      mode: 'selection',
    })
  }

  const saveAtomDialog = async () => {
    if (!atomDialog || !editor || !atomDialog.definition.trim() || !atomDialog.phrase.trim()) return
    const phrase = atomDialog.phrase.trim()
    const existing =
      atomDialog.existingId
        ? atoms.find((atom) => atom.id === atomDialog.existingId)
        : atoms.find((item) => item.phrase.toLowerCase() === phrase.toLowerCase())
    const atom: Atom = {
      id: existing?.id ?? createId('atom'),
      phrase: existing?.phrase ?? phrase,
      definition: atomDialog.definition.trim(),
      tags: [],
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      reviewCount: existing?.reviewCount ?? 0,
      knownCount: existing?.knownCount ?? 0,
    }

    await db.atoms.put(atom)
    setAtoms((current) => [atom, ...current.filter((item) => item.id !== atom.id)])
    const markCount = selectedNote ? await syncProjectAtomMarks(selectedNote.projectId, [atom]) : applyAtomMarksToEditor(editor, [atom])
    setNotice(markCount > 1 ? `Atomised ${markCount} matches.` : '')
    setAtomDialog(null)
  }

  const addLink = () => {
    if (!editor) return
    setAppDialog({
      kind: 'prompt',
      title: 'Add link',
      label: 'URL',
      value: '',
      placeholder: 'https://example.com',
      confirmLabel: 'Add link',
      onConfirm: (href) => {
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
      },
    })
  }

  const addImage = () => {
    if (!editor) return
    setAppDialog({
      kind: 'prompt',
      title: 'Add image',
      label: 'Image URL',
      value: '',
      placeholder: 'https://example.com/image.jpg',
      confirmLabel: 'Add image',
      onConfirm: (src) => {
        insertImageAfterActive(src.trim())
      },
    })
  }

  const toggleHighlight = (color = userSettings.highlighterColor || DEFAULT_HIGHLIGHTER_COLOR) => {
    if (!editor) return
    if (editor.state.selection.empty) {
      setHighlighterArmed((armed) => !armed)
      lastPaintedHighlightRangeRef.current = ''
      editor.chain().focus().run()
      return
    }
    editor.chain().focus().toggleHighlight({ color }).run()
    setHighlighterArmed(false)
  }

  const selectHighlighterColor = (color: string) => {
    updateUserSettings({ highlighterColor: color })
    setHighlightPaletteOpen(false)
    if (editor && !editor.state.selection.empty) {
      editor.chain().focus().toggleHighlight({ color }).run()
      setHighlighterArmed(false)
      return
    }
    setHighlighterArmed(true)
    lastPaintedHighlightRangeRef.current = ''
    editor?.chain().focus().run()
  }

  const clearFormatting = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetAllMarks().clearNodes().run()
    setHighlighterArmed(false)
    setHighlightPaletteOpen(false)
    lastPaintedHighlightRangeRef.current = ''
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const handleClearFormattingShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== '\\' || !editor.isFocused) return
      event.preventDefault()
      clearFormatting()
    }

    document.addEventListener('keydown', handleClearFormattingShortcut)
    return () => document.removeEventListener('keydown', handleClearFormattingShortcut)
  }, [clearFormatting, editor])

  const formatOptions: FormatOption[] = [
    {
      id: 'heading-1',
      label: 'Heading 1',
      icon: Heading1,
      description: 'Promote the current line to a top-level heading.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      icon: Heading2,
      description: 'Create a section heading for the current line.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      icon: Heading3,
      description: 'Create a compact subheading.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'checklist',
      label: 'Checklist',
      icon: Keyboard,
      description: 'Turn the current lines into tappable tasks.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleTaskList().run(),
    },
    {
      id: 'table',
      label: 'Table',
      icon: Table2,
      description: 'Add a structured study grid.',
      group: 'Structure',
      enabled: true,
      action: () => {
        if (!editor) return
        editor.chain().focus().insertTable({ rows: 4, cols: 2, withHeaderRow: true }).run()
      },
    },
    {
      id: 'flashcard',
      label: 'Flashcard',
      icon: Brain,
      description: 'Add a question and answer atom card.',
      group: 'Structure',
      enabled: true,
      action: () => insertFlashcardAfterActive(),
    },
    {
      id: 'highlight',
      label: 'Highlight',
      icon: Keyboard,
      description: 'Highlight selected text with the current colour.',
      group: 'Text',
      enabled: true,
      action: () => toggleHighlight(),
    },
    {
      id: 'clear-formatting',
      label: 'Clear formatting',
      icon: RemoveFormatting,
      description: 'Remove marks, links, highlight, headings, and list formatting. Shortcut: Ctrl+\\.',
      group: 'Text',
      enabled: true,
      action: clearFormatting,
    },
    {
      id: 'columns',
      label: 'Columns',
      icon: Columns3,
      description: 'Future: split a section into side-by-side lanes.',
      group: 'Advanced blocks',
      enabled: false,
      comingSoonLabel: 'Coming soon',
    },
    {
      id: 'link',
      label: 'Link',
      icon: LinkIcon,
      description: 'Attach a URL to selected text.',
      group: 'Insert',
      enabled: true,
      action: addLink,
    },
    {
      id: 'image',
      label: 'Image',
      icon: ImageIcon,
      description: 'Insert an image from a URL.',
      group: 'Insert',
      enabled: true,
      action: addImage,
    },
    {
      id: 'code-block',
      label: 'Code block',
      icon: Code2,
      description: 'Future: frameless code with language selection and export styling.',
      group: 'Advanced blocks',
      enabled: false,
      comingSoonLabel: 'Coming soon',
    },
    {
      id: 'chart',
      label: 'Chart',
      icon: ChartNoAxesColumn,
      description: 'Future: structured chart data with clean PDF/DOCX output.',
      group: 'Advanced blocks',
      enabled: false,
      comingSoonLabel: 'Coming soon',
    },
    {
      id: 'latex',
      label: 'LaTeX',
      icon: Sigma,
      description: 'Future: inline equation input with visual export fallback.',
      group: 'Advanced blocks',
      enabled: false,
      comingSoonLabel: 'Coming soon',
    },
  ]

  const formatGroups: Array<FormatOption['group']> = ['Structure', 'Text', 'Insert', 'Advanced blocks']

  const startWindowDrag = () => {
    if (!window.__TAURI_INTERNALS__) return
    void getCurrentWindow().startDragging()
  }
  const minimizeWindow = () => {
    if (!window.__TAURI_INTERNALS__) return
    void getCurrentWindow().minimize()
  }
  const toggleMaximizeWindow = () => {
    if (!window.__TAURI_INTERNALS__) return
    void getCurrentWindow().toggleMaximize()
  }
  const closeWindow = () => {
    if (!window.__TAURI_INTERNALS__) return
    void getCurrentWindow().close()
  }

  const clearSidebarOpenTimer = () => {
    if (!sidebarOpenTimerRef.current) return
    clearTimeout(sidebarOpenTimerRef.current)
    sidebarOpenTimerRef.current = null
  }

  const clearSidebarCloseTimer = () => {
    if (!sidebarCloseTimerRef.current) return
    clearTimeout(sidebarCloseTimerRef.current)
    sidebarCloseTimerRef.current = null
  }

  const handleSidebarPointerEnter = () => {
    clearSidebarCloseTimer()
    if (sidebarPinned || sidebarHovered || sidebarOpenTimerRef.current) return
    sidebarOpenTimerRef.current = window.setTimeout(() => {
      sidebarOpenTimerRef.current = null
      setSidebarHovered(true)
    }, 40)
  }

  const handleSidebarPointerLeave = () => {
    clearSidebarOpenTimer()
    if (sidebarPinned || sidebarCloseTimerRef.current) return
    sidebarCloseTimerRef.current = window.setTimeout(() => {
      sidebarCloseTimerRef.current = null
      setSidebarHovered(false)
    }, 180)
  }

  const toggleSidebarPinned = () => {
    clearSidebarOpenTimer()
    clearSidebarCloseTimer()
    setSidebarPinned((value) => !value)
  }

  const sidebarOpen = sidebarPinned || sidebarHovered
  const shellClassName = [
    'app-shell',
    sidebarPinned ? 'sidebar-is-pinned' : '',
    sidebarOpen ? 'sidebar-is-open' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const sidebarClassName = [
    'sidebar',
    sidebarOpen ? 'is-open' : 'is-collapsed',
    sidebarPinned ? 'is-pinned' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main className="app-stage">
      <header className="custom-titlebar" onMouseDown={startWindowDrag}>
        <div className="custom-titlebar-drag">
          <span>Loci Notes</span>
        </div>
        <div className="custom-titlebar-controls" onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Minimize window" onClick={minimizeWindow}>−</button>
          <button type="button" aria-label="Maximize window" onClick={toggleMaximizeWindow}>□</button>
          <button type="button" className="is-close" aria-label="Close window" onClick={closeWindow}>×</button>
        </div>
      </header>
      <section className={shellClassName} aria-label="Loci Notes">
        <aside
          className={sidebarClassName}
          onPointerEnter={handleSidebarPointerEnter}
          onPointerLeave={handleSidebarPointerLeave}
        >
          <div className="sidebar-actions">
            <button
              className="nav-action"
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSearchActiveIndex(0)
                setSearchOpen(true)
              }}
            >
              <Search size={18} />
              <span className="nav-label">Search</span>
            </button>

            <button className="nav-action" type="button" onClick={() => openTemplateChooser()}>
              <Plus size={18} />
              <span className="nav-label">New Note</span>
            </button>
          </div>

          <nav className="primary-nav" aria-label="Primary">
            <button className={activeView === 'home' ? 'active' : ''} type="button" onClick={() => setActiveView('home')}>
              <Home size={18} />
              <span className="nav-label">Home</span>
            </button>
            <button
              className={`project-nav-trigger ${activeView === 'projects' ? 'active' : ''} ${draggedNoteIds.length ? 'is-drop-target' : ''} ${dragOverProjectId === UNASSIGNED_PROJECT_ID ? 'is-drop-active' : ''}`}
              type="button"
              onDragOver={handleNoteDropTargetDragOver}
              onDragEnter={() => setDragOverProjectId(UNASSIGNED_PROJECT_ID)}
              onDragLeave={() => setDragOverProjectId((current) => (current === UNASSIGNED_PROJECT_ID ? '' : current))}
              onDrop={(event) => assignNoteToProjectDrop(event, UNASSIGNED_PROJECT_ID)}
              onClick={() => setActiveView('projects')}
            >
              <Layers3 size={18} />
              <span className="nav-label">{activeProjectForQuickNav?.name ?? 'Projects'}</span>
              {activeProjectForQuickNav && projectQuickNotes.length > 1 && (
                <kbd aria-label="Ctrl Page Up or Down">Ctrl Pg</kbd>
              )}
            </button>
            {sidebarOpen && activeProjectForQuickNav && projectQuickNotes.length > 0 && (
              <div className="project-quick-nav" aria-label={`${activeProjectForQuickNav.name} documents`}>
                {projectQuickNotes.map((note) => (
                  <div
                    className={note.id === selectedNote?.id ? 'is-active' : ''}
                    key={note.id}
                  >
                    <button type="button" onClick={() => openProjectQuickNote(note.id)}>
                      <span>{note.title || 'Untitled Note'}</span>
                    </button>
                    <button type="button" className="quick-note-delete" aria-label={`Delete ${note.title || 'Untitled Note'}`} onClick={() => void deleteNote(note)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className={activeView === 'atoms' ? 'active' : ''} type="button" onClick={() => setActiveView('atoms')}>
              <Brain size={18} />
              <span className="nav-label">{atomSubView === 'sets' || atomSubView === 'set-edit' || atomSubView === 'study' ? 'Sets' : 'Atoms'}</span>
            </button>
          </nav>

          <div className="sidebar-bottom">
            <button className="profile-row" type="button" onClick={openProfileModal} aria-label="Open profile">
              <div className="avatar" style={{ background: profileAvatarColor }}>{profileInitials}</div>
              <div className="profile-text">
                <strong>{profileDisplayName}</strong>
                <span>Loci Notes</span>
              </div>
            </button>

            <div className="sidebar-bottom-controls">
              <button
                className="sidebar-pin"
                type="button"
                aria-label={sidebarPinned ? 'Collapse sidebar' : 'Pin sidebar open'}
                aria-pressed={sidebarPinned}
                onClick={toggleSidebarPinned}
              >
                {sidebarPinned ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
              {sidebarOpen && (
                <button
                  className={`sidebar-settings ${activeView === 'settings' ? 'active' : ''}`}
                  type="button"
                  aria-label="Settings"
                  onClick={() => setActiveView('settings')}
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {activeView === 'home' && (
          <section className="main-pane dashboard-pane">
            <div className="home-intro-strip">
              <div>
                <strong>Good to see you</strong>
              </div>
              <p>{notes.length} notes · {atoms.length} atoms · {projects.length} projects</p>
            </div>
            <div className="dashboard-bento">
              <DashboardPanel title="Today Snapshot" className="bento-tile bento-hero">
                <div className="snapshot-main">
                  <strong>{notes.length}</strong>
                  <span>notes in motion</span>
                </div>
                <div className="snapshot-metrics">
                  <span><b>{atoms.length}</b> atoms</span>
                  <span><b>{projects.length}</b> projects</span>
                  <span><b>{dashboardStats.looseFileCount}</b> loose</span>
                </div>
                <div className="soft-orbit" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </DashboardPanel>

              <DashboardPanel title="Continue Writing" className="bento-tile bento-continue">
                {dashboardStats.recentNote ? (
                  <button
                    className="continue-note-card"
                    type="button"
                    onClick={() => {
                      setSelectedNoteId(dashboardStats.recentNote.id)
                      setActiveView('editor')
                    }}
                  >
                    <div className="continue-note-card-head">
                      <span className="continue-note-project">{dashboardStats.recentProjectName}</span>
                      <strong>{dashboardStats.recentNote.title}</strong>
                    </div>
                    <div
                      className={`continue-note-preview${dashboardStats.recentNotePreviewLines.length ? '' : ' is-empty'}`}
                    >
                      {dashboardStats.recentNotePreviewLines.length
                        ? dashboardStats.recentNotePreviewLines.map((line, index) => (
                            <span key={index} className="continue-note-preview-row">{line}</span>
                          ))
                        : (
                            <span className="continue-note-preview-row">Empty file</span>
                          )}
                    </div>
                    <div className="continue-note-footer">
                      <span className="continue-note-date">{formatDay(dashboardStats.recentNote.updatedAt)}</span>
                      <span className="open-note-pill">Open note</span>
                    </div>
                  </button>
                ) : (
                  <div className="dashboard-empty">No notes yet.</div>
                )}
              </DashboardPanel>

              <DashboardPanel title="Daily Streak" className="bento-tile bento-streak">
                <div className="streak-stack">
                  <div className="streak-counter">
                    <strong>{dashboardStats.dailyStreak}</strong>
                    <span>day{dashboardStats.dailyStreak === 1 ? '' : 's'}</span>
                  </div>
                  <p>{dashboardStats.wroteToday ? 'You wrote today.' : 'Write today to extend it.'}</p>
                </div>
                <button type="button" onClick={() => openTemplateChooser()}>Write note</button>
              </DashboardPanel>

              <DashboardPanel title="Projects Pulse" className="bento-tile bento-projects">
                {dashboardStats.topProjects.length ? (
                  dashboardStats.topProjects.map(({ project, fileCount, atomCount }) => (
                    <button
                      className="project-pulse-row"
                      type="button"
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id)
                        setActiveView('projects')
                      }}
                    >
                      <span style={{ background: project.color }} />
                      <strong>{project.name}</strong>
                      <small>{fileCount} files · {atomCount} atoms</small>
                    </button>
                  ))
                ) : (
                  <div className="dashboard-empty">No projects yet.</div>
                )}
              </DashboardPanel>

              <DashboardPanel title="Loose Files Inbox" className="bento-tile bento-inbox">
                <strong>{dashboardStats.looseFileCount}</strong>
                <p>{dashboardStats.looseFileCount === 1 ? 'file waiting to be sorted' : 'files waiting to be sorted'}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId('')
                    setActiveView('projects')
                  }}
                >
                  Sort files
                </button>
              </DashboardPanel>

              <DashboardPanel title="Writing Activity" className="bento-tile bento-activity">
                <div className="activity-bars" aria-label="Notes updated in the last seven days">
                  {dashboardStats.activity.map((day, index) => (
                    <span key={`${day.label}-${index}`}>
                      <i style={{ height: `${Math.max(12, (day.count / dashboardStats.maxActivity) * 100)}%` }} />
                      <b>{day.label}</b>
                    </span>
                  ))}
                </div>
              </DashboardPanel>

              <div className="bento-growth-actions-row">
                <DashboardPanel title="Knowledge Growth" className="bento-tile bento-growth">
                  <strong>{atoms.length}</strong>
                  <p>{dashboardStats.recentAtomCount} new this week</p>
                  <div className="growth-line" aria-hidden>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </DashboardPanel>

                <DashboardPanel title="Quick Actions" className="bento-tile bento-actions">
                  <div className="widget-actions stacked">
                    <button type="button" onClick={() => openTemplateChooser()}><Plus size={16} /> New note</button>
                    <button type="button" onClick={() => { setSelectedProjectId(''); setActiveView('projects') }}><Layers3 size={16} /> Projects</button>
                    <button type="button" onClick={() => setActiveView('atoms')}><Brain size={16} /> {atomSubView === 'sets' || atomSubView === 'set-edit' || atomSubView === 'study' ? 'Sets' : 'Atoms'}</button>
                  </div>
                </DashboardPanel>
              </div>
            </div>
          </section>
        )}

        {activeView === 'editor' && selectedNote && (
          <section className="main-pane editor-pane" ref={documentScrollRef}>
            <div className="document-scroll">
              <div className="breadcrumbs">
                <button
                  className={`compact-back-button ${draggedNoteIds.length ? 'is-drop-target' : ''} ${dragOverProjectId === UNASSIGNED_PROJECT_ID ? 'is-drop-active' : ''}`}
                  type="button"
                  aria-label={selectedProject ? `Back to ${selectedProject.name}` : 'Back to Projects'}
                  onDragOver={handleNoteDropTargetDragOver}
                  onDragEnter={() => setDragOverProjectId(UNASSIGNED_PROJECT_ID)}
                  onDragLeave={() => setDragOverProjectId((current) => (current === UNASSIGNED_PROJECT_ID ? '' : current))}
                  onDrop={(event) => assignNoteToProjectDrop(event, UNASSIGNED_PROJECT_ID)}
                  onClick={() => {
                    setSelectedProjectId(selectedProject?.id ?? '')
                    setActiveView('projects')
                  }}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  className={`breadcrumb-button ${draggedNoteIds.length ? 'is-drop-target' : ''} ${dragOverProjectId === UNASSIGNED_PROJECT_ID ? 'is-drop-active' : ''}`}
                  type="button"
                  onDragOver={handleNoteDropTargetDragOver}
                  onDragEnter={() => setDragOverProjectId(UNASSIGNED_PROJECT_ID)}
                  onDragLeave={() => setDragOverProjectId((current) => (current === UNASSIGNED_PROJECT_ID ? '' : current))}
                  onDrop={(event) => assignNoteToProjectDrop(event, UNASSIGNED_PROJECT_ID)}
                  onClick={() => {
                    setSelectedProjectId('')
                    setActiveView('projects')
                  }}
                >
                  Projects
                </button>
                <span>/</span>
                <button
                  className="breadcrumb-button"
                  type="button"
                  onClick={() => {
                    if (selectedProject) {
                      setSelectedProjectId(selectedProject.id)
                    } else {
                      setSelectedProjectId('')
                    }
                    setActiveView('projects')
                  }}
                >
                  {selectedProject?.name ?? 'Unassigned'}
                </button>
                <span>/</span>
                <button className="breadcrumb-button is-current" type="button" aria-current="page">
                  {selectedNote.title}
                </button>
              </div>

              <article className={`document-card ${atomUnderlinesVisible ? '' : 'hide-atom-underlines'}`}>
                <input className="title-input" value={selectedNote.title} onChange={(event) => void persistNote({ title: event.target.value })} />
                {notice && <div className="notice">{notice}</div>}
                {selectedTemplateData?.kind === 'report' && (
                  <div className="template-editor report-editor">
                    <input
                      className="template-subtitle-input"
                      value={selectedTemplateData.subtitle}
                      onChange={(event) => persistTemplateData({ ...selectedTemplateData, subtitle: event.target.value })}
                      placeholder="Report subtitle"
                    />
                    <label>
                      Executive summary
                      <textarea value={selectedTemplateData.summary} onChange={(event) => persistTemplateData({ ...selectedTemplateData, summary: event.target.value })} />
                    </label>
                    <div className="template-two-column">
                      <label>
                        Findings
                        <textarea value={selectedTemplateData.findings} onChange={(event) => persistTemplateData({ ...selectedTemplateData, findings: event.target.value })} />
                      </label>
                      <label>
                        Recommendations
                        <textarea value={selectedTemplateData.recommendations} onChange={(event) => persistTemplateData({ ...selectedTemplateData, recommendations: event.target.value })} />
                      </label>
                    </div>
                    <section ref={(node) => { blockEditorShellRef.current = node }} className={`template-rich-section block-editor-shell ${draggedBlockId ? 'is-dragging-block' : ''} ${imageCropEditing ? 'is-cropping-image' : ''} ${imageCropDragging ? 'is-cropping-image-dragging' : ''}`} onClick={handleBlockControlsClick} onPointerDown={handleImageCropPointerDown} onPointerMove={handleImageCropPointerMove} onPointerUp={handleImageCropPointerEnd} onPointerCancel={handleImageCropPointerEnd} onDragStart={handleBlockDragStart} onDragEnd={handleBlockDragEnd}>
                      <span>Appendix / body</span>
                      <EditorContent editor={editor} />
                      {renderFormatBlockControls()}
                      {renderFormatSideControls()}
                      {renderBlockDropOverlay()}
                    </section>
                  </div>
                )}
                {selectedTemplateData?.kind === 'planner' && (
                  <div className="template-editor planner-editor">
                    <label className="planner-date">
                      Date
                      <input type="date" value={selectedTemplateData.date} onChange={(event) => persistTemplateData({ ...selectedTemplateData, date: event.target.value })} />
                    </label>
                    <section>
                      <span>Priorities</span>
                      <div className="planner-priorities">
                        {selectedTemplateData.priorities.map((priority, index) => (
                          <input
                            key={index}
                            value={priority}
                            onChange={(event) => {
                              const priorities = [...selectedTemplateData.priorities]
                              priorities[index] = event.target.value
                              persistTemplateData({ ...selectedTemplateData, priorities })
                            }}
                            placeholder={`Priority ${index + 1}`}
                          />
                        ))}
                      </div>
                    </section>
                    <section>
                      <span>Tasks</span>
                      <div className="planner-list">
                        {selectedTemplateData.tasks.map((task) => (
                          <label key={task.id} className="planner-task-row">
                            <input type="checkbox" checked={task.done} onChange={(event) => updatePlannerTask(task.id, { done: event.target.checked })} />
                            <input value={task.text} onChange={(event) => updatePlannerTask(task.id, { text: event.target.value })} />
                            <button className="template-icon-button" type="button" aria-label="Remove task" onClick={() => removePlannerTask(task.id)}><X size={14} /></button>
                          </label>
                        ))}
                      </div>
                      <button className="template-soft-action" type="button" onClick={addPlannerTask}>Add task</button>
                    </section>
                    <section>
                      <span>Schedule</span>
                      <div className="planner-list">
                        {selectedTemplateData.schedule.map((item) => (
                          <div key={item.id} className="planner-schedule-row">
                            <input type="time" value={item.time} onChange={(event) => updatePlannerSchedule(item.id, { time: event.target.value })} />
                            <input value={item.text} onChange={(event) => updatePlannerSchedule(item.id, { text: event.target.value })} />
                            <button className="template-icon-button" type="button" aria-label="Remove schedule block" onClick={() => removePlannerSchedule(item.id)}><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                      <button className="template-soft-action" type="button" onClick={addPlannerSchedule}>Add schedule block</button>
                    </section>
                    <section ref={(node) => { blockEditorShellRef.current = node }} className={`template-rich-section block-editor-shell ${draggedBlockId ? 'is-dragging-block' : ''} ${imageCropEditing ? 'is-cropping-image' : ''} ${imageCropDragging ? 'is-cropping-image-dragging' : ''}`} onClick={handleBlockControlsClick} onPointerDown={handleImageCropPointerDown} onPointerMove={handleImageCropPointerMove} onPointerUp={handleImageCropPointerEnd} onPointerCancel={handleImageCropPointerEnd} onDragStart={handleBlockDragStart} onDragEnd={handleBlockDragEnd}>
                      <span>Notes</span>
                      <EditorContent editor={editor} />
                      {renderFormatBlockControls()}
                      {renderFormatSideControls()}
                      {renderBlockDropOverlay()}
                    </section>
                  </div>
                )}
                {selectedTemplateData?.kind === 'slideshow' && (
                  <div className="template-editor slideshow-editor">
                    <div className="slide-strip">
                      {selectedTemplateData.slides.map((slide, index) => (
                        <button
                          key={slide.id}
                          className={slide.id === selectedTemplateData.activeSlideId ? 'is-active' : ''}
                          type="button"
                          onClick={() => persistTemplateData({ ...selectedTemplateData, activeSlideId: slide.id })}
                        >
                          <span>{index + 1}</span>
                          <strong>{slide.title || 'Untitled slide'}</strong>
                        </button>
                      ))}
                      <button type="button" onClick={addSlide}>+ Slide</button>
                    </div>
                    {(() => {
                      const slide = selectedTemplateData.slides.find((item) => item.id === selectedTemplateData.activeSlideId) ?? selectedTemplateData.slides[0]
                      if (!slide) return null
                      return (
                        <section className="slide-stage">
                          <input value={slide.title} onChange={(event) => updateSlide(slide.id, { title: event.target.value })} placeholder="Slide title" />
                          <div ref={(node) => { blockEditorShellRef.current = node }} className={`block-editor-shell ${draggedBlockId ? 'is-dragging-block' : ''} ${imageCropEditing ? 'is-cropping-image' : ''} ${imageCropDragging ? 'is-cropping-image-dragging' : ''}`} onClick={handleBlockControlsClick} onPointerDown={handleImageCropPointerDown} onPointerMove={handleImageCropPointerMove} onPointerUp={handleImageCropPointerEnd} onPointerCancel={handleImageCropPointerEnd} onDragStart={handleBlockDragStart} onDragEnd={handleBlockDragEnd}>
                            <EditorContent editor={editor} />
                            {renderFormatBlockControls()}
                            {renderFormatSideControls()}
                            {renderBlockDropOverlay()}
                          </div>
                          <label>
                            Speaker notes
                            <textarea value={slide.speakerNotes} onChange={(event) => updateSlide(slide.id, { speakerNotes: event.target.value })} />
                          </label>
                          <button className="template-soft-action danger" type="button" onClick={() => removeSlide(slide.id)}>Remove slide</button>
                        </section>
                      )
                    })()}
                  </div>
                )}
                {(!selectedTemplateData || selectedTemplateData.kind === 'blank') && (
                  <div ref={(node) => { blockEditorShellRef.current = node }} className={`block-editor-shell ${draggedBlockId ? 'is-dragging-block' : ''} ${imageCropEditing ? 'is-cropping-image' : ''} ${imageCropDragging ? 'is-cropping-image-dragging' : ''}`} onClick={handleBlockControlsClick} onPointerDown={handleImageCropPointerDown} onPointerMove={handleImageCropPointerMove} onPointerUp={handleImageCropPointerEnd} onPointerCancel={handleImageCropPointerEnd} onDragStart={handleBlockDragStart} onDragEnd={handleBlockDragEnd}>
                    <EditorContent editor={editor} />
                    {renderFormatBlockControls()}
                    {renderFormatSideControls()}
                    {renderBlockDropOverlay()}
                  </div>
                )}
              </article>
              {blockPicker.open && (
                <div className="block-picker-backdrop" role="presentation" onMouseDown={() => setBlockPicker({ open: false, blockId: '', placement: 'after', query: '' })}>
                  <div className="block-picker-dialog" role="dialog" aria-label="Insert block" onMouseDown={(event) => event.stopPropagation()}>
                    <label className="block-picker-search">
                      <Search size={15} aria-hidden />
                      <input
                        value={blockPicker.query}
                        onChange={(event) => setBlockPicker((current) => ({ ...current, query: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setBlockPicker({ open: false, blockId: '', placement: 'after', query: '' })
                          if (event.key === 'Enter' && visibleBlockPickerOptions[0]) insertBlock(blockPicker.blockId, visibleBlockPickerOptions[0].type, blockPicker.placement)
                        }}
                        placeholder="Search blocks..."
                        autoFocus
                      />
                    </label>
                    <div className="block-picker-list">
                      {visibleBlockPickerOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <button key={option.type} type="button" onClick={() => insertBlock(blockPicker.blockId, option.type, blockPicker.placement)}>
                            <Icon size={16} aria-hidden />
                            <span>
                              <strong>{option.label}</strong>
                              <small>{option.description}</small>
                            </span>
                          </button>
                        )
                      })}
                      {!visibleBlockPickerOptions.length && <p>No blocks found.</p>}
                    </div>
                  </div>
                </div>
              )}
              <div className="floating-editor-wrap" ref={floatingEditorWrapRef}>
                {activeEditorPanel === 'more' && (
                  <div className="floating-editor-panel">
                    {activeEditorPanel === 'more' && (
                      <>
                        <span className="panel-kicker">More options</span>
                        <div className="more-option-grid">
                          <button
                            type="button"
                            className="more-toggle-row"
                            aria-pressed={atomUnderlinesVisible}
                            onClick={() => setAtomUnderlinesVisible((visible) => !visible)}
                          >
                            <span><Info size={16} /> Atom underlines</span>
                            <strong>{atomUnderlinesVisible ? 'On' : 'Off'}</strong>
                          </button>
                          <button type="button" onClick={() => void openNoteHistory()}><History size={16} /> Note history</button>
                          <button type="button" onClick={() => void exportNotePdf(selectedNote, selectedProject)}><Download size={16} /> PDF</button>
                          <button type="button" onClick={() => void exportNoteDocx(selectedNote, selectedProject, atoms)}><FileText size={16} /> DOCX</button>
                          <button type="button" className="danger" onClick={() => void deleteNote()}><Trash2 size={16} /> Delete note</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className={`floating-editor-bar ${aiPromptFocused ? 'is-prompt-open' : ''} ${aiRunning ? 'is-thinking' : ''}`} role="toolbar" aria-label="Editor tools">
                  <button type="button" onClick={atomiseSelection}><Sparkles size={16} /> Atomise</button>
                  <button type="button" onClick={() => setActiveEditorPanel((panel) => (panel === 'format' ? null : 'format'))}><Heading2 size={16} /> Format</button>
                  <div className="highlight-tool">
                    <button
                      type="button"
                      className={`highlight-button ${highlighterArmed ? 'is-armed' : ''}`}
                      aria-label="Highlight"
                      title={highlighterArmed ? 'Highlight mode active' : 'Highlight selected text'}
                      aria-pressed={highlighterArmed}
                      aria-expanded={highlightPaletteOpen}
                      onClick={() => toggleHighlight()}
                      onDoubleClick={(event) => {
                        event.preventDefault()
                        setHighlightPaletteOpen((open) => !open)
                      }}
                    >
                      <svg className="highlight-icon" viewBox="0 0 24 24" aria-hidden>
                        <path d="M4 20h16" />
                        <path d="M14.5 4.5 19 9l-8.7 8.7-4.5-4.5z" />
                        <path d="m5.8 13.2-1.2 4.2 4.2-1.2" />
                      </svg>
                      <span className="highlight-swatch" style={{ background: userSettings.highlighterColor }} aria-hidden />
                    </button>
                    {highlightPaletteOpen && (
                      <div className="highlight-palette" aria-label="Highlight colours">
                        {HIGHLIGHTER_COLORS.map((color) => (
                          <button
                            type="button"
                            key={color}
                            className={color === userSettings.highlighterColor ? 'is-active' : ''}
                            style={{ background: color }}
                            aria-label={`Use highlight colour ${color}`}
                            onClick={() => selectHighlighterColor(color)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <label
                    className={`floating-ai-prompt ${aiPromptFocused ? 'is-open' : ''}`}
                    onMouseDown={() => {
                      const range = captureAIContextRange()
                      if (editor) editor.view.dispatch(editor.state.tr.setMeta(aiSelectionHighlightKey, { range }))
                    }}
                  >
                    <Sparkles size={16} aria-hidden />
                    {visibleAICommand && (
                      <span className={`ai-mode-pill ai-mode-pill--${activeAICommand}`}>
                        <span aria-hidden />
                        {visibleAICommand.label}
                      </span>
                    )}
                    <input
                      ref={aiPromptInputRef}
                      value={aiPrompt}
                      onFocus={() => {
                        const range = captureAIContextRange()
                        if (editor) editor.view.dispatch(editor.state.tr.setMeta(aiSelectionHighlightKey, { range }))
                        setAiPromptFocused(true)
                        setActiveEditorPanel(null)
                      }}
                      onBlur={() => {
                        setAiPromptFocused(false)
                        if (!aiRunning) clearAIContextRange()
                      }}
                      onChange={(event) => {
                        setAiPrompt(event.target.value)
                        if (event.target.value.trim().toLowerCase() !== aiPromptHintDismissedFor) {
                          setAiPromptHintDismissedFor('')
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Tab' && event.shiftKey) {
                          event.preventDefault()
                          cycleAICommand(1)
                          return
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          setAiPromptFocused(false)
                          clearAIContextRange()
                          aiPromptInputRef.current?.blur()
                          return
                        }
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          submitAIPrompt()
                        }
                      }}
                      disabled={aiRunning}
                      placeholder={aiRunning ? 'Working...' : defaultPromptForCommand(activeAICommand, hasExplicitAIContext) || 'Tell AI what to do...'}
                    />
                    {aiPromptHintVisible && aiPromptHint && (
                      <span className="ai-prompt-hint">
                        {aiPromptHint}
                        <button
                          type="button"
                          aria-label="Dismiss prompt hint"
                          onClick={(event) => {
                            event.preventDefault()
                            setAiPromptHintVisible(false)
                            setAiPromptHintDismissedFor(aiPrompt.trim().toLowerCase())
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                  </label>
                  <span className={`floating-save-state ${showSaveState ? 'is-visible' : ''}`}>{showSaveState ? (saving ? 'Saving...' : 'Saved') : ''}</span>
                  <button type="button" aria-label="More options" onClick={() => setActiveEditorPanel((panel) => (panel === 'more' ? null : 'more'))}><MoreHorizontal size={18} /></button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === 'editor' && selectedNote && activeEditorPanel === 'format' && (
          <div
            className="modal-backdrop format-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setActiveEditorPanel(null)
            }}
          >
            <section
              className="format-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="format-dialog-title"
              ref={formatDialogRef}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <span className="panel-kicker">Format</span>
              <h2 id="format-dialog-title">Choose formatting</h2>
              <p>Shape the active writing field or insert a simple block.</p>
              <div className="format-dialog-grid">
                {formatGroups.map((group) => (
                  <section className="format-option-section" key={group}>
                    <span>{group}</span>
                    <div className="format-option-grid">
                      {formatOptions
                        .filter((option) => option.group === group)
                        .map((option) => {
                          const Icon = option.icon
                          return (
                            <button
                              type="button"
                              className={option.enabled ? '' : 'is-disabled'}
                              disabled={!option.enabled}
                              key={option.id}
                              onClick={() => {
                                option.action?.()
                                setActiveEditorPanel(null)
                              }}
                            >
                              <Icon size={18} aria-hidden />
                              <span>
                                <strong>{option.label}</strong>
                                <small>{option.description}</small>
                              </span>
                              {!option.enabled && <em>{option.comingSoonLabel}</em>}
                            </button>
                          )
                        })}
                    </div>
                  </section>
                ))}
              </div>
              <footer>
                <button type="button" onClick={() => setActiveEditorPanel(null)}>Cancel</button>
              </footer>
            </section>
          </div>
        )}

        {activeView === 'projects' && (
          <section className="main-pane compact-pane">
            {openedProject ? (
              <ProjectDetail
                project={openedProject}
                notes={notes}
                atomCards={atomCards}
                draggedNoteIds={draggedNoteIds}
                selectedNoteIds={selectedNoteIds}
                onNoteDragStart={handleNoteDragStart}
                onNoteDragEnd={handleNoteDragEnd}
                onNoteSelect={setSelectedNoteIds}
                deleteNote={(note) => void deleteNote(note)}
                openNote={(noteId) => {
                  setSelectedNoteId(noteId)
                  setActiveView('editor')
                }}
                newNote={() => openTemplateChooser(openedProject.id)}
                deleteProject={() => void deleteProject(openedProject.id)}
                updateDescription={(description) => void updateProjectDescription(openedProject.id, description)}
                updateName={(name) => void updateProjectName(openedProject.id, name)}
                back={() => setSelectedProjectId('')}
              />
            ) : (
              <>
                <PageHeader title="Projects" action={<button type="button" onClick={createProject}><Plus size={17} /> Add project</button>} />
                <div className="project-grid">
                  {projects.map((project) => {
                    const projectNotes = notes.filter((note) => note.projectId === project.id)
                    const recentNote = [...projectNotes].sort(sortByUpdated)[0]
                    const isDropActive = dragOverProjectId === project.id
                    const openProject = () => {
                      if (Date.now() < suppressProjectNavUntilRef.current) return
                      setSelectedProjectId(project.id)
                    }
                    return (
                      <div
                        key={project.id}
                        className={`project-row ${draggedNoteIds.length ? 'is-drop-target' : ''} ${isDropActive ? 'is-drop-active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onDragOver={handleNoteDropTargetDragOver}
                        onDragEnter={() => setDragOverProjectId(project.id)}
                        onDragLeave={() => setDragOverProjectId((current) => (current === project.id ? '' : current))}
                        onDrop={(event) => assignNoteToProjectDrop(event, project.id)}
                        onClick={openProject}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return
                          event.preventDefault()
                          openProject()
                        }}
                      >
                        <span className="project-row-main">
                          <strong>{project.name}</strong>
                          <p>{project.description?.trim() || 'No description yet'}</p>
                          {recentNote && <small>Recent: {recentNote.title}</small>}
                        </span>
                        <span className="project-row-actions">
                          <span className="project-card-type-icon" aria-label="Project">
                            <Layers3 size={22} />
                          </span>
                          <button
                            type="button"
                            className="project-duplicate-button"
                            aria-label={`Duplicate ${project.name}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              void duplicateProject(project)
                            }}
                          >
                            Duplicate
                          </button>
                        </span>
                      </div>
                    )
                  })}
                  {unassignedNotes.map((note) => {
                    const isSelected = selectedNoteIds.includes(note.id)
                    const isDragging = draggedNoteIds.includes(note.id)
                    const NoteTypeIcon = noteTemplateIcons[note.templateId ?? 'blank']
                    return (
                      <div
                        className={`project-loose-note-row ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-selected={isSelected}
                        onDragStart={(event) => handleNoteDragStart(event, note.id)}
                        onDragEnd={handleNoteDragEnd}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedNoteId(note.id)
                            setActiveView('editor')
                          }
                        }}
                        onClick={(event) => {
                          if (event.shiftKey) {
                            setSelectedNoteIds((current) =>
                              current.includes(note.id)
                                ? current.filter((id) => id !== note.id)
                                : [...current, note.id],
                            )
                            return
                          }
                          setSelectedNoteIds([])
                          setSelectedNoteId(note.id)
                          setActiveView('editor')
                        }}
                      >
                        <span className="project-row-main">
                          <strong>{note.title}</strong>
                          <p>{collectText(note.content) || 'Empty note'}</p>
                          <small>Unsorted</small>
                        </span>
                        <span className="project-loose-note-actions">
                          <span className="project-card-type-icon" aria-label={getNoteTemplate(note.templateId ?? 'blank').name}>
                            <NoteTypeIcon size={22} />
                          </span>
                          <button
                            type="button"
                            className="note-row-delete"
                            aria-label={`Delete ${note.title || 'Untitled Note'}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              void deleteNote(note)
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {activeView === 'atoms' && (
          <section className="main-pane compact-pane">
            <PageHeader
              title={
                <div className="atoms-title-switcher" ref={atomsTitleSwitcherRef}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={atomHeadingMenuOpen}
                    onClick={() => setAtomHeadingMenuOpen((open) => !open)}
                  >
                    {atomSubView === 'sets' || atomSubView === 'set-edit' || atomSubView === 'study' ? 'Sets' : 'Atoms'}
                    <ChevronDown size={18} aria-hidden />
                  </button>
                  {atomHeadingMenuOpen && (
                    <div className="atoms-title-menu" role="menu">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={atomSubView === 'atoms'}
                        className={atomSubView === 'atoms' ? 'is-active' : ''}
                        onClick={() => switchAtomWorkspace('atoms')}
                      >
                        <span>Atoms</span>
                        <small>Browse and flip atom cards</small>
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={atomSubView !== 'atoms'}
                        className={atomSubView !== 'atoms' ? 'is-active' : ''}
                        onClick={() => switchAtomWorkspace('sets')}
                      >
                        <span>Sets</span>
                        <small>Create and study atom flashcard sets</small>
                      </button>
                    </div>
                  )}
                </div>
              }
              action={
                <div className="atoms-header-controls">
                  {atomSubView === 'atoms' && (
                    <>
                      <label className="atoms-search">
                        <Search size={15} />
                        <input
                          value={atomSearchQuery}
                          onChange={(event) => setAtomSearchQuery(event.target.value)}
                          placeholder="Search atoms..."
                        />
                      </label>
                      <div className="atoms-project-filter" ref={atomProjectFilterRef}>
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={atomProjectMenuOpen}
                          onClick={() => setAtomProjectMenuOpen((open) => !open)}
                        >
                          <span>{atomProjectFilterLabel}</span>
                          <ChevronDown size={15} aria-hidden />
                        </button>
                        {atomProjectMenuOpen && (
                          <div className="atoms-project-menu" role="listbox" aria-label="Filter atoms by project">
                            {atomProjectOptions.map((option) => (
                              <button
                                type="button"
                                role="option"
                                aria-selected={atomProjectFilter === option.value}
                                className={atomProjectFilter === option.value ? 'is-active' : ''}
                                key={option.value}
                                onClick={() => {
                                  setAtomProjectFilter(option.value)
                                  setAtomProjectMenuOpen(false)
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="atoms-selection-actions">
                        {atomSelectionMode && (
                          <button className="atoms-select-action atoms-select-action--soft" type="button" onClick={toggleSelectVisibleAtoms}>
                            {allVisibleAtomsSelected ? 'Clear' : 'All'}
                          </button>
                        )}
                        <button
                          className={atomSelectionMode ? 'atoms-select-action atoms-select-action--done is-active' : 'atoms-select-action'}
                          type="button"
                          aria-pressed={atomSelectionMode}
                          onClick={() => {
                            setAtomSelectionMode((current) => {
                              if (current) setSelectedAtomIds([])
                              return !current
                            })
                          }}
                        >
                          {atomSelectionMode ? 'Done' : 'Select'}
                        </button>
                        {atomSelectionMode && selectedAtomIds.length > 0 && (
                          <>
                            <button className="atoms-select-action atoms-select-action--create" type="button" onClick={() => openCreateFlashcardSet()}>
                              Create set
                            </button>
                            <button className="atoms-delete-action" type="button" onClick={deleteSelectedAtoms}>
                              <Trash2 size={15} />
                              Delete {selectedAtomIds.length}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  {atomSubView === 'sets' && (
                    <button className="atoms-select-action" type="button" onClick={() => openCreateFlashcardSet([])}>
                      <Plus size={15} />
                      Create set
                    </button>
                  )}
                  {(atomSubView === 'set-edit' || atomSubView === 'study') && (
                    <button className="atoms-select-action" type="button" onClick={() => setAtomSubView('sets')}>
                      <ArrowLeft size={15} />
                      Back to sets
                    </button>
                  )}
                </div>
              }
            />
            <div className="atoms-page">
              {atomSubView === 'atoms' && (
                <div className="atom-card-grid">
                  {filteredAtomCards.map((card) => {
                    const isFlipped = flippedAtomIds.includes(card.atom.id)
                    const isSelected = selectedAtomIds.includes(card.atom.id)
                    return (
                      <button
                        className={`atom-panel-card ${isFlipped ? 'is-flipped' : ''} ${atomSelectionMode ? 'is-selecting' : ''} ${isSelected ? 'is-selected' : ''}`}
                        type="button"
                        key={card.atom.id}
                        aria-pressed={atomSelectionMode ? isSelected : isFlipped}
                        onClick={() => {
                          if (atomSelectionMode) {
                            setSelectedAtomIds((current) =>
                              current.includes(card.atom.id)
                                ? current.filter((id) => id !== card.atom.id)
                                : [...current, card.atom.id],
                            )
                            return
                          }
                          setFlippedAtomIds((current) =>
                            current.includes(card.atom.id)
                              ? current.filter((id) => id !== card.atom.id)
                              : [...current, card.atom.id],
                          )
                        }}
                      >
                        {atomSelectionMode && <span className="atom-card-check" aria-hidden />}
                        <div className="atom-card-inner">
                          <div className="atom-card-face atom-card-front">
                            <div>
                              <strong>{card.atom.phrase}</strong>
                            </div>
                          </div>
                          <div className="atom-card-face atom-card-back">
                            <div>
                              <span>Definition</span>
                              <p>{card.atom.definition}</p>
                            </div>
                            <footer>
                              <span>{card.projectNames.join(', ') || 'No project yet'}</span>
                              <span>Click to flip back</span>
                            </footer>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {atomSubView === 'sets' && (
                <div className="flashcard-set-grid">
                  {flashcardSets.length === 0 ? (
                    <section className="flashcard-empty-state">
                      <Brain size={24} aria-hidden />
                      <h3>Create your first flashcard set</h3>
                      <p>Group atoms into a study deck, then review them one card at a time.</p>
                      <button type="button" onClick={() => openCreateFlashcardSet([])}>Create set</button>
                    </section>
                  ) : (
                    flashcardSets.map((set) => {
                      const setAtoms = set.atomIds.filter((id) => atoms.some((atom) => atom.id === id))
                      return (
                        <article
                          className={`flashcard-set-card ${setAtoms.length ? '' : 'is-disabled'}`}
                          key={set.id}
                          role="button"
                          tabIndex={setAtoms.length ? 0 : -1}
                          aria-disabled={!setAtoms.length}
                          onClick={() => {
                            if (setAtoms.length) void startFlashcardStudy(set)
                          }}
                          onKeyDown={(event) => {
                            if (!setAtoms.length) return
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              void startFlashcardStudy(set)
                            }
                          }}
                        >
                          <div>
                            <h3>{set.name}</h3>
                            {set.description?.trim() && <p>{set.description.trim()}</p>}
                          </div>
                          <footer>
                            <span>{setAtoms.length} card{setAtoms.length === 1 ? '' : 's'}</span>
                            {set.lastStudiedAt && <span>Studied {formatDay(set.lastStudiedAt)}</span>}
                            <span className="flashcard-set-actions">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openEditFlashcardSet(set)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void deleteFlashcardSet(set)
                                }}
                              >
                                Delete
                              </button>
                            </span>
                          </footer>
                        </article>
                      )
                    })
                  )}
                </div>
              )}

              {atomSubView === 'set-edit' && (
                <div className="flashcard-set-editor">
                  <section className="flashcard-set-form">
                    {flashcardSetTitleEditing ? (
                      <input
                        ref={flashcardSetTitleInputRef}
                        className="flashcard-set-title-input"
                        value={flashcardSetDraftName}
                        onChange={(event) => setFlashcardSetDraftName(event.target.value)}
                        onBlur={() => setFlashcardSetTitleEditing(false)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === 'Escape') {
                            event.preventDefault()
                            setFlashcardSetTitleEditing(false)
                          }
                        }}
                        placeholder="Untitled set"
                        aria-label="Set name"
                      />
                    ) : (
                      <button
                        className="flashcard-set-title"
                        type="button"
                        onClick={() => setFlashcardSetTitleEditing(true)}
                        title="Rename set"
                      >
                        {flashcardSetDraftName.trim() || 'Untitled set'}
                      </button>
                    )}
                    <label>
                      Description
                      <textarea
                        value={flashcardSetDraftDescription}
                        onChange={(event) => setFlashcardSetDraftDescription(event.target.value)}
                        placeholder="What this set helps you remember"
                      />
                    </label>
                    <div className="flashcard-set-form-actions">
                      <button type="button" onClick={() => setAtomSubView('sets')}>Cancel</button>
                      <button
                        type="button"
                        className="primary"
                        disabled={!flashcardSetDraftName.trim() || !flashcardSetDraftAtomIds.length}
                        onClick={() => void saveFlashcardSet()}
                      >
                        Save set
                      </button>
                    </div>
                  </section>
                  <section className="flashcard-atom-picker">
                    <div className="flashcard-atom-picker-header">
                      <div>
                        <h3>Choose atoms <span>{flashcardSetDraftAtomIds.length} selected</span></h3>
                      </div>
                      <div className="flashcard-atom-picker-tools">
                        <label className="atoms-search">
                          <Search size={15} />
                          <input
                            value={flashcardSetAtomQuery}
                            onChange={(event) => setFlashcardSetAtomQuery(event.target.value)}
                            placeholder="Search atoms..."
                          />
                        </label>
                        <div className="atoms-project-filter" ref={flashcardProjectFilterRef}>
                          <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={atomProjectMenuOpen}
                            onClick={() => setAtomProjectMenuOpen((open) => !open)}
                          >
                            <span>{atomProjectFilterLabel}</span>
                            <ChevronDown size={15} aria-hidden />
                          </button>
                          {atomProjectMenuOpen && (
                            <div className="atoms-project-menu" role="listbox" aria-label="Filter atoms by project">
                              {atomProjectOptions.map((option) => (
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={atomProjectFilter === option.value}
                                  className={atomProjectFilter === option.value ? 'is-active' : ''}
                                  key={option.value}
                                  onClick={() => {
                                    setAtomProjectFilter(option.value)
                                    setAtomProjectMenuOpen(false)
                                  }}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flashcard-atom-picker-list">
                      {flashcardSetPickerCards.map((card) => {
                        const isSelected = flashcardSetDraftAtomIds.includes(card.atom.id)
                        return (
                          <button
                            type="button"
                            key={card.atom.id}
                            className={isSelected ? 'is-selected' : ''}
                            onClick={() => toggleFlashcardSetAtom(card.atom.id)}
                          >
                            <span>
                              <strong>{card.atom.phrase}</strong>
                              <small>{truncateOneLine(card.atom.definition, 110)}</small>
                            </span>
                            <em>{isSelected ? 'Selected' : 'Add'}</em>
                          </button>
                        )
                      })}
                    </div>
                    {flashcardSetDraftCards.length > 0 && (
                      <div className="flashcard-set-preview">
                        <span>Set preview</span>
                        {flashcardSetDraftCards.slice(0, 5).map((card) => (
                          <strong key={card.atom.id}>{card.atom.phrase}</strong>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {atomSubView === 'study' && (
                <div className="flashcard-study">
                  <header>
                    <div>
                      <span>{studyingFlashcardSet?.name ?? 'Study set'}</span>
                      <h3>{studyRoundComplete ? 'Round complete' : studyAtoms.length ? `${studyIndex + 1} of ${studyAtoms.length}` : 'No cards to study'}</h3>
                    </div>
                    <div className="flashcard-study-options">
                      <button
                        type="button"
                        onClick={() => {
                          setStudyDirection((current) => (current === 'term' ? 'definition' : 'term'))
                          setStudyFlipped(false)
                        }}
                      >
                        {studyDirection === 'term' ? 'Term first' : 'Definition first'}
                      </button>
                      <button
                        type="button"
                        className={`flashcard-study-icon-button ${studyShuffle ? 'is-active' : ''}`}
                        aria-label="Shuffle cards"
                        title="Shuffle"
                        onClick={() => {
                          setStudyShuffle((current) => !current)
                          setStudyAtomIds((current) => shuffleList(current))
                          setStudyIndex(0)
                          setStudyFlipped(false)
                        }}
                      >
                        <ShuffleIcon size={15} aria-hidden />
                      </button>
                    </div>
                  </header>
                  {studyTotalCount > 0 && (
                    <div className="flashcard-study-progress" aria-label="Study progress">
                      <span>{studyAtoms.length} in round</span>
                      <span>{studyLearningCount} learning</span>
                      <span>{studyKnownCount} known</span>
                    </div>
                  )}
                  {activeStudyAtom ? (
                    <>
                      <button
                        type="button"
                        className={`flashcard-study-card atom-panel-card ${studyFlipped ? 'is-flipped' : ''}`}
                        aria-pressed={studyFlipped}
                        onClick={() => setStudyFlipped((current) => !current)}
                        onKeyDown={(event) => {
                          if (event.key === ' ' || event.key === 'Enter') {
                            event.preventDefault()
                            setStudyFlipped((current) => !current)
                          }
                          if (event.key === 'ArrowRight') {
                            event.preventDefault()
                            moveStudyCard(1)
                          }
                          if (event.key === 'ArrowLeft') {
                            event.preventDefault()
                            moveStudyCard(-1)
                          }
                        }}
                      >
                        <div className="atom-card-inner">
                          <div className="atom-card-face atom-card-front">
                            <span>{studyDirection === 'term' ? 'Term' : 'Definition'}</span>
                            <strong>{studyDirection === 'term' ? activeStudyAtom.phrase : activeStudyAtom.definition}</strong>
                            <small>Click or press Space to flip</small>
                          </div>
                          <div className="atom-card-face atom-card-back">
                            <span>{studyDirection === 'term' ? 'Definition' : 'Term'}</span>
                            <strong>{studyDirection === 'term' ? activeStudyAtom.definition : activeStudyAtom.phrase}</strong>
                            <small>Click to flip back</small>
                          </div>
                        </div>
                      </button>
                      <div className="flashcard-study-controls">
                        <button type="button" aria-label="Previous card" onClick={() => moveStudyCard(-1)}>{'<'}</button>
                        <button type="button" onClick={markStudyCardAgain}>Again</button>
                        <button type="button" className="primary" onClick={markStudyCardKnown}>Know</button>
                        <button type="button" aria-label="Next card" onClick={() => moveStudyCard(1)}>{'>'}</button>
                      </div>
                    </>
                  ) : studyRoundComplete ? (
                    <section className="flashcard-study-complete">
                      <span>Session</span>
                      <h3>All cards known</h3>
                      <p>
                        You cleared this round. Restart the set whenever you want another pass.
                      </p>
                      <button type="button" onClick={restartStudyRound}>Restart round</button>
                    </section>
                  ) : (
                    <section className="flashcard-empty-state">
                      <h3>This set has no available cards</h3>
                      <p>Add atoms to the set before studying.</p>
                      {studyingFlashcardSet && <button type="button" onClick={() => openEditFlashcardSet(studyingFlashcardSet)}>Edit set</button>}
                    </section>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {activeView === 'settings' && (
          <section className="main-pane compact-pane settings-pane">
            <PageHeader
              title="Settings"
              action={<button type="button" onClick={openProfileModal}><Settings size={17} /> Edit profile</button>}
            />
            <div className="settings-layout">
              <section className="settings-profile-strip">
                <div className="avatar" style={{ background: profileAvatarColor }}>{profileInitials}</div>
                <div>
                  <strong>{profileDisplayName}</strong>
                  <span>Local profile · used for new notes</span>
                </div>
                <button type="button" onClick={openProfileModal}>Manage</button>
              </section>

              <section className="settings-card settings-ai-card">
                <div className="settings-card-heading">
                  <Sparkles size={18} />
                  <div>
                    <h3>AI providers</h3>
                    <p>Bring your own API key. Keys are stored locally in this browser.</p>
                  </div>
                </div>
                <div className="settings-warning">
                  <Shield size={16} />
                  <span>Local BYOK is convenient for testing, but browser-stored keys are not as secure as a server gateway. Direct provider calls can also be blocked by CORS.</span>
                </div>
                <div className="settings-field-grid">
                  <label>
                    <span>Default provider</span>
                    <select
                      value={userSettings.defaultAIProvider}
                      onChange={(event) => updateUserSettings({ defaultAIProvider: event.target.value as AIProviderId })}
                    >
                      {aiProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Request timeout</span>
                    <select
                      value={userSettings.aiTimeoutMs ?? DEFAULT_AI_TIMEOUT_MS}
                      onChange={(event) => updateUserSettings({ aiTimeoutMs: Number(event.target.value) })}
                    >
                      <option value={30000}>30 seconds</option>
                      <option value={60000}>60 seconds</option>
                      <option value={120000}>120 seconds</option>
                    </select>
                  </label>
                </div>
                <div className="settings-provider-grid">
                  {aiProviders.map((provider) => {
                    const config = userSettings.aiProviders[provider.id]
                    return (
                      <article className={`provider-card ${config.enabled ? 'is-enabled' : ''}`} key={provider.id}>
                        <header>
                          <div>
                            <strong>{provider.name}</strong>
                            <p>{config.model || provider.defaultModel}</p>
                          </div>
                          <label className="settings-switch">
                            <input
                              type="checkbox"
                              checked={config.enabled}
                              onChange={(event) => updateAIProvider(provider.id, { enabled: event.target.checked })}
                            />
                            <span>{config.enabled ? 'On' : 'Off'}</span>
                          </label>
                        </header>
                        <details>
                          <summary>Connection details</summary>
                          <label>
                            <span>API key</span>
                            <input
                              type="password"
                              value={config.apiKey}
                              placeholder="Paste API key"
                              onChange={(event) => updateAIProvider(provider.id, { apiKey: event.target.value })}
                            />
                          </label>
                          <label>
                            <span>Model</span>
                            <input
                              value={config.model}
                              placeholder={provider.defaultModel}
                              onChange={(event) => updateAIProvider(provider.id, { model: event.target.value })}
                            />
                          </label>
                          {!provider.baseUrlLocked && (
                            <label>
                              <span>Base URL</span>
                              <input
                                value={config.baseUrl ?? provider.baseUrl}
                                onChange={(event) => updateAIProvider(provider.id, { baseUrl: event.target.value })}
                              />
                            </label>
                          )}
                        </details>
                        <footer>
                          <span>{config.apiKey ? 'Key saved locally' : 'No key saved'}</span>
                          {config.apiKey && <button type="button" onClick={() => updateAIProvider(provider.id, { apiKey: '', enabled: false })}>Clear key</button>}
                        </footer>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="settings-card">
                <div className="settings-card-heading">
                  <Info size={18} />
                  <div>
                    <h3>AI diagnostics</h3>
                    <p>Provider status and usage details stay here, away from the editor.</p>
                  </div>
                </div>
                <div className="settings-data-list">
                  <span><strong>{userSettings.aiLastStatus ?? 'idle'}</strong> Last status</span>
                  <span><strong>{userSettings.aiLastProvider ? aiProviders.find((provider) => provider.id === userSettings.aiLastProvider)?.name ?? userSettings.aiLastProvider : 'None'}</strong> Last provider</span>
                  <span><strong>{userSettings.aiLastUsage?.inputTokens ?? '—'}</strong> Input tokens</span>
                  <span><strong>{userSettings.aiLastUsage?.outputTokens ?? '—'}</strong> Output tokens</span>
                  <span><strong>{userSettings.aiLastUsage?.cachedTokens ?? '—'}</strong> Cached tokens</span>
                  <span><strong>{userSettings.aiLastError || 'None'}</strong> Last error</span>
                </div>
              </section>

              <section className="settings-card settings-grid-pair">
                <div className="settings-card-heading">
                  <Keyboard size={18} />
                  <div>
                    <h3>Shortcuts</h3>
                    <p>Fast movement without extra chrome.</p>
                  </div>
                </div>
                <div className="settings-shortcuts">
                  <span><kbd>Ctrl</kbd> + <kbd>K</kbd> Search</span>
                  <span><kbd>⌘</kbd> + <kbd>K</kbd> Search</span>
                  <span><kbd>Ctrl</kbd> + <kbd>Page Up/Down</kbd> Switch project documents</span>
                  <span><kbd>Ctrl</kbd> + <kbd>\</kbd> Clear formatting</span>
                </div>
              </section>

              <section className="settings-card settings-grid-pair">
                <div className="settings-card-heading">
                  <Info size={18} />
                  <div>
                    <h3>Data</h3>
                    <p>Everything in this release is local-first.</p>
                  </div>
                </div>
                <div className="settings-data-list">
                  <span><strong>{notes.length}</strong> notes</span>
                  <span><strong>{projects.length}</strong> projects</span>
                  <span><strong>{atoms.length}</strong> atoms</span>
                  <span><strong>{dashboardStats.dailyStreak}</strong> day streak</span>
                </div>
              </section>
            </div>
          </section>
        )}
      </section>

      {aiResult && (
        <div
          className="modal-backdrop ai-result-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAIResult()
          }}
        >
          <section
            className={`ai-result-dialog${aiResult.canReplaceSelection && aiResult.selectionOriginalText !== undefined ? ' ai-result-dialog--wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-result-title"
          >
            <button
              type="button"
              className="ai-result-close"
              aria-label="Close AI result"
              onClick={closeAIResult}
            >
              <X size={18} />
            </button>
            <h2 id="ai-result-title">{aiResultTitle(aiResult)}</h2>
            {aiResult.taskType === 'mark_writing' ? (
              <MarkWritingFeedbackFields
                draftText={aiResult.draftText}
                onChange={(next) => setAiResult((current) => (current ? { ...current, draftText: next } : current))}
              />
            ) : aiResult.canReplaceSelection && aiResult.selectionOriginalText !== undefined ? (
              <div className="ai-rewrite-compare" aria-label="Original selection and replacement">
                <div className="ai-rewrite-compare-pane">
                  <span className="ai-rewrite-compare-heading">Original selection</span>
                  <div className="ai-rewrite-compare-readonly">{aiResult.selectionOriginalText.trim() || '—'}</div>
                </div>
                <div className="ai-rewrite-compare-pane">
                  <label className="ai-draft-editor ai-rewrite-compare-draft">
                    <textarea
                      value={aiResult.draftText}
                      onChange={(event) =>
                        setAiResult((current) => (current ? { ...current, draftText: event.target.value } : current))
                      }
                      aria-label={aiDraftLabel(aiResult.taskType)}
                      autoFocus
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="ai-draft-editor">
                <textarea
                  value={aiResult.draftText}
                  onChange={(event) => setAiResult((current) => (current ? { ...current, draftText: event.target.value } : current))}
                  aria-label={aiDraftLabel(aiResult.taskType)}
                  autoFocus
                />
              </label>
            )}
            {aiResult.taskType !== 'mark_writing' &&
              aiResult.taskType !== 'ai_atomise' &&
              aiResult.taskType !== 'atom_task' && (
                <details className="ai-draft-preview-details" open>
                  <summary>Formatted preview</summary>
                  <div className="ai-draft-preview-panel">
                    {aiResult.blockPayload ? (
                      <AIBlockFormattedPreview payload={aiResult.blockPayload} />
                    ) : (
                      <AiDraftFormattedPreview text={aiResult.draftText} />
                    )}
                  </div>
                </details>
              )}
            {aiResult.projectInstructionDraft !== undefined && (
              <label className="ai-draft-editor ai-project-instruction-draft">
                <textarea
                  value={aiResult.projectInstructionDraft}
                  onChange={(event) => setAiResult((current) => (current ? { ...current, projectInstructionDraft: event.target.value } : current))}
                  aria-label="Project instructions update"
                />
              </label>
            )}
            <footer>
              {(aiResult.canCreateAtoms || aiResult.canApplyBlock || aiResult.canReplaceSelection || aiResult.canInsert || aiResult.taskType === 'answer_with_context' || aiResult.taskType === 'app_help' || aiResult.taskType === 'mark_writing') && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    if (aiResult.canCreateAtoms) {
                      void createAtomsFromAIResult()
                      return
                    }
                    if (aiResult.canApplyBlock && aiResult.blockPayload) {
                      applyAIBlockPayload(aiResult.blockPayload)
                      closeAIResult()
                      return
                    }
                    if (aiResult.canReplaceSelection && aiResult.selection) {
                      editor
                        ?.chain()
                        .focus()
                        .setTextSelection(aiResult.selection)
                        .deleteSelection()
                        .insertContent(textToEditorContent(aiResult.draftText).content ?? [])
                        .run()
                      closeAIResult()
                      return
                    }
                    if (editor) insertDraftText(editor, aiResult.draftText)
                    closeAIResult()
                  }}
                >
                  {aiPrimaryActionLabel(aiResult)}
                </button>
              )}
              {aiResult.canUpdateProjectInstructions && selectedProject && aiResult.projectInstructionDraft === undefined && (
                <button type="button" onClick={() => void draftProjectInstructionsFromAIResult()} disabled={aiInstructionUpdating}>
                  {aiInstructionUpdating ? 'Drafting...' : 'Update project instructions'}
                </button>
              )}
              {selectedProject && aiResult.projectInstructionDraft !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    const draft = aiResult.projectInstructionDraft?.trim()
                    if (!draft) return
                    void updateProjectDescription(selectedProject.id, draft)
                    setAiResult((current) => (current ? { ...current, projectInstructionDraft: undefined } : current))
                  }}
                >
                  Save project instructions
                </button>
              )}
              <button type="button" onClick={() => void copyToClipboard(aiResult.draftText)}>Copy</button>
            </footer>
          </section>
        </div>
      )}

      {searchOpen && (
        <div
          className="global-search-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSearch()
          }}
        >
          <section
            className="global-search-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (!searchHits.length) return
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSearchActiveIndex((i) => Math.min(searchHits.length - 1, i + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSearchActiveIndex((i) => Math.max(0, i - 1))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                const hit = searchHits[searchActiveIndex]
                if (hit) activateHit(hit)
              }
            }}
          >
            <h2 id="global-search-title" className="visually-hidden">
              Search workspace
            </h2>
            <div className="global-search-input-row">
              <Search size={20} aria-hidden strokeWidth={2} />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                placeholder="Search notes, projects, atoms…"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="global-search-list"
                aria-activedescendant={searchHits[searchActiveIndex] ? `search-hit-${searchActiveIndex}` : undefined}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div id="global-search-list" className="global-search-results" role="listbox" aria-label="Search results">
              {searchNormalized && searchHits.length === 0 && <p className="global-search-empty">No results found</p>}
              {searchHits.map((hit, index) => {
                const prev = searchHits[index - 1]
                const showSection = index === 0 || hit.kind !== prev.kind
                return (
                  <Fragment key={hitKey(hit)}>
                    {showSection && (
                      <div className="global-search-section-label" role="presentation">
                        {hit.kind === 'note' ? 'Notes' : hit.kind === 'project' ? 'Projects' : 'Atoms'}
                      </div>
                    )}
                    <button
                      id={`search-hit-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === searchActiveIndex}
                      className={`global-search-hit ${index === searchActiveIndex ? 'is-active' : ''}`}
                      onMouseEnter={() => setSearchActiveIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => activateHit(hit)}
                    >
                      {hit.kind === 'note' && (
                        <>
                          <span className="global-search-hit-icon" aria-hidden>
                            <FileText size={16} />
                          </span>
                          <span className="global-search-hit-main">
                            <strong>{hit.note.title}</strong>
                          </span>
                          <span className="global-search-hit-meta">
                            {projects.find((p) => p.id === hit.note.projectId)?.name ?? 'Unassigned'} · {formatDay(hit.note.updatedAt)}
                          </span>
                        </>
                      )}
                      {hit.kind === 'project' && (
                        <>
                          <span className="global-search-hit-icon" aria-hidden>
                            <Layers3 size={16} />
                          </span>
                          <span className="global-search-hit-main">
                            <strong>{hit.project.name}</strong>
                          </span>
                          <span className="global-search-hit-meta">{notes.filter((note) => note.projectId === hit.project.id).length} notes</span>
                        </>
                      )}
                      {hit.kind === 'atom' && (
                        <>
                          <span className="global-search-hit-icon" aria-hidden>
                            <Brain size={16} />
                          </span>
                          <span className="global-search-hit-main global-search-hit-main--stacked">
                            <strong>{hit.atom.phrase}</strong>
                            <small>{truncateOneLine(hit.atom.definition, 120)}</small>
                          </span>
                        </>
                      )}
                    </button>
                  </Fragment>
                )
              })}
            </div>
            <p className="global-search-footer-hint">
              Ctrl+K or ⌘K to toggle
            </p>
          </section>
        </div>
      )}

      {templateProjectId && (
        <div
          className="modal-backdrop template-chooser-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTemplateProjectId(null)
          }}
        >
          <section className="template-chooser-dialog" role="dialog" aria-modal="true" aria-labelledby="template-chooser-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="panel-kicker">New note</span>
            <h2 id="template-chooser-title">Choose a template</h2>
            <p>Start with a blank page or pick a structure for the note you are about to create.</p>
            <div className="template-option-grid">
              {noteTemplates.map((template) => (
                <button
                  type="button"
                  className={template.available ? '' : 'is-disabled'}
                  disabled={!template.available}
                  key={template.id}
                  onClick={() => void createNoteFromTemplate(template.id, templateProjectId)}
                >
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                  <small>{templateStructureLabel(template.id)}</small>
                  {!template.available && <em>{template.comingSoonLabel}</em>}
                </button>
              ))}
            </div>
            <footer>
              <button type="button" onClick={() => setTemplateProjectId(null)}>Cancel</button>
            </footer>
          </section>
        </div>
      )}

      {appDialog && (
        <div
          className="modal-backdrop app-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAppDialog()
          }}
        >
          <section
            className="app-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby={appDialog.kind === 'confirm' || appDialog.message ? 'app-dialog-message' : undefined}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submitAppDialog()
              }}
            >
              <h2 id="app-dialog-title">{appDialog.title}</h2>
              {appDialog.kind === 'confirm' ? (
                <p id="app-dialog-message">{appDialog.message}</p>
              ) : (
                <>
                  {appDialog.message && <p id="app-dialog-message">{appDialog.message}</p>}
                <label>
                  {appDialog.label}
                  <input
                    value={appDialog.value}
                    onChange={(event) =>
                        setAppDialog((current) =>
                          current?.kind === 'prompt' ? { ...current, value: event.target.value } : current,
                        )
                      }
                      placeholder={appDialog.placeholder}
                    autoFocus
                  />
                </label>
                {appDialog.secondaryLabel && (
                  <label>
                    {appDialog.secondaryLabel}
                    <input
                      value={appDialog.secondaryValue ?? ''}
                      onChange={(event) =>
                        setAppDialog((current) =>
                          current?.kind === 'prompt' ? { ...current, secondaryValue: event.target.value } : current,
                        )
                      }
                      placeholder={appDialog.secondaryPlaceholder}
                    />
                  </label>
                )}
              </>
            )}
              <footer>
                <button type="button" onClick={closeAppDialog}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={appDialog.kind === 'confirm' && appDialog.intent === 'danger' ? 'danger' : 'primary'}
                  disabled={appDialog.kind === 'prompt' && !appDialog.value.trim()}
                >
                  {appDialog.confirmLabel}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {noteHistoryOpen && selectedNote && (
        <div
          className="modal-backdrop note-history-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setNoteHistoryOpen(false)
          }}
        >
          <section
            className="note-history-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-history-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="note-history-title">Note history</h2>
            <p className="note-history-subtitle">Autosaved snapshots when you pause editing (stored in your browser).</p>
            <ul className="note-history-list">
              {noteSnapshots.length === 0 ? (
                <li className="note-history-empty">No snapshots yet. Edit this note for a few seconds, then reopen history.</li>
              ) : (
                noteSnapshots.map((snap) => {
                  const previewOpen = !!historyPreviewExpanded[snap.id]
                  const bodyText = collectText(snap.content)
                  return (
                    <li key={snap.id}>
                      <div className="note-history-row-head">
                        <strong>{snap.title}</strong>
                        <time dateTime={snap.savedAt}>{formatDateTime(snap.savedAt)}</time>
                      </div>
                      <p className="note-history-preview">{truncateOneLine(bodyText, 160)}</p>
                      {previewOpen && (
                        <pre className="note-history-body-expanded" aria-label="Snapshot body preview">{bodyText || '(empty)'}</pre>
                      )}
                      <div className="note-history-actions">
                        <button
                          type="button"
                          className="note-history-secondary"
                          onClick={() =>
                            setHistoryPreviewExpanded((prev) => ({
                              ...prev,
                              [snap.id]: !prev[snap.id],
                            }))
                          }
                        >
                          {previewOpen ? 'Hide preview' : 'Preview'}
                        </button>
                        <button type="button" className="note-history-secondary" onClick={() => void copyToClipboard(snap.title)}>
                          Copy title
                        </button>
                        <button type="button" className="note-history-secondary" onClick={() => void copyToClipboard(bodyText)}>
                          Copy body
                        </button>
                        <button type="button" className="note-history-restore" onClick={() => void restoreNoteSnapshot(snap)}>
                          Restore this version
                        </button>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
            <footer className="note-history-footer">
              <button type="button" onClick={() => setNoteHistoryOpen(false)}>Close</button>
            </footer>
          </section>
        </div>
      )}

      {atomDialog && (
        <div
          className="modal-backdrop atom-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAtomDialog(null)
          }}
        >
          <section className="atom-dialog" role="dialog" aria-modal="true" aria-labelledby="atom-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <span>Atomise</span>
            <h2 id="atom-dialog-title">Atomise</h2>
            {atomDialog.mode === 'manual' && (
              <label>
                Word or phrase
                <input
                  value={atomDialog.phrase}
                  onChange={(event) => setAtomDialog({ ...atomDialog, phrase: event.target.value })}
                  placeholder="Create an atom"
                  autoFocus
                />
              </label>
            )}
            {atomDialog.mode === 'selection' && <div className="atom-dialog-phrase">{atomDialog.phrase}</div>}
            <label>
              Definition
              <textarea
                value={atomDialog.definition}
                onChange={(event) => setAtomDialog({ ...atomDialog, definition: event.target.value })}
                placeholder="Enter definition here..."
                autoFocus={atomDialog.mode === 'selection'}
              />
            </label>
            <div className="dialog-context">Project: {selectedProject?.name ?? openedProject?.name ?? 'Unassigned'}</div>
            <footer>
              <button type="button" onClick={() => setAtomDialog(null)}>Cancel</button>
              <button type="button" className="primary" onClick={() => void saveAtomDialog()} disabled={!atomDialog.phrase.trim() || !atomDialog.definition.trim()}>Save atom</button>
            </footer>
          </section>
        </div>
      )}

      {profileLoaded && (!localProfile || profileModalOpen) && (
        <div
          className="modal-backdrop profile-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && localProfile) setProfileModalOpen(false)
          }}
        >
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <span>{localProfile ? 'Profile' : 'Welcome'}</span>
            <h2 id="profile-dialog-title">{localProfile ? 'Profile' : 'Set up your profile'}</h2>
            <p>{localProfile ? 'Tune how your local workspace identifies you.' : 'Choose the name shown in your notes and sidebar.'}</p>
            <div className="profile-dialog-main">
              <div className="profile-preview">
                <div className="avatar profile-preview-avatar" style={{ background: profileDraft.avatarColor || DEFAULT_PROFILE_COLOR }}>{normalizeInitials(profileDraft.initials || initialsFromName(profileDraft.displayName) || 'LN')}</div>
                <strong>{profileDraft.displayName.trim() || 'Your name'}</strong>
                <span>Local profile</span>
              </div>
              <div className="profile-fields">
                <label>
                  Display name
                  <input
                    value={profileDraft.displayName}
                    onChange={(event) => {
                      const displayName = event.target.value
                      setProfileDraft((current) => ({
                        ...current,
                        displayName,
                        initials: localProfile ? current.initials : initialsFromName(displayName),
                      }))
                    }}
                    placeholder="Your name"
                    autoFocus
                  />
                </label>
                <label>
                  Initials
                  <input
                    value={profileDraft.initials}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, initials: normalizeInitials(event.target.value) }))}
                    maxLength={3}
                    placeholder="YN"
                  />
                </label>
                <div className="profile-color-field">
                  <span>Avatar color</span>
                  <div className="profile-color-swatches">
                    {PROFILE_COLORS.map((color) => (
                      <button
                        type="button"
                        className={profileDraft.avatarColor === color ? 'is-active' : ''}
                        key={color}
                        style={{ background: color }}
                        aria-label={`Use profile color ${color}`}
                        onClick={() => setProfileDraft((current) => ({ ...current, avatarColor: color }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {localProfile && (
              <div className="profile-stats-grid">
                <span><strong>{notes.length}</strong>Notes</span>
                <span><strong>{projects.length}</strong>Projects</span>
                <span><strong>{atoms.length}</strong>Atoms</span>
                <span><strong>{dashboardStats.dailyStreak}</strong>Day streak</span>
                <span><strong>{dashboardStats.notesUpdatedThisWeek}</strong>Updated this week</span>
                <span><strong>{dashboardStats.recentAtomCount}</strong>Atoms this week</span>
                <span className="profile-stat-wide"><strong>{dashboardStats.topProjects[0]?.project.name ?? 'None yet'}</strong>Most active project</span>
              </div>
            )}
            <footer>
              {localProfile && <button type="button" onClick={() => setProfileModalOpen(false)}>Cancel</button>}
              <button type="button" className="primary" onClick={() => void saveLocalProfile()} disabled={!profileDraft.displayName.trim()}>
                {localProfile ? 'Save profile' : 'Start writing'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  )
}

function PageHeader({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="pane-header">
      <div>
        {typeof title === 'string' ? <h2>{title}</h2> : title}
      </div>
      {action}
    </header>
  )
}

function DashboardPanel({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`dashboard-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function ProjectMemoryTextarea({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  ariaLabel: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const syncHeight = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const minPx = 68
    el.style.height = `${Math.max(minPx, el.scrollHeight)}px`
  }, [])

  useLayoutEffect(() => {
    syncHeight()
  }, [value, syncHeight])

  useEffect(() => {
    window.addEventListener('resize', syncHeight)
    return () => window.removeEventListener('resize', syncHeight)
  }, [syncHeight])

  return (
    <textarea
      ref={ref}
      className="project-memory-field"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
    />
  )
}

function ProjectDetail({ project, notes, atomCards, draggedNoteIds, selectedNoteIds, onNoteDragStart, onNoteDragEnd, onNoteSelect, deleteNote, openNote, newNote, deleteProject, updateDescription, updateName, back }: {
  project: Project
  notes: Note[]
  atomCards: ReturnType<typeof buildAtomCards>
  draggedNoteIds: string[]
  selectedNoteIds: string[]
  onNoteDragStart: (event: React.DragEvent<HTMLElement>, noteId: string) => void
  onNoteDragEnd: () => void
  onNoteSelect: React.Dispatch<React.SetStateAction<string[]>>
  deleteNote: (note: Note) => void
  openNote: (noteId: string) => void
  newNote: () => void
  deleteProject: () => void
  updateDescription: (description: string) => void
  updateName: (name: string) => void
  back: () => void
}) {
  const projectNotes = notes.filter((note) => note.projectId === project.id)
  const projectAtoms = atomCards.filter((card) => card.projectIds.includes(project.id))
  const projectMemory = parseProjectMemory(project.description ?? '')
  const [projectDescriptionOpen, setProjectDescriptionOpen] = useState(false)
  const [projectTitleEditing, setProjectTitleEditing] = useState(false)
  const [projectTitleDraft, setProjectTitleDraft] = useState(project.name)
  const projectTitleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (projectTitleEditing) return
    setProjectTitleDraft(project.name)
  }, [project.name, projectTitleEditing])

  useEffect(() => {
    if (!projectTitleEditing) return
    projectTitleInputRef.current?.focus()
    projectTitleInputRef.current?.select()
  }, [projectTitleEditing])

  const commitProjectTitle = () => {
    const nextName = projectTitleDraft.trim()
    if (nextName && nextName !== project.name) updateName(nextName)
    else setProjectTitleDraft(project.name)
    setProjectTitleEditing(false)
  }

  return (
    <>
      <PageHeader
        title={
          projectTitleEditing ? (
            <input
              ref={projectTitleInputRef}
              className="project-title-input"
              value={projectTitleDraft}
              onChange={(event) => setProjectTitleDraft(event.target.value)}
              onBlur={commitProjectTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitProjectTitle()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setProjectTitleDraft(project.name)
                  setProjectTitleEditing(false)
                }
              }}
              aria-label="Project name"
            />
          ) : (
            <h2
              className="project-title-editable"
              onDoubleClick={() => setProjectTitleEditing(true)}
              title="Double-click to rename"
            >
              {project.name}
            </h2>
          )
        }
        action={
          <div className="project-header-actions">
            <button type="button" onClick={newNote}><Plus size={17} /> New note in this project</button>
            <button className="project-delete-button" type="button" onClick={deleteProject} aria-label={`Delete ${project.name}`}>
              <Trash2 size={16} />
            </button>
          </div>
        }
      />
      <div className="project-detail-toolbar">
        <div className="project-detail-toolbar-top">
          <button type="button" className="back-link" onClick={back}>
            <ArrowLeft size={15} /> Projects
          </button>
          <button
            type="button"
            className="project-description-toolbar-summary"
            aria-expanded={projectDescriptionOpen}
            onClick={() => setProjectDescriptionOpen((open) => !open)}
          >
            <span>Project Description</span>
            <ChevronDown
              size={16}
              className={`project-description-toolbar-chevron${projectDescriptionOpen ? ' is-open' : ''}`}
              aria-hidden
            />
          </button>
        </div>
        {projectDescriptionOpen && (
          <div className="project-memory-expand">
            {PROJECT_MEMORY_HEADINGS.map(({ key, label }) => {
              const meta = PROJECT_MEMORY_FIELD_META[key]
              return (
                <div className="project-memory-row" key={key}>
                  <div className="project-memory-row-head">
                    <strong>{label}</strong>
                    <span className="project-memory-hint">{meta.hint}</span>
                  </div>
                  <ProjectMemoryTextarea
                    value={projectMemory[key]}
                    onChange={(next) => updateDescription(updateProjectMemorySection(project.description, key, next))}
                    placeholder={meta.placeholder}
                    ariaLabel={meta.ariaLabel}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="project-detail-grid">
        <section className="project-files-panel">
          <span>Files · {projectNotes.length}</span>
          {projectNotes.length ? (
            projectNotes.map((note) => {
              const isSelected = selectedNoteIds.includes(note.id)
              const isDragging = draggedNoteIds.includes(note.id)
              return (
                <div
                  className={`file-row ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  aria-selected={isSelected}
                  onDragStart={(event) => onNoteDragStart(event, note.id)}
                  onDragEnd={onNoteDragEnd}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openNote(note.id)
                    }
                  }}
                  onClick={(event) => {
                    if (event.shiftKey) {
                      onNoteSelect((current) =>
                        current.includes(note.id)
                          ? current.filter((id) => id !== note.id)
                          : [...current, note.id],
                      )
                      return
                    }
                    onNoteSelect([])
                    openNote(note.id)
                  }}
                >
                  <strong>{note.title}</strong>
                  <span className="file-row-date">{formatDay(note.updatedAt)}</span>
                  <p>{collectText(note.content) || 'Empty note'}</p>
                  <button
                    type="button"
                    className="note-row-delete"
                    aria-label={`Delete ${note.title || 'Untitled Note'}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteNote(note)
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })
          ) : (
            <p className="empty-state">No files in this project yet.</p>
          )}
        </section>
        <section className="project-files-panel">
          <span>Linked atoms · {projectAtoms.length}</span>
          {projectAtoms.length ? (
            projectAtoms.map((card) => (
              <div className="file-row static" key={card.atom.id}>
                <strong>{card.atom.phrase}</strong>
                <span>{card.atom.knownCount}/{card.atom.reviewCount} known</span>
                <p>{card.atom.definition}</p>
              </div>
            ))
          ) : (
            <p className="empty-state">No atoms linked to this project yet.</p>
          )}
        </section>
      </div>
    </>
  )
}

function buildAtomCards(atoms: Atom[], notes: Note[], projects: Project[]) {
  return atoms.map((atom) => {
    const linkedNotes = notes.filter((note) => contentHasAtom(note.content, atom.id))
    const projectIds = Array.from(new Set(linkedNotes.map((note) => note.projectId)))
    const projectNames = projectIds.map((id) => projects.find((project) => project.id === id)?.name).filter(Boolean) as string[]
    return { atom: { ...atom, tags: atom.tags ?? [] }, noteCount: linkedNotes.length, projectIds, projectNames }
  })
}

function contentHasAtom(content: JSONContent, atomId: string): boolean {
  if (content.attrs?.atomId === atomId) return true
  if (content.marks?.some((mark) => mark.type === 'atom' && mark.attrs?.atomId === atomId)) return true
  return (content.content ?? []).some((child) => contentHasAtom(child, atomId))
}

function collectAtomIds(content: JSONContent): string[] {
  const attrAtomId = typeof content.attrs?.atomId === 'string' ? [content.attrs.atomId] : []
  const own = (content.marks ?? [])
    .filter((mark) => mark.type === 'atom' && typeof mark.attrs?.atomId === 'string')
    .map((mark) => mark.attrs?.atomId as string)
  return [...attrAtomId, ...own, ...(content.content ?? []).flatMap(collectAtomIds)]
}

function stripAtomMarks(content: JSONContent, atomIds: Set<string>): JSONContent {
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

function collectInlinePlain(node: JSONContent): string {
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'image') return ''
  if (node.text) return node.text
  return (node.content ?? []).map(collectInlinePlain).join('')
}

function normalizePreviewChunk(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

/** TipTap-aware excerpt: one line per block / list row for dashboard previews. */
function collectNotePreviewLines(content: JSONContent | undefined | null, maxLines: number): string[] {
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

function splitInlineLines(text: string) {
  return text.split('\n').map(normalizePreviewChunk).filter(Boolean)
}

/** Improves single-block notes: pull leading ISO dates and task markers onto their own lines. */
function segmentDensePreviewLine(line: string): string[] {
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

function collectText(content: JSONContent): string {
  if (content.text) return content.text
  return (content.content ?? []).map(collectText).join(' ').replace(/\s+/g, ' ').trim()
}

function flashcardsFromContent(content: JSONContent): Array<{ atomId: string; phrase: string; definition: string }> {
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

function mountedEditorDom(editor: TiptapEditor | null): HTMLElement | null {
  if (!editor || editor.isDestroyed) return null
  try {
    return editor.view.dom
  } catch {
    return null
  }
}

function truncateOneLine(value: string, max: number) {
  const t = value.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(ta)
    }
  }
}

function sortByUpdated(a: Note, b: Note) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

function sortByCreated(a: Note, b: Note) {
  const createdDelta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  if (createdDelta !== 0) return createdDelta
  const titleDelta = a.title.localeCompare(b.title)
  return titleDelta || a.id.localeCompare(b.id)
}

function shuffleList<T>(items: T[]) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const initials = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`
  return normalizeInitials(initials)
}

function normalizeInitials(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short' }).format(new Date(value)).toUpperCase()
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default App
