/* eslint-disable react-hooks/set-state-in-effect */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, SyntheticEvent, WheelEvent } from 'react'
import { useEditor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  ArrowLeft,
  ArrowRight,
  Atom as AtomIcon,
  Brain,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Home,
  ImageIcon,
  Info,
  Keyboard,
  ListTodo,
  Layers3,
  LinkIcon,
  Maximize2,
  Minimize2,
  MoreVertical,
  Pin,
  Plus,
  RemoveFormatting,
  Search,
  Settings,
  Shield,
  Shuffle as ShuffleIcon,
  Sparkles,
  Table2,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { AtomMark } from './AtomMark'
import { AuthorshipMark } from './AuthorshipMark'
import {
  appendNoteSnapshot,
  createId,
  deprecatedStarterAtomIds,
  deprecatedStarterNoteIds,
  deprecatedStarterProjectIds,
  loadNoteSnapshots,
  nowIso,
  starterWorkspaceAtomIds,
  starterWorkspaceNoteIds,
  starterWorkspaceProjectIds,
  upsertStarterWorkspace,
} from './db'
import type {
  Atom,
  FlashcardSet,
  JSONContent,
  LociBlock,
  LociBlockType,
  Note,
  NoteSnapshot,
  NoteTemplateData,
  NoteTemplateId,
  Project,
  TemplateScheduleItem,
  TemplateSlide,
  TemplateTask,
  AccountProfile,
  AuthSession,
  FriendGroup,
  Friendship,
  RemoteContentItem,
  SharedNoteExport,
  StarterWorkspaceUpsertResult,
  UserProfile,
  UserSettings,
  FlashcardReviewState,
  StudyRating,
} from './db'
import { exportNoteDocx, exportNotePdf } from './exports'
import { requestAIText } from './ai/aiClient'
import type { AIProviderId } from './ai/aiTypes'
import { aiProviders, DEFAULT_AI_TIMEOUT_MS } from './ai/providers'
import {
  AI_SYSTEM_INSTRUCTION,
  AI_TASK_CONTRACTS,
  DEFAULT_MARKING_CRITERIA,
  aiActionConfig,
  canResultUpdateProjectInstructions,
  cleanAIDraftFormatting,
  defaultPromptForCommand,
  parseAIQuotePayload,
  parseAITablePayload,
  parseAtomCandidates,
  parseFlashcardQuizPayload,
  parseFlashcardShortAnswerMark,
  routeAITask,
  sanitizeAIInsertText,
  taskUsesWritingStyle,
} from './ai/aiTasks'
import type {
  AIBlockPayload,
  AICommandId,
  AIResult,
  AITaskType,
} from './ai/aiTasks'
import { AIResultDialog } from './components/dialogs/AIResultDialog'
import { PageHeader } from './components/layout/PageHeader'
import { CommunityView } from './components/views/CommunityView'
import type { CommunityTarget } from './components/views/CommunityView'
import { ProjectDetail } from './components/views/ProjectDetail'
import { LociEditor } from './components/editor/LociEditor'
import { EditorBottomToolbar } from './components/editor/EditorBottomToolbar'
import { mountedEditorDom, useFocusModePlugin } from './components/editor/focusModePlugin'
import { sameBlockControls, useBlockGutter } from './components/editor/useBlockGutter'
import type { BlockControlRect, BlockDropTarget } from './components/editor/useBlockGutter'
import { VirtualGrid, VirtualList } from './components/virtual/VirtualList'
import {
  ActiveBlockHighlight,
  AISelectionHighlight,
  LociFlashcard,
  LociImage,
  LociQuote,
  TabIndent,
  aiSelectionHighlightKey,
} from './editor/extensions'
import type { EditorRange } from './editor/extensions'
import {
  blankBlockNode,
  blankDoc,
  blockContentNodes,
  clampImageNumber,
  collectAtomIds,
  collectNotePreviewLines,
  collectText,
  contentFromBlocks,
  createLociBlock,
  cloneTemplateValue,
  ensureDocumentHeading,
  flashcardBlockDoc,
  flashcardsFromContent,
  flattenLegacyLociBlocks,
  formatBlockTypeForBlock,
  imageBlockDoc,
  normalizeBlocksForContent,
  quoteAuthorNode,
  quoteBlockDocFromData,
  quoteDataFromNode,
  stripAtomMarks,
  tableBlockDocFromData,
  tableDataFromNode,
  textToEditorContent,
} from './editor/blocks'
import type { FormatBlockType, ImageAlignPreset } from './editor/blocks'
import {
  blockPickerOptions,
  emptyDoc,
  getNoteTemplate,
  normalizeTemplateData,
  noteTemplateIcons,
  noteTemplates,
  primaryTemplateContent,
  templateBlocksFor,
  templateDataFor,
  templateDataToContent,
  templateStructureLabel,
  updatePrimaryTemplateContent,
} from './notes/templates'
import { parseProjectMemory, serializeProjectMemory } from './projects/projectMemory'
import { atomsStore } from './stores/atomsStore'
import { flashcardSetsStore } from './stores/flashcardSetsStore'
import { loadLocalAppData } from './stores/appDataStore'
import { noteSnapshotsStore } from './stores/noteSnapshotsStore'
import { notesStore } from './stores/notesStore'
import { mediaStore } from './stores/mediaStore'
import { profileStore } from './stores/profileStore'
import { projectsStore } from './stores/projectsStore'
import { settingsStore } from './stores/settingsStore'
import { authService, signedOutSession } from './services/authService'
import { collaborationService } from './services/collaborationService'
import { communityActivityService } from './services/communityActivityService'
import { communityRecipientId } from './services/communityRecipientService'
import { friendService, normalizeUserHandle } from './services/friendService'
import type { FriendSearchResult } from './services/friendService'
import { friendGroupService } from './services/friendGroupService'
import { notificationService } from './services/notificationService'
import { profileService } from './services/profileService'
import { sharingService } from './services/sharingService'
import { initialUpdateState, updateService } from './services/updateService'
import type { UpdateState } from './services/updateService'
import { applyStudyRating, reviewStateForCard, sortDueAtomIds } from './study/spacedRepetition'
import { isAllowedLinkUrl, sanitizeImageUrl, sanitizeLinkUrl } from './utils/urlValidation'
import { INK_READING_WOMAN, INK_WALKING_WOMAN, INK_WALKMAN_BOY } from './assets/marginalia/parts.generated'
import type { InkCharacter as InkCharacterAsset } from './assets/marginalia/parts.generated'
import { EDITOR_CITY_MARGINALIA } from './assets/marginalia/city.generated'
import { cityMarginaliaIndexForNote, editorMarginaliaOpacityFromText } from './marginalia/editorMarginalia'
import { useImageLoadCoordinator } from './marginalia/useImageLoadCoordinator'
import { getGreeting, getSubtagline, getTipByIndex } from './home/tips'
import './App.css'
import './styles/marginalia.css'

type IconComponent = React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

type View = 'home' | 'editor' | 'projects' | 'community' | 'atoms' | 'settings'
type AtomSubView = 'atoms' | 'sets' | 'set-edit' | 'set-open' | 'study' | 'match' | 'quiz-setup' | 'quiz'
type StudyDirection = 'term' | 'definition'
type StudyMode = 'flashcards' | 'match' | 'quiz'
type QuizAnswerWith = 'term' | 'definition' | 'both'
type QuizSetupOptions = {
  questionCount: number
  answerWith: QuizAnswerWith
  includeTrueFalse: boolean
  includeMultipleChoice: boolean
  includeMatching: boolean
  includeWritten: boolean
}

const EDITOR_CITY_MARGINALIA_COUNT = EDITOR_CITY_MARGINALIA.length

function InkCharacter({
  character,
  slotClass,
  dataInk,
  visitKey,
}: {
  character: InkCharacterAsset
  slotClass: string
  dataInk: number
  visitKey: number
}) {
  const setLoaded = (event: SyntheticEvent<HTMLImageElement>) => event.currentTarget.classList.add('is-loaded')
  return (
    <figure key={`${slotClass}-${visitKey}`} className={`margin-ink ${slotClass} ink-figure`} data-ink={dataInk} aria-hidden>
      <img className="ink-base" src={character.base} alt="" onLoad={setLoaded} />
      {character.parts.map((part) => (
        <img
          key={part.class}
          className={`ink-part ${part.class}`}
          src={part.src}
          alt=""
          onLoad={setLoaded}
          style={{ top: `${part.topPct}%`, left: `${part.leftPct}%`, width: `${part.widthPct}%`, height: `${part.heightPct}%` }}
        />
      ))}
    </figure>
  )
}

type AtomDialog = {
  phrase: string
  definition: string
  existingId?: string
  projectId: string
  from?: number
  to?: number
  mode: 'selection' | 'manual'
}

type SearchHit =
  | { kind: 'note'; note: Note }
  | { kind: 'project'; project: Project }
  | { kind: 'atom'; atom: Atom }

type SearchRow =
  | { kind: 'section'; id: string; label: string }
  | { kind: 'hit'; id: string; hit: SearchHit; hitIndex: number }

type NoteIndexes = {
  noteTextById: Map<string, string>
  notePreviewLinesById: Map<string, string[]>
  notesByProjectId: Map<string, Note[]>
  noteIdsByAtomId: Map<string, Set<string>>
  atomIdsByProjectId: Map<string, Set<string>>
  projectIdsByAtomId: Map<string, Set<string>>
}

type NoteIndexCacheEntry = {
  content: JSONContent
  text: string
  previewLines: string[]
  atomIds: string[]
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function starterWorkspaceResultMessage(result: StarterWorkspaceUpsertResult) {
  const added = [
    result.projects ? pluralize(result.projects, 'project') : '',
    result.notes ? pluralize(result.notes, 'note') : '',
    result.atoms ? pluralize(result.atoms, 'atom') : '',
  ].filter(Boolean)
  const removedTotal = result.removedProjects + result.removedNotes + result.removedAtoms
  const pieces = []
  if (added.length) pieces.push(`Added ${added.join(', ')}`)
  if (result.repairedNotes) pieces.push(`repaired ${pluralize(result.repairedNotes, 'note')}`)
  if (removedTotal) pieces.push(`removed ${pluralize(removedTotal, 'old starter record')}`)
  return pieces.length ? `Onboarding files updated: ${pieces.join('; ')}.` : 'Onboarding files already exist.'
}

type AtomCard = {
  atom: Atom
  noteCount: number
  projectIds: string[]
  projectNames: string[]
}

type MatchTile = {
  id: string
  atomId: string
  text: string
  kind: 'term' | 'definition'
}

type MatchSelection = Pick<MatchTile, 'id' | 'atomId' | 'kind'> | null

type QuizAnswerState = {
  selectedChoice?: string
  trueFalseAnswer?: boolean
  matchingPairs?: Record<string, string>
  shortAnswer?: string
}

type QuizQuestionResult = {
  correct: boolean
  feedback?: string
  score?: number
}

type QuizResultState = {
  resultsByQuestionId: Record<string, QuizQuestionResult>
  score: number
  total: number
  marking: boolean
}

const DEFAULT_QUIZ_SETUP_OPTIONS: QuizSetupOptions = {
  questionCount: 10,
  answerWith: 'definition',
  includeTrueFalse: false,
  includeMultipleChoice: true,
  includeMatching: false,
  includeWritten: false,
}

function formatQuizAnswerWith(value: QuizAnswerWith) {
  if (value === 'term') return 'Term'
  if (value === 'definition') return 'Definition'
  return 'Both'
}

const isSetWorkspace = (view: AtomSubView) => view !== 'atoms'

type LociWorkerRequest =
  | { id: string; type: 'index-notes'; notes: Array<{ id: string; title: string; updatedAt: string; content: JSONContent }> }
  | { id: string; type: 'search'; query: string }
  | { id: string; type: 'preview'; noteId: string; content: JSONContent }

type LociWorkerJob =
  | { type: 'index-notes'; notes: Array<{ id: string; title: string; updatedAt: string; content: JSONContent }> }
  | { type: 'search'; query: string }
  | { type: 'preview'; noteId: string; content: JSONContent }

type LociWorkerResponse =
  | { id: string; type: 'index-ready'; indexVersion: number; noteCount: number }
  | { id: string; type: 'search-results'; noteIds: string[]; indexVersion: number }
  | { id: string; type: 'preview-ready'; noteId: string; preview: string }

const PROJECT_QUICK_NAV_ROW_HEIGHT = 37
const PROJECT_QUICK_NAV_MAX_HEIGHT = 240
const APP_FULLSCREEN_STORAGE_KEY = 'loci-notes:app-fullscreen'
const SIDEBAR_FLICK_THRESHOLD = 72
const SIDEBAR_FLICK_COOLDOWN_MS = 380

type EditorPanel = 'format' | 'more'

type ImageCropMode = 'contain' | 'cover'
type ImageAspectPreset = 'auto' | 'square' | 'wide' | 'portrait'
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

type DropPlacement = 'above' | 'below'

type BlockDropIntent = {
  draggedId: string
  targetId: string
  placement: DropPlacement
}

type FormatSideControlsRect = {
  blockId: string
  type: FormatBlockType
  top: number
  left: number
}

type AuthorshipMenuState = {
  from: number
  to: number
  top: number
  left: number
}

type FormatOption = {
  id: string
  label: string
  icon: IconComponent
  description: string
  ariaLabel?: string
  group: 'Structure' | 'Text' | 'Insert'
  enabled: boolean
  action?: () => void
}

const FORMAT_DIALOG_GROUP_ORDER: FormatOption['group'][] = ['Structure', 'Text', 'Insert']

type AppDialog =
  | {
      kind: 'confirm'
      title: string
      message: string
      confirmLabel: string
      secondaryLabel?: string
      intent?: 'danger' | 'primary'
      onConfirm: () => void | Promise<void>
      onSecondary?: () => void | Promise<void>
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

const HIGHLIGHTER_COLORS = ['rgba(62, 50, 32, 0.18)', 'rgba(46, 52, 64, 0.14)', 'rgba(26, 26, 26, 0.1)', 'rgba(244, 244, 242, 0.82)'] as const
const DEFAULT_HIGHLIGHTER_COLOR = HIGHLIGHTER_COLORS[0]

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
    pinnedCommunityRecipientIds: [],
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
    pinnedCommunityRecipientIds: Array.isArray(settings.pinnedCommunityRecipientIds)
      ? settings.pinnedCommunityRecipientIds.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

function insertDraftText(editor: NonNullable<ReturnType<typeof useEditor>>, text: string) {
  editor.chain().focus().insertContent(textToEditorContent(text).content ?? []).run()
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

function createNoteIndexes(notes: Note[], cache = new Map<string, NoteIndexCacheEntry>(), maxPreviewLines = 6): NoteIndexes {
  const noteTextById = new Map<string, string>()
  const notePreviewLinesById = new Map<string, string[]>()
  const notesByProjectId = new Map<string, Note[]>()
  const noteIdsByAtomId = new Map<string, Set<string>>()
  const atomIdsByProjectId = new Map<string, Set<string>>()
  const projectIdsByAtomId = new Map<string, Set<string>>()
  const liveNoteIds = new Set(notes.map((note) => note.id))

  notes.forEach((note) => {
    const cached = cache.get(note.id)
    const entry = cached?.content === note.content
      ? cached
      : {
          content: note.content,
          text: collectText(note.content ?? emptyDoc),
          previewLines: collectNotePreviewLines(note.content, maxPreviewLines),
          atomIds: collectAtomIds(note.content),
        }
    cache.set(note.id, entry)
    noteTextById.set(note.id, entry.text)
    notePreviewLinesById.set(note.id, entry.previewLines)

    const projectNotes = notesByProjectId.get(note.projectId) ?? []
    projectNotes.push(note)
    notesByProjectId.set(note.projectId, projectNotes)

    entry.atomIds.forEach((atomId) => {
      const atomNoteIds = noteIdsByAtomId.get(atomId) ?? new Set<string>()
      atomNoteIds.add(note.id)
      noteIdsByAtomId.set(atomId, atomNoteIds)

      const projectAtomIds = atomIdsByProjectId.get(note.projectId) ?? new Set<string>()
      projectAtomIds.add(atomId)
      atomIdsByProjectId.set(note.projectId, projectAtomIds)

      const atomProjectIds = projectIdsByAtomId.get(atomId) ?? new Set<string>()
      atomProjectIds.add(note.projectId)
      projectIdsByAtomId.set(atomId, atomProjectIds)
    })
  })

  cache.forEach((_, noteId) => {
    if (!liveNoteIds.has(noteId)) cache.delete(noteId)
  })
  notesByProjectId.forEach((projectNotes) => projectNotes.sort(sortByCreated))
  return { noteTextById, notePreviewLinesById, notesByProjectId, noteIdsByAtomId, atomIdsByProjectId, projectIdsByAtomId }
}

function normalizeAtomPhrase(phrase: string) {
  return phrase.trim().toLowerCase()
}

function projectIdForAtom(atom: Atom) {
  return atom.projectId || UNASSIGNED_PROJECT_ID
}

function findProjectAtomByPhrase(atoms: Atom[], projectId: string, phrase: string, excludeId = '') {
  const normalized = normalizeAtomPhrase(phrase)
  return atoms.find((atom) =>
    atom.id !== excludeId &&
    projectIdForAtom(atom) === projectId &&
    normalizeAtomPhrase(atom.phrase) === normalized,
  )
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
const NOTE_SAVE_DEBOUNCE_MS = 150
const NOTICE_TOAST_MS = 4000
const OPTIMISTIC_UNDO_MS = 6000

const DEFAULT_PROFILE_COLOR = '#2E3440'
const BAD_PROFILE_DISPLAY_NAME = 'Your nMae'

const PROFILE_COLORS = ['#2E3440', '#1A1A1A', '#3E3220', '#F4F4F2', '#5A5260', '#7F7981']
const RECENT_PROJECT_NOTE_LIMIT = 5
const PROJECT_ACCENT_FALLBACKS = ['#2E3440', '#3E3220', '#4C6B5E', '#7A5C3F', '#635B75', '#8A4B52', '#49677A']
const PROJECT_COLORS = ['#2E3440', '#3E3220', '#4C6B5E', '#7A5C3F', '#635B75', '#8A4B52', '#49677A', '#6D6A52']

type ProjectCardSummary = {
  project: Project
  notes: Note[]
  recentNotes: Note[]
  latestActivityAt: number
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function projectDisplayColor(project: Project) {
  const color = project.color?.trim()
  if (color && color.toLowerCase() !== '#1a1a1a') return color
  return PROJECT_ACCENT_FALLBACKS[hashString(`${project.id}:${project.name}`) % PROJECT_ACCENT_FALLBACKS.length]
}

function hexToRgb(hex: string) {
  const normalized = hex.trim().replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(46, 52, 64, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function avatarTextColor(backgroundColor: string) {
  return backgroundColor.toLowerCase() === '#f4f4f2' ? '#1A1A1A' : '#F4F4F2'
}

type ProfileDraft = {
  displayName: string
  initials: string
  handle: string
  handleEdited: boolean
  avatarColor: string
}

type GroupDialogDraft = {
  name: string
  memberAccountIds: string[]
}

type SidebarProps = {
  activeView: View
  activeProject: Project | undefined
  activeNoteId: string | undefined
  atomSubView: AtomSubView
  draggedNoteIds: string[]
  dragOverProjectId: string
  profileAvatarColor: string
  profileDisplayName: string
  profileHandleLabel: string
  profileInitials: string
  projectQuickNotes: Note[]
  onAssignNoteToProjectDrop: (event: React.DragEvent<HTMLElement>, targetProjectId: string) => void
  onDragEnterProject: (projectId: string) => void
  onDragLeaveProject: (projectId: string) => void
  onDragOverProject: (event: React.DragEvent<HTMLElement>) => void
  onNewNote: () => void
  onOpenNote: (noteId: string) => void
  onOpenProfile: () => void
  onOpenSearch: () => void
  onOpenProjectsRoot: () => void
  onRenameNote: (noteId: string, title: string) => void
  onSetActiveView: (view: View) => void
  fullscreenActive: boolean
  onToggleFullscreen: () => void
}

const Sidebar = memo(function Sidebar({
  activeView,
  activeProject,
  activeNoteId,
  atomSubView,
  draggedNoteIds,
  dragOverProjectId,
  profileAvatarColor,
  profileDisplayName,
  profileHandleLabel,
  profileInitials,
  projectQuickNotes,
  onAssignNoteToProjectDrop,
  onDragEnterProject,
  onDragLeaveProject,
  onDragOverProject,
  onNewNote,
  onOpenNote,
  onOpenProfile,
  onOpenSearch,
  onOpenProjectsRoot,
  onRenameNote,
  onSetActiveView,
  fullscreenActive,
  onToggleFullscreen,
}: SidebarProps) {
  const [editingNoteId, setEditingNoteId] = useState('')
  const [editingNoteTitle, setEditingNoteTitle] = useState('')
  const projectQuickNavHeight = Math.min(projectQuickNotes.length * PROJECT_QUICK_NAV_ROW_HEIGHT, PROJECT_QUICK_NAV_MAX_HEIGHT)
  const projectQuickNavStyle = {
    '--project-quick-nav-height': `${projectQuickNavHeight}px`,
  } as React.CSSProperties

  const startNoteRename = (note: Note) => {
    setEditingNoteId(note.id)
    setEditingNoteTitle(note.title || 'Untitled Note')
  }

  const commitNoteRename = (note: Note) => {
    const nextTitle = editingNoteTitle.replace(/\s*\r?\n\s*/g, ' ').trim() || 'Untitled Note'
    setEditingNoteTitle(nextTitle)
    setEditingNoteId('')
    if (nextTitle !== note.title) onRenameNote(note.id, nextTitle)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section sidebar-actions">
        <button className="nav-action" type="button" onClick={() => {
          onOpenSearch()
        }}>
          <Search size={18} />
          <span className="nav-label">Search</span>
        </button>

        <button className="nav-action" type="button" onClick={() => {
          onNewNote()
        }}>
          <Plus size={18} />
          <span className="nav-label">New Note</span>
        </button>
      </div>

      <nav className="sidebar-section primary-nav" aria-label="Primary">
        <span className="sidebar-section-label">Navigation</span>
        <button className={activeView === 'home' ? 'active' : ''} type="button" onClick={() => {
          onSetActiveView('home')
        }}>
          <Home size={18} />
          <span className="nav-label">Home</span>
        </button>
        <button className={activeView === 'atoms' ? 'active' : ''} type="button" onClick={() => {
          onSetActiveView('atoms')
        }}>
          <AtomIcon size={18} />
          <span className="nav-label">{isSetWorkspace(atomSubView) ? 'Sets' : 'Atoms'}</span>
        </button>
        <button
          className={`project-nav-trigger ${activeView === 'projects' ? 'active' : ''} ${draggedNoteIds.length ? 'is-drop-target' : ''} ${dragOverProjectId === UNASSIGNED_PROJECT_ID ? 'is-drop-active' : ''}`}
          type="button"
          onDragOver={onDragOverProject}
          onDragEnter={() => onDragEnterProject(UNASSIGNED_PROJECT_ID)}
          onDragLeave={() => onDragLeaveProject(UNASSIGNED_PROJECT_ID)}
          onDrop={(event) => onAssignNoteToProjectDrop(event, UNASSIGNED_PROJECT_ID)}
          onClick={() => {
            onOpenProjectsRoot()
          }}
        >
          <Layers3 size={18} />
          <span className="nav-label">Projects</span>
        </button>
      </nav>

      {activeProject && projectQuickNotes.length > 0 && (
        <div className="sidebar-section sidebar-project-section">
          <span className="sidebar-section-label">{activeProject.name}</span>
          <VirtualList
            className="project-quick-nav scroll-hover"
            style={projectQuickNavStyle}
            items={projectQuickNotes}
            rowHeight={PROJECT_QUICK_NAV_ROW_HEIGHT}
            overscan={6}
            ariaLabel={`${activeProject.name} documents`}
            renderItem={(note) => (
              <div className={`quick-note-row ${note.id === activeNoteId ? 'is-active' : ''}`}>
                <button type="button" onClick={() => {
                  onOpenNote(note.id)
                }}>
                  {editingNoteId === note.id ? (
                    <input
                      className="note-title-rename-input sidebar-note-title-input"
                      value={editingNoteTitle}
                      onBlur={() => commitNoteRename(note)}
                      onChange={(event) => setEditingNoteTitle(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          event.stopPropagation()
                          commitNoteRename(note)
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          event.stopPropagation()
                          setEditingNoteTitle(note.title || 'Untitled Note')
                          setEditingNoteId('')
                        }
                      }}
                      aria-label="Document name"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="sidebar-note-title"
                      title="Double-click to rename"
                      onDoubleClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        startNoteRename(note)
                      }}
                    >
                      {note.title || 'Untitled Note'}
                    </span>
                  )}
                </button>
              </div>
            )}
          />
        </div>
      )}

      <div className="sidebar-bottom">
        <nav className="sidebar-section secondary-nav" aria-label="Community">
          <button className={activeView === 'community' ? 'active' : ''} type="button" onClick={() => onSetActiveView('community')}>
            <Users size={18} />
            <span className="nav-label">Community</span>
          </button>
        </nav>

        <div className="sidebar-section sidebar-profile-section">
          <button className="profile-row" type="button" onClick={onOpenProfile} aria-label="Open profile">
            <div className="avatar" style={{ background: profileAvatarColor, color: avatarTextColor(profileAvatarColor) }}>{profileInitials}</div>
            <div className="profile-text">
              <strong>{profileDisplayName}</strong>
              <span>{profileHandleLabel}</span>
            </div>
          </button>

          <div className="sidebar-bottom-controls">
            <button
              className="sidebar-fullscreen"
              type="button"
              aria-label={fullscreenActive ? 'Exit fullscreen layout' : 'Enter fullscreen layout'}
              aria-pressed={fullscreenActive}
              onClick={onToggleFullscreen}
            >
              {fullscreenActive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              className={`sidebar-settings ${activeView === 'settings' ? 'active' : ''}`}
              type="button"
              aria-label="Settings"
              onClick={() => onSetActiveView('settings')}
            >
              <Settings size={18} />
              <span className="nav-label">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
})

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
    handle: '',
    handleEdited: false,
    avatarColor: DEFAULT_PROFILE_COLOR,
  })
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [activeView, setActiveView] = useState<View>('home')
  const [appFullscreen, setAppFullscreen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(APP_FULLSCREEN_STORAGE_KEY) === 'true'
  })
  const [appImmersiveFullscreen, setAppImmersiveFullscreen] = useState(false)
  const [sidebarRevealAnimating, setSidebarRevealAnimating] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [flippedAtomIds, setFlippedAtomIds] = useState<string[]>([])
  const [atomSelectionMode, setAtomSelectionMode] = useState(false)
  const [selectedAtomIds, setSelectedAtomIds] = useState<string[]>([])
  const [atomSubView, setAtomSubView] = useState<AtomSubView>('atoms')
  const [atomHeadingMenuOpen, setAtomHeadingMenuOpen] = useState(false)
  const [atomHeadingHoverTarget, setAtomHeadingHoverTarget] = useState<'atoms' | 'sets' | null>(null)
  const [editingFlashcardSetId, setEditingFlashcardSetId] = useState<string | null>(null)
  const [flashcardSetTitleEditing, setFlashcardSetTitleEditing] = useState(false)
  const [flashcardSetDraftName, setFlashcardSetDraftName] = useState('')
  const [flashcardSetDraftDescription, setFlashcardSetDraftDescription] = useState('')
  const [flashcardSetDraftAtomIds, setFlashcardSetDraftAtomIds] = useState<string[]>([])
  const [flashcardSetAtomQuery, setFlashcardSetAtomQuery] = useState('')
  const [studyingFlashcardSetId, setStudyingFlashcardSetId] = useState<string | null>(null)
  const [studyMode, setStudyMode] = useState<StudyMode | null>(null)
  const [studyAtomIds, setStudyAtomIds] = useState<string[]>([])
  const [studyIndex, setStudyIndex] = useState(0)
  const [studyFlipped, setStudyFlipped] = useState(false)
  const [studyDirection, setStudyDirection] = useState<StudyDirection>('term')
  const [studyShuffle, setStudyShuffle] = useState(false)
  const [studyKnownAtomIds, setStudyKnownAtomIds] = useState<string[]>([])
  const [studyLearningAtomIds, setStudyLearningAtomIds] = useState<string[]>([])
  const [reviewStates, setReviewStates] = useState<FlashcardReviewState[]>([])
  const [aiHintRunningAtomId, setAiHintRunningAtomId] = useState<string | null>(null)
  const [matchTiles, setMatchTiles] = useState<MatchTile[]>([])
  const [matchSelection, setMatchSelection] = useState<MatchSelection>(null)
  const [matchMatchedAtomIds, setMatchMatchedAtomIds] = useState<string[]>([])
  const [matchMistakes, setMatchMistakes] = useState(0)
  const [studyElapsedMs, setStudyElapsedMs] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, QuizAnswerState>>({})
  const [quizResult, setQuizResult] = useState<QuizResultState | null>(null)
  const [quizGenerating, setQuizGenerating] = useState(false)
  const [quizSetupOptions, setQuizSetupOptions] = useState<QuizSetupOptions>(DEFAULT_QUIZ_SETUP_OPTIONS)
  const [quizAnswerMenuOpen, setQuizAnswerMenuOpen] = useState(false)
  const [draggedNoteIds, setDraggedNoteIds] = useState<string[]>([])
  const [dragOverProjectId, setDragOverProjectId] = useState('')
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [atomSearchQuery, setAtomSearchQuery] = useState('')
  const [atomProjectFilter, setAtomProjectFilter] = useState('all')
  const [atomProjectMenuOpen, setAtomProjectMenuOpen] = useState(false)
  const [openProjectMenuId, setOpenProjectMenuId] = useState('')
  const [openLooseNoteMenuId, setOpenLooseNoteMenuId] = useState('')
  const [atomUnderlinesVisible, setAtomUnderlinesVisible] = useState(true)
  const [editorFocusMode, setEditorFocusMode] = useState(false)
  const [editorFocusModeVisual, setEditorFocusModeVisual] = useState(false)
  const [editorAuthenticWriterMode, setEditorAuthenticWriterMode] = useState(false)
  const [editorCityMarginaliaOpacity, setEditorCityMarginaliaOpacity] = useState(1)
  const { imageLoadStates, ensureImageLoaded } = useImageLoadCoordinator()
  const [, setSaving] = useState(false)
  const [atomDialog, setAtomDialog] = useState<AtomDialog | null>(null)
  const [notice, setNotice] = useState('')
  const [undoNotice, setUndoNotice] = useState<{ message: string; action: () => void } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchActiveIndex, setSearchActiveIndex] = useState(0)
  const [noteHistoryOpen, setNoteHistoryOpen] = useState(false)
  const [noteSnapshots, setNoteSnapshots] = useState<NoteSnapshot[]>([])
  const [historyPreviewExpanded, setHistoryPreviewExpanded] = useState<Record<string, boolean>>({})
  const [appDialog, setAppDialog] = useState<AppDialog | null>(null)
  const [templateProjectId, setTemplateProjectId] = useState<string | null>(null)
  const [activeEditorPanel, setActiveEditorPanel] = useState<EditorPanel | null>(null)
  const [formatDialogQuery, setFormatDialogQuery] = useState('')
  const formatDialogSearchRef = useRef<HTMLInputElement | null>(null)
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
  const [formatSideControls, setFormatSideControls] = useState<FormatSideControlsRect | null>(null)
  const [authorshipMenu, setAuthorshipMenu] = useState<AuthorshipMenuState | null>(null)
  const [blockControls, setBlockControls] = useState<BlockControlRect[]>([])
  const [hoveredBlockControlId, setHoveredBlockControlId] = useState('')
  const [imageCropEditing, setImageCropEditing] = useState(false)
  const [imageCropDragging, setImageCropDragging] = useState(false)
  const [aiMarkingCriteria] = useState(DEFAULT_MARKING_CRITERIA)
  const [aiContextRange, setAiContextRange] = useState<EditorRange | null>(null)
  const [aiRunning, setAiRunning] = useState(false)
  const [aiInstructionUpdating, setAiInstructionUpdating] = useState(false)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [updateState, setUpdateState] = useState<UpdateState>(initialUpdateState)
  const [authSession, setAuthSession] = useState<AuthSession>(() => signedOutSession())
  const [accountProfile, setAccountProfile] = useState<AccountProfile | undefined>()
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([])
  const [sharedNoteExports, setSharedNoteExports] = useState<SharedNoteExport[]>([])
  const [communitySearchQuery, setCommunitySearchQuery] = useState('')
  const [communitySearchResults, setCommunitySearchResults] = useState<FriendSearchResult[]>([])
  const [communityTarget, setCommunityTarget] = useState<CommunityTarget | null>(null)
  const [groupDialogDraft, setGroupDialogDraft] = useState<GroupDialogDraft | null>(null)
  const [developerNotifications, setDeveloperNotifications] = useState<RemoteContentItem[]>([])
  const [, setShowSaveState] = useState(true)
  const [localLoadIssues, setLocalLoadIssues] = useState<string[]>([])
  const [dashboardNow, setDashboardNow] = useState(() => new Date())
  const [homeVisitCount, setHomeVisitCount] = useState(0)
  const notesRef = useRef<Note[]>([])
  const atomsRef = useRef<Atom[]>([])
  const noteIndexCacheRef = useRef<Map<string, NoteIndexCacheEntry>>(new Map())
  const selectedNoteIdRef = useRef('')
  const noteOpenHistoryRef = useRef<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const aiPromptInputRef = useRef<HTMLInputElement>(null)
  const flashcardSetTitleInputRef = useRef<HTMLInputElement>(null)
  const atomsTitleSwitcherRef = useRef<HTMLDivElement | null>(null)
  const atomProjectFilterRef = useRef<HTMLDivElement | null>(null)
  const flashcardProjectFilterRef = useRef<HTMLDivElement | null>(null)
  const quizAnswerDropdownRef = useRef<HTMLDivElement | null>(null)
  const aiContextRangeRef = useRef<EditorRange | null>(null)
  const highlighterArmedRef = useRef(false)
  const updateCheckRanRef = useRef(false)
  const highlighterColorRef = useRef<string>(DEFAULT_HIGHLIGHTER_COLOR)
  const lastPaintedHighlightRangeRef = useRef('')
  const documentScrollRef = useRef<HTMLElement | null>(null)
  const homeScrollRef = useRef<HTMLElement | null>(null)
  const appShellRef = useRef<HTMLElement | null>(null)
  const previousViewRef = useRef<View>('home')
  const sidebarFlickAtRef = useRef(0)
  const sidebarRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sidebarRevealCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const floatingToolbarFrameRef = useRef<number | null>(null)
  const floatingToolbarDeferredMeasureRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorScrollTopRef = useRef(0)
  const blockEditorShellRef = useRef<HTMLDivElement | HTMLElement | null>(null)
  const floatingEditorWrapRef = useRef<HTMLDivElement | null>(null)
  const formatDialogRef = useRef<HTMLElement | null>(null)
  const snapshotDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStateDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const atomSyncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiPromptHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorFocusModeVisualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorFocusModeVisualFrameRef = useRef<number | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const studySessionStartedAtRef = useRef<number | null>(null)
  const studySessionPersistedRef = useRef(false)
  const optimisticDeleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const formatSideFrameRef = useRef<number | null>(null)
  const formatBlockFrameRef = useRef<number | null>(null)
  const editorResizeFrameRef = useRef<number | null>(null)
  const suppressEditorPersistRef = useRef(false)
  const lastLocalEditorContentRef = useRef<{ noteId: string; content: JSONContent } | null>(null)
  const editorRef = useRef<TiptapEditor | null>(null)
  const blockUndoStackRef = useRef<Array<{ noteId: string; blocks: LociBlock[] }>>([])
  const selectedBlocksRef = useRef<LociBlock[]>([])
  const draggedBlockIdRef = useRef('')
  const blockDropTargetsRef = useRef<BlockDropTarget[]>([])
  const blockDropIntentRef = useRef<BlockDropIntent | null>(null)
  const blockDropFrameRef = useRef<number | null>(null)
  const blockDropIndicatorRef = useRef<HTMLSpanElement | null>(null)
  const pendingEnterBlockIndexRef = useRef<number | null>(null)
  const suppressProjectNavUntilRef = useRef(0)
  const imageCropDragRef = useRef<ImageCropDragState | null>(null)
  const pendingNoteSavesRef = useRef<Map<string, { note: Note; maintainContent: boolean }>>(new Map())
  const lociWorkerRef = useRef<Worker | null>(null)
  const workerJobIdRef = useRef(0)
  const latestSearchJobRef = useRef('')
  const [workerReady, setWorkerReady] = useState(false)
  const [workerSearchNoteIds, setWorkerSearchNoteIds] = useState<string[] | null>(null)

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0]
  const selectedProject = projects.find((project) => project.id === selectedNote?.projectId)
  const openedProject = projects.find((project) => project.id === selectedProjectId)
  const selectedTemplateData = selectedNote
    ? normalizeTemplateData(selectedNote.templateId ?? 'blank', selectedNote.content ?? emptyDoc, selectedNote.templateData)
    : null
  const selectedEditorCityMarginalia = selectedNote && EDITOR_CITY_MARGINALIA_COUNT > 0
    ? EDITOR_CITY_MARGINALIA[cityMarginaliaIndexForNote(selectedNote.id, EDITOR_CITY_MARGINALIA_COUNT)]
    : null
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const atomById = useMemo(() => new Map(atoms.map((atom) => [atom.id, atom])), [atoms])
  const noteIndexes = useMemo(() => createNoteIndexes(notes, noteIndexCacheRef.current), [notes])
  const hasExplicitAIContext = Boolean(aiContextRange)
  const profileDisplayName = localProfile?.displayName ?? 'Loci Notes'
  const profileInitials = localProfile?.initials ?? 'LN'
  const profileAvatarColor = localProfile?.avatarColor ?? DEFAULT_PROFILE_COLOR
  const profileHandleLabel = accountProfile?.handle ? `@${accountProfile.handle}` : 'No user tag'
  const accountStatusLabel = authSession.status === 'signed-in'
    ? accountProfile?.handle
      ? `Signed in as @${accountProfile.handle}`
      : `Signed in${accountProfile?.displayName ? ` as ${accountProfile.displayName}` : ''}`
    : 'Signed out · local workspace only'
  const acceptedFriendCount = friendships.filter((friendship) => friendship.status === 'accepted').length
  const pendingFriendCount = friendships.filter((friendship) => friendship.status !== 'accepted').length
  const selectedCommunityFriend = communityTarget?.kind === 'friend'
    ? friendships.find((friendship) => friendship.id === communityTarget.id)
    : undefined
  const selectedCommunityGroup = communityTarget?.kind === 'group'
    ? friendGroups.find((group) => group.id === communityTarget.id)
    : undefined
  const selectedCommunityRecipientIds = selectedCommunityFriend
    ? [selectedCommunityFriend.friendAccountId]
    : selectedCommunityGroup?.memberAccountIds ?? []
  const selectedCommunityShares = selectedCommunityRecipientIds.length
    ? sharedNoteExports.filter((share) => selectedCommunityRecipientIds.some((accountId) => share.recipientAccountIds.includes(accountId)))
    : []
  const acceptedFriendships = friendships.filter((friendship) => friendship.status === 'accepted')
  const activeProjectForQuickNav = activeView === 'editor' ? selectedProject : openedProject
  const localDatabaseNeedsRepair = localLoadIssues.some((issue) =>
    /notes|noteBodies|noteMetas|database|dexie|starter workspace/i.test(issue),
  )
  const starterWorkspaceVisible =
    starterWorkspaceProjectIds.every((projectId) => projects.some((project) => project.id === projectId)) &&
    starterWorkspaceNoteIds.every((noteId) => notes.some((note) => note.id === noteId)) &&
    starterWorkspaceAtomIds.every((atomId) => atoms.some((atom) => atom.id === atomId)) &&
    deprecatedStarterProjectIds.every((projectId) => !projects.some((project) => project.id === projectId)) &&
    deprecatedStarterNoteIds.every((noteId) => !notes.some((note) => note.id === noteId)) &&
    deprecatedStarterAtomIds.every((atomId) => !atoms.some((atom) => atom.id === atomId))

  const clearNoticeTimer = useCallback(() => {
    if (!noticeTimerRef.current) return
    clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = null
  }, [])

  const showNotice = useCallback((message: string) => {
    clearNoticeTimer()
    setNotice(message)
    if (!message) return
    noticeTimerRef.current = setTimeout(() => {
      setNotice('')
      noticeTimerRef.current = null
    }, NOTICE_TOAST_MS)
  }, [clearNoticeTimer])

  const projectQuickNotes = useMemo(
    () =>
      activeProjectForQuickNav
        ? noteIndexes.notesByProjectId.get(activeProjectForQuickNav.id) ?? []
        : [],
    [activeProjectForQuickNav, noteIndexes],
  )
  const unassignedNotes = useMemo(() => {
    const projectIds = new Set(projects.map((project) => project.id))
    return notes
      .filter((note) => note.projectId === UNASSIGNED_PROJECT_ID || !projectIds.has(note.projectId))
      .sort(sortByUpdated)
  }, [notes, projects])
  const projectCards = useMemo<ProjectCardSummary[]>(() => {
    return projects
      .map((project) => {
        const projectNotes = [...(noteIndexes.notesByProjectId.get(project.id) ?? [])].sort(sortByUpdated)
        const latestActivityAt = projectNotes[0] ? new Date(projectNotes[0].updatedAt).getTime() : 0
        return {
          project,
          notes: projectNotes,
          recentNotes: projectNotes.slice(0, RECENT_PROJECT_NOTE_LIMIT),
          latestActivityAt,
        }
      })
      .sort((a, b) => {
        const aPinnedAt = a.project.pinnedAt ? new Date(a.project.pinnedAt).getTime() : 0
        const bPinnedAt = b.project.pinnedAt ? new Date(b.project.pinnedAt).getTime() : 0
        if (aPinnedAt || bPinnedAt) return bPinnedAt - aPinnedAt || a.project.name.localeCompare(b.project.name)
        return b.latestActivityAt - a.latestActivityAt || a.project.name.localeCompare(b.project.name)
      })
  }, [noteIndexes, projects])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    atomsRef.current = atoms
  }, [atoms])

  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId
  }, [selectedNoteId])

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_FULLSCREEN_STORAGE_KEY, String(appFullscreen))
    } catch {
      // Ignore storage failures; fullscreen still works for the current session.
    }
  }, [appFullscreen])

  useEffect(() => {
    if (!appFullscreen) setAppImmersiveFullscreen(false)
  }, [appFullscreen])

  useEffect(() => {
    return () => {
      if (sidebarRevealTimeoutRef.current) clearTimeout(sidebarRevealTimeoutRef.current)
      if (sidebarRevealCleanupTimeoutRef.current) clearTimeout(sidebarRevealCleanupTimeoutRef.current)
      if (floatingToolbarDeferredMeasureRef.current) clearTimeout(floatingToolbarDeferredMeasureRef.current)
      if (floatingToolbarFrameRef.current) cancelAnimationFrame(floatingToolbarFrameRef.current)
    }
  }, [])

  const runWorkerJob = useCallback(<T extends LociWorkerResponse>(message: LociWorkerJob): Promise<T> | null => {
    const worker = lociWorkerRef.current
    if (!worker) return null
    const id = `job_${workerJobIdRef.current += 1}`
    const payload = { ...message, id } as LociWorkerRequest
    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent<LociWorkerResponse>) => {
        if (event.data.id !== id) return
        worker.removeEventListener('message', onMessage as EventListener)
        resolve(event.data as T)
      }
      worker.addEventListener('message', onMessage as EventListener)
      worker.postMessage(payload)
    })
  }, [])

  const loadData = useCallback(async () => {
    try {
      const {
        notes: storedNotes,
        atoms: storedAtoms,
        flashcardSets: storedFlashcardSets,
        projects: storedProjects,
        profile: storedProfile,
        settings: storedSettings,
        loadIssues,
      } = await loadLocalAppData()
      setLocalLoadIssues(loadIssues.map((issue) => `${issue.area}: ${issue.message}`))
      const loadIssueAreas = new Set(loadIssues.map((issue) => issue.area))
      const normalizedSettings = normalizeUserSettings(storedSettings)
      if (!storedSettings && !loadIssueAreas.has('settings')) {
        try {
          await settingsStore.save(normalizedSettings)
        } catch (error) {
          console.error('Could not save default settings', error)
          loadIssues.push({ area: 'settings', message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) })
        }
      }

      const normalizedProjects = storedProjects.map((project) => ({ ...project, description: project.description ?? '' }))
      if (storedProjects.some((project) => project.description === undefined) && !loadIssueAreas.has('projects')) {
        try {
          await projectsStore.saveMany(normalizedProjects)
        } catch (error) {
          console.error('Could not normalize projects', error)
          loadIssues.push({ area: 'projects', message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) })
        }
      }
      setProjects(normalizedProjects)

      const projectIds = new Set(storedProjects.map((p) => p.id))

      const normalized = await Promise.all(
        storedNotes.map(async (note) => {
          const nextPid =
            note.projectId === UNASSIGNED_PROJECT_ID || projectIds.has(note.projectId)
              ? note.projectId
              : UNASSIGNED_PROJECT_ID
          const templateId: NoteTemplateId =
            note.templateId === 'report' || note.templateId === 'planner' || note.templateId === 'slideshow'
              ? note.templateId
              : 'blank'
          const baseTemplateData = normalizeTemplateData(templateId, note.content ?? emptyDoc, note.templateData)
          const headingMigration = templateId === 'blank'
            ? ensureDocumentHeading(templateDataToContent(baseTemplateData), note.title)
            : null
          const templateData = headingMigration
            ? { ...baseTemplateData, body: headingMigration.content }
            : baseTemplateData
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

          const templateMetaChanged =
            JSON.stringify(note.templateData) !== JSON.stringify(templateData) ||
            JSON.stringify(note.content) !== JSON.stringify(content)

          const blocksChanged =
            blocks.length !== (note.blocks?.length ?? 0) ||
            blocks.some((block, index) => {
              const previous = note.blocks?.[index]
              return !previous ||
                block.id !== previous.id ||
                block.type !== previous.type ||
                JSON.stringify(block.content) !== JSON.stringify(previous.content) ||
                JSON.stringify(block.attrs ?? {}) !== JSON.stringify(previous.attrs ?? {})
            })
          const changed =
            nextPid !== note.projectId ||
            (note.tags?.length ?? 0) > 0 ||
            note.templateId !== templateId ||
            !note.templateData ||
            !note.blocks ||
            blocksChanged ||
            Boolean(headingMigration?.changed) ||
            templateMetaChanged

          if (changed && !loadIssueAreas.has('notes')) {
            try {
              await notesStore.save(next)
            } catch (error) {
              console.error('Could not normalize note', error)
              loadIssues.push({ area: 'notes', message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) })
            }
          }

          return next
        }),
      )

      setNotes(normalized)
      setAtoms(storedAtoms.map((atom) => ({ ...atom, projectId: projectIdForAtom(atom), tags: atom.tags ?? [] })))
      setFlashcardSets(storedFlashcardSets.map(normalizeFlashcardSet))
      if (storedProfile && isBadProfileDisplayName(storedProfile.displayName)) {
        await profileStore.saveLocalWorkspaceProfile({
          ...storedProfile,
          displayName: '',
          initials: '',
          updatedAt: nowIso(),
        })
      }
      setLocalProfile(storedProfile && !isBadProfileDisplayName(storedProfile.displayName) && storedProfile.displayName.trim() ? storedProfile : null)
      setUserSettings(normalizedSettings)
      setAtomSubView(normalizedSettings.preferredAtomSubView ?? 'atoms')
      setProfileLoaded(true)
      setSelectedNoteId((current) => current || normalized[0]?.id || '')
      setLocalLoadIssues(loadIssues.map((issue) => `${issue.area}: ${issue.message}`))
      if (loadIssues.length) showNotice(`Local data loaded with ${loadIssues.length} issue${loadIssues.length === 1 ? '' : 's'}: ${loadIssues[0].message}`)
      return true
    } catch (error) {
      console.error('Could not load local workspace data', error)
      setLocalLoadIssues([error instanceof Error ? `${error.name}: ${error.message}` : String(error)])
      setProfileLoaded(true)
      showNotice(`Could not load local workspace data: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }, [showNotice])

  const repairLocalDatabase = async () => {
    try {
      const result = await notesStore.repairLocalStorage()
      const loaded = await loadData()
      const changed = result.notesRebuilt + result.metasRebuilt + result.bodiesRebuilt
      if (!loaded) return
      showNotice(
        changed
          ? `Local database repaired: ${pluralize(result.notesRebuilt, 'note')} rebuilt, ${pluralize(result.metasRebuilt, 'meta')} rebuilt, ${pluralize(result.bodiesRebuilt, 'body', 'bodies')} rebuilt.`
          : result.malformedBodies
            ? `Local database checked. Found ${pluralize(result.malformedBodies, 'malformed note body', 'malformed note bodies')}.`
            : 'Local database checked. No note repair needed.',
      )
    } catch (error) {
      console.error('Could not repair local database', error)
      showNotice(`Could not repair local database: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const seedStarterWorkspace = async () => {
    try {
      const result = await upsertStarterWorkspace({ force: true })
      const loaded = await loadData()
      if (!loaded) return
      const total = result.projects + result.atoms + result.notes + result.repairedNotes + result.removedProjects + result.removedNotes + result.removedAtoms
      showNotice(total ? starterWorkspaceResultMessage(result) : 'Onboarding files already exist.')
    } catch (error) {
      console.error('Could not add starter workspace', error)
      showNotice('Could not add starter workspace.')
    }
  }

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (typeof Worker === 'undefined') return
    const worker = new Worker(new URL('./workers/lociWorker.ts', import.meta.url), { type: 'module' })
    lociWorkerRef.current = worker
    return () => {
      worker.terminate()
      lociWorkerRef.current = null
    }
  }, [])

  useEffect(() => {
    const job = runWorkerJob<{ id: string; type: 'index-ready'; indexVersion: number; noteCount: number }>({
      type: 'index-notes',
      notes: notes.map((note) => ({ id: note.id, title: note.title, updatedAt: note.updatedAt, content: note.content })),
    })
    if (!job) return
    let cancelled = false
    job.then(() => {
      if (!cancelled) setWorkerReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [notes, runWorkerJob])

  const checkForUpdates = useCallback(async (manual = false) => {
    await updateService.checkAndInstall({
      manual,
      isDesktop: Boolean(window.__TAURI_INTERNALS__),
      onStateChange: setUpdateState,
    })
  }, [])

  useEffect(() => {
    if (updateCheckRanRef.current || !window.__TAURI_INTERNALS__) return
    updateCheckRanRef.current = true
    void checkForUpdates()
  }, [checkForUpdates])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      authService.getAccountState(),
      friendService.listFriends(),
      friendGroupService.listGroups(),
      sharingService.listAll(),
      notificationService.listDeveloperNotifications(),
    ]).then(([accountState, storedFriendships, storedFriendGroups, shares, notifications]) => {
      if (cancelled) return
      setAuthSession(accountState.session)
      setAccountProfile(accountState.profile)
      setFriendships(storedFriendships)
      setFriendGroups(storedFriendGroups)
      setSharedNoteExports(shares)
      setDeveloperNotifications(notifications)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function runSavedNoteMaintenance(savedNotes: Note[]) {
    const contentNotes = savedNotes.filter((note) => note.content)
    if (!contentNotes.length) return

    const changedAtoms = contentNotes.flatMap((note) =>
      flashcardsFromContent(note.content)
        .map((card) => {
          const existing = atomsRef.current.find((atom) => atom.id === card.atomId)
          if (!existing || (existing.phrase === card.phrase && existing.definition === card.definition)) return null
          return { ...existing, phrase: card.phrase, definition: card.definition, updatedAt: nowIso() }
        })
        .filter((atom): atom is Atom => Boolean(atom)),
    )
    if (changedAtoms.length) {
      await atomsStore.saveMany(changedAtoms)
      setAtoms((current) => current.map((atom) => changedAtoms.find((item) => item.id === atom.id) ?? atom))
    }

    const latestContentNote = contentNotes[contentNotes.length - 1]
    if (snapshotDebounceRef.current) clearTimeout(snapshotDebounceRef.current)
    snapshotDebounceRef.current = setTimeout(() => {
      snapshotDebounceRef.current = null
      void appendNoteSnapshot({
        id: latestContentNote.id,
        title: latestContentNote.title,
        content: latestContentNote.content,
      })
    }, 5000)

    if (atomSyncDebounceRef.current) clearTimeout(atomSyncDebounceRef.current)
    atomSyncDebounceRef.current = setTimeout(() => {
      atomSyncDebounceRef.current = null
      const latest = notesRef.current.find((note) => note.id === latestContentNote.id)
      if (!latest) return
      const linkedAtoms = projectAtomsForNote(latest)
      if (!linkedAtoms.length) return
      void syncAtomMarksForNotes([latest], linkedAtoms)
    }, 1200)
  }

  async function flushPendingNoteSaves() {
    if (noteSaveDebounceRef.current) {
      clearTimeout(noteSaveDebounceRef.current)
      noteSaveDebounceRef.current = null
    }
    const pending = Array.from(pendingNoteSavesRef.current.values())
    pendingNoteSavesRef.current.clear()
    if (!pending.length) return

    try {
      const notesToSave = pending.map((item) => item.note)
      if (notesToSave.length === 1) await notesStore.save(notesToSave[0])
      else await notesStore.saveMany(notesToSave)

      setSaving(false)
      if (saveStateDelayRef.current) clearTimeout(saveStateDelayRef.current)
      saveStateDelayRef.current = setTimeout(() => {
        setShowSaveState(true)
        saveStateDelayRef.current = null
      }, 3000)

      await runSavedNoteMaintenance(pending.filter((item) => item.maintainContent).map((item) => item.note))
    } catch (error) {
      console.error('Could not save note locally', error)
      pending.forEach((item) => {
        if (!pendingNoteSavesRef.current.has(item.note.id)) pendingNoteSavesRef.current.set(item.note.id, item)
      })
      setSaving(false)
      setShowSaveState(true)
      showNotice('Could not save note locally.')
    }
  }

  function scheduleNoteSave(note: Note, maintainContent: boolean) {
    const existing = pendingNoteSavesRef.current.get(note.id)
    pendingNoteSavesRef.current.set(note.id, {
      note,
      maintainContent: maintainContent || existing?.maintainContent || false,
    })
    setShowSaveState(false)
    if (saveStateDelayRef.current) {
      clearTimeout(saveStateDelayRef.current)
      saveStateDelayRef.current = null
    }
    setSaving(true)
    if (noteSaveDebounceRef.current) clearTimeout(noteSaveDebounceRef.current)
    noteSaveDebounceRef.current = setTimeout(() => {
      void flushPendingNoteSaves()
    }, NOTE_SAVE_DEBOUNCE_MS)
  }

  useEffect(() => {
    const flush = () => {
      void flushPendingNoteSaves()
    }
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('blur', flush)
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', flushWhenHidden)

    return () => {
      window.removeEventListener('blur', flush)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', flushWhenHidden)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (snapshotDebounceRef.current) clearTimeout(snapshotDebounceRef.current)
      if (saveStateDelayRef.current) clearTimeout(saveStateDelayRef.current)
      if (noteSaveDebounceRef.current) clearTimeout(noteSaveDebounceRef.current)
      if (atomSyncDebounceRef.current) clearTimeout(atomSyncDebounceRef.current)
      if (aiPromptHintTimerRef.current) clearTimeout(aiPromptHintTimerRef.current)
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      optimisticDeleteTimersRef.current.forEach((timer) => clearTimeout(timer))
      if (formatSideFrameRef.current) cancelAnimationFrame(formatSideFrameRef.current)
      if (formatBlockFrameRef.current) cancelAnimationFrame(formatBlockFrameRef.current)
      if (blockDropFrameRef.current) cancelAnimationFrame(blockDropFrameRef.current)
      void flushPendingNoteSaves()
    }
  }, [])

  const restoreEditorScroll = useCallback((scrollTop = editorScrollTopRef.current) => {
    const scrollEl = documentScrollRef.current
    if (!scrollEl) return
    const nextScrollTop = Math.min(scrollTop, Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight))
    scrollEl.scrollTop = nextScrollTop
    editorScrollTopRef.current = nextScrollTop
  }, [])

  const preserveEditorScroll = useCallback((callback: () => void) => {
    const scrollEl = documentScrollRef.current
    const scrollTop = scrollEl?.scrollTop ?? editorScrollTopRef.current
    editorScrollTopRef.current = scrollTop
    callback()
    if (scrollEl) {
      requestAnimationFrame(() => {
        restoreEditorScroll(scrollTop)
      })
    }
  }, [restoreEditorScroll])

  function setEditorContentFromSync(content: JSONContent) {
    const currentEditor = editorRef.current
    if (!currentEditor) return
    preserveEditorScroll(() => {
      suppressEditorPersistRef.current = true
      currentEditor.commands.setContent(content, { emitUpdate: false })
      suppressEditorPersistRef.current = false
    })
  }

  async function syncAtomMarksForNotes(notesToSync: Note[], atomsToUse = atomsRef.current) {
    if (!notesToSync.length || !atomsToUse.length) return 0
    const now = nowIso()
    const updatedNotes: Note[] = []
    let markCount = 0

    notesToSync.forEach((note) => {
      const primary = primaryTemplateContent(note)
      const result = applyAtomsToContent(primary, atomsToUse)
      if (!result.changed) return
      const templateData = updatePrimaryTemplateContent(note, result.content)
      const content = templateDataToContent(templateData)
      const blocks = normalizeBlocksForContent(content, note.blocks)
      updatedNotes.push({ ...note, content, templateData, blocks, updatedAt: now })
      markCount += result.count
    })

    if (!updatedNotes.length) return 0
    const updatedById = new Map(updatedNotes.map((note) => [note.id, note]))
    const nextNotes = notesRef.current.map((note) => updatedById.get(note.id) ?? note).sort(sortByUpdated)
    notesRef.current = nextNotes
    setNotes(nextNotes)
    await notesStore.saveMany(updatedNotes)
    const openNote = updatedById.get(selectedNoteIdRef.current)
    if (openNote) setEditorContentFromSync(primaryTemplateContent(openNote))
    return markCount
  }

  function projectAtomsForNote(note: Note, atomsToUse = atomsRef.current) {
    return atomsToUse.filter((atom) => projectIdForAtom(atom) === note.projectId)
  }

  async function syncProjectAtomMarks(projectId: string, atomsToUse = atomsRef.current) {
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
    scheduleNoteSave(updated, 'title' in patch || 'content' in patch || 'templateData' in patch)
  }, [])

  const handleNoteDropTargetDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const openNote = useCallback((noteId: string, options: { trackHistory?: boolean } = {}) => {
    if (options.trackHistory !== false) {
      noteOpenHistoryRef.current = [noteId, ...noteOpenHistoryRef.current.filter((id) => id !== noteId)]
    }
    const currentNote = notesRef.current.find((note) => note.id === noteId)
    if (currentNote) {
      setEditorCityMarginaliaOpacity(editorMarginaliaOpacityFromText(collectText(currentNote.content ?? emptyDoc)))
    } else {
      setEditorCityMarginaliaOpacity(1)
    }
    setSelectedNoteId(noteId)
    setActiveView('editor')
    void notesStore.getBody(noteId).then((body) => {
      if (!body) return
      setNotes((current) =>
        current.map((note) =>
          note.id === noteId && note.updatedAt <= body.updatedAt
            ? { ...note, content: body.content, templateData: body.templateData, blocks: body.blocks, updatedAt: body.updatedAt }
            : note,
        ),
      )
    })
    void mediaStore.preloadForNote(noteId, { priority: 'visible' })
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
    await notesStore.saveMany(updatedNotes)
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
      StarterKit.configure({ link: false, dropcursor: false }),
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        isAllowedUri: (url) => isAllowedLinkUrl(url),
      }),
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
      AuthorshipMark,
      ActiveBlockHighlight,
      AISelectionHighlight,
      TabIndent,
    ],
    content: primaryTemplateContent(selectedNote),
    editorProps: {
      attributes: { class: 'note-editor' },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter') return false
        if (event.shiftKey) {
          event.preventDefault()
          return true
        }
        pendingEnterBlockIndexRef.current = activeBlockIndex()
        return false
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setEditorCityMarginaliaOpacity(editorMarginaliaOpacityFromText(updatedEditor.getText()))
      if (suppressEditorPersistRef.current) return
      const id = selectedNoteIdRef.current
      const note = notesRef.current.find((item) => item.id === id)
      if (!note) return
      const templateData = updatePrimaryTemplateContent(note, updatedEditor.getJSON())
      const content = templateDataToContent(templateData)
      const activeIndex = pendingEnterBlockIndexRef.current ?? activeBlockIndex()
      pendingEnterBlockIndexRef.current = null
      const blocks = normalizeBlocksForContent(content, note.blocks, activeIndex)
      lastLocalEditorContentRef.current = { noteId: id, content }
      void persistNote({ templateData, content, blocks }, id)
    },
  }, [selectedNoteId])

  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  useEffect(() => {
    if (activeView !== 'editor') return
    if (editor) {
      setEditorCityMarginaliaOpacity(editorMarginaliaOpacityFromText(editor.getText()))
      return
    }
    if (!selectedNote) {
      setEditorCityMarginaliaOpacity(1)
      return
    }
    setEditorCityMarginaliaOpacity(editorMarginaliaOpacityFromText(collectText(selectedNote.content ?? emptyDoc)))
  }, [activeView, editor, selectedNote])

  useEffect(() => {
    const scrollEl = documentScrollRef.current
    if (!scrollEl) return
    editorScrollTopRef.current = scrollEl.scrollTop
    const syncEditorScrollTop = () => {
      editorScrollTopRef.current = scrollEl.scrollTop
    }
    scrollEl.addEventListener('scroll', syncEditorScrollTop, { passive: true })
    return () => scrollEl.removeEventListener('scroll', syncEditorScrollTop)
  }, [activeView, selectedNoteId])

  useEffect(() => {
    const timers = new WeakMap<Element, number>()

    const onScroll = (event: Event) => {
      const el = event.currentTarget
      if (!(el instanceof HTMLElement)) return
      el.classList.add('is-scrolling')

      const existing = timers.get(el)
      if (existing) window.clearTimeout(existing)

      timers.set(el, window.setTimeout(() => {
        el.classList.remove('is-scrolling')
      }, 720))
    }

    const els = Array.from(document.querySelectorAll('.scroll-hover'))
    els.forEach((el) => el.addEventListener('scroll', onScroll, { passive: true }))

    return () => {
      els.forEach((el) => el.removeEventListener('scroll', onScroll))
      els.forEach((el) => {
        const timer = timers.get(el)
        if (timer) window.clearTimeout(timer)
      })
    }
  }, [activeView, selectedNoteId, blockPicker.open, activeEditorPanel])

  useLayoutEffect(() => {
    if (activeView !== 'editor') return
    restoreEditorScroll()
  }, [
    activeView,
    selectedNoteId,
    activeEditorPanel,
    searchOpen,
    noteHistoryOpen,
    atomDialog,
    blockPicker.open,
    restoreEditorScroll,
  ])

  useEffect(() => {
    if (!editor || !selectedNote) return
    const latestLocalContent = lastLocalEditorContentRef.current
    if (latestLocalContent?.noteId === selectedNote.id && latestLocalContent.content === selectedNote.content) return
    const nextContent = primaryTemplateContent(selectedNote)
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) setEditorContentFromSync(nextContent)
  }, [editor, selectedNote])

  const syncFormatSideControls = useCallback(() => {
    const shell = blockEditorShellRef.current
    const editorDom = mountedEditorDom(editor)
    const activeType: FormatBlockType | null = editor?.isActive('table') ? 'table' : editor?.isActive('lociQuote') ? 'quote' : editor?.isActive('image') ? 'image' : null
    if (!shell || !editorDom || !activeType) {
      setFormatSideControls((current) => (current ? null : current))
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
      setFormatSideControls((current) => (current ? null : current))
      return
    }
    const shellRect = shell.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const next = {
      blockId: '',
      type: activeType,
      top: targetRect.top - shellRect.top,
      left: Math.max(0, shellRect.width + 8),
    }
    setFormatSideControls((current) =>
      current &&
      current.blockId === next.blockId &&
      current.type === next.type &&
      current.top === next.top &&
      current.left === next.left
        ? current
        : next,
    )
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
    if (!authorshipMenu) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('.authorship-popover') : null
      if (target) return
      setAuthorshipMenu(null)
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    return () => document.removeEventListener('mousedown', closeOnOutsidePointer)
  }, [authorshipMenu])

  useEffect(() => {
    if (!editor) return
    const closeWhenSelectionClears = () => {
      if (editor.state.selection.empty) setAuthorshipMenu(null)
    }
    editor.on('selectionUpdate', closeWhenSelectionClears)
    editor.on('transaction', closeWhenSelectionClears)
    return () => {
      editor.off('selectionUpdate', closeWhenSelectionClears)
      editor.off('transaction', closeWhenSelectionClears)
    }
  }, [editor])

  useEffect(() => {
    if (activeEditorPanel !== 'format') return
    setFormatDialogQuery('')
    queueMicrotask(() => {
      formatDialogSearchRef.current?.focus()
    })
  }, [activeEditorPanel])

  useEffect(() => {
    if (!atomHeadingMenuOpen) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (atomsTitleSwitcherRef.current?.contains(event.target as Node)) return
      setAtomHeadingMenuOpen(false)
      setAtomHeadingHoverTarget(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAtomHeadingMenuOpen(false)
        setAtomHeadingHoverTarget(null)
      }
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
    if (!quizAnswerMenuOpen) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (quizAnswerDropdownRef.current?.contains(event.target as Node)) return
      setQuizAnswerMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuizAnswerMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [quizAnswerMenuOpen])

  useEffect(() => {
    if (!openProjectMenuId) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.project-card-menu')) return
      setOpenProjectMenuId('')
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenProjectMenuId('')
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openProjectMenuId])

  useEffect(() => {
    if (!openLooseNoteMenuId) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.project-loose-note-menu')) return
      setOpenLooseNoteMenuId('')
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenLooseNoteMenuId('')
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openLooseNoteMenuId])

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

  const atomCards = useMemo(() => buildAtomCards(atoms, noteIndexes, projectById), [atoms, noteIndexes, projectById])
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
  const studyingSetAtoms = useMemo(
    () => studyingFlashcardSet?.atomIds.map((id) => atomById.get(id)).filter((atom): atom is Atom => Boolean(atom)) ?? [],
    [atomById, studyingFlashcardSet],
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
    return studyAtomIds.map((id) => atomById.get(id)).filter((atom): atom is Atom => Boolean(atom))
  }, [atomById, studyAtomIds])
  const activeStudyAtom = studyAtoms[studyIndex] ?? null
  const studyKnownCount = studyKnownAtomIds.length
  const studyLearningCount = studyLearningAtomIds.length
  const studyTotalCount = studyKnownCount + studyAtoms.length
  const studyRoundComplete = studyTotalCount > 0 && studyAtoms.length === 0
  const activeStudyHint = activeStudyAtom && studyingFlashcardSet?.aiHintsByAtomId
    ? studyingFlashcardSet.aiHintsByAtomId[activeStudyAtom.id]?.hint
    : undefined
  const matchComplete = studyingSetAtoms.length > 0 && matchMatchedAtomIds.length === studyingSetAtoms.length
  const matchAverageMs = studyingFlashcardSet?.matchSessionCount
    ? Math.round((studyingFlashcardSet.matchTotalMs ?? 0) / studyingFlashcardSet.matchSessionCount)
    : 0
  const activeQuiz = studyingFlashcardSet?.cachedQuiz
  const quizQuestionCount = activeQuiz?.questions.length ?? 0
  const quizAnsweredCount = activeQuiz?.questions.filter((question) => {
    const answer = quizAnswers[question.id]
    if (question.type === 'multiple-choice') return Boolean(answer?.selectedChoice)
    if (question.type === 'true-false') return typeof answer?.trueFalseAnswer === 'boolean'
    if (question.type === 'matching') return question.pairs.every((pair) => Boolean(answer?.matchingPairs?.[pair.left]))
    return Boolean(answer?.shortAnswer?.trim())
  }).length ?? 0
  const quizSetupAvailableCount = Math.min(10, studyingSetAtoms.length || 10)
  const quizSetupFormatCount = Number(quizSetupOptions.includeTrueFalse) + Number(quizSetupOptions.includeMultipleChoice) + Number(quizSetupOptions.includeMatching) + Number(quizSetupOptions.includeWritten)
  const quizSetupQuestionCount = Math.min(10, Math.max(1, quizSetupOptions.questionCount || 1), studyingSetAtoms.length || 10)
  const quizSetupCanStart = Boolean(studyingSetAtoms.length && quizSetupFormatCount && quizSetupQuestionCount > 0)
  const quizReadyToMark = Boolean(activeQuiz && quizQuestionCount > 0 && quizAnsweredCount === quizQuestionCount && !quizResult?.marking)
  const quizMarked = Boolean(quizResult && !quizResult.marking)

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
    const recentNote = notes[0]
    const projectIds = new Set(projects.map((project) => project.id))
    const sevenDaysAgo = dashboardNow.getTime() - 6 * 24 * 60 * 60 * 1000
    let notesUpdatedThisWeek = 0
    let looseFileCount = 0
    const activityCounts = new Map<string, number>()
    const activeDayKeys = new Set<string>()
    notes.forEach((note) => {
      const updatedTime = new Date(note.updatedAt).getTime()
      if (updatedTime >= sevenDaysAgo) notesUpdatedThisWeek += 1
      if (note.projectId === UNASSIGNED_PROJECT_ID || !projectIds.has(note.projectId)) looseFileCount += 1
      const date = new Date(note.updatedAt)
      date.setHours(0, 0, 0, 0)
      const key = date.toISOString().slice(0, 10)
      activeDayKeys.add(key)
      activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1)
    })
    const recentAtomCount = atoms.filter((atom) => new Date(atom.createdAt).getTime() >= sevenDaysAgo).length
    const topProjects = projects
      .map((project) => ({
        project,
        fileCount: noteIndexes.notesByProjectId.get(project.id)?.length ?? 0,
        atomCount: noteIndexes.atomIdsByProjectId.get(project.id)?.size ?? 0,
      }))
      .sort((a, b) => b.fileCount - a.fileCount || a.project.name.localeCompare(b.project.name))
      .slice(0, 3)
    const today = new Date(dashboardNow)
    today.setHours(0, 0, 0, 0)
    const activity = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const count = activityCounts.get(date.toISOString().slice(0, 10)) ?? 0
      return {
        label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1),
        count,
      }
    })
    const maxActivity = Math.max(1, ...activity.map((day) => day.count))
    const todayKey = today.toISOString().slice(0, 10)
    const streakCursor = new Date(today)
    if (!activeDayKeys.has(todayKey)) streakCursor.setDate(streakCursor.getDate() - 1)
    let dailyStreak = 0
    while (activeDayKeys.has(streakCursor.toISOString().slice(0, 10))) {
      dailyStreak += 1
      streakCursor.setDate(streakCursor.getDate() - 1)
    }
    const wroteToday = activeDayKeys.has(todayKey)

    const recentNotePreviewLines = recentNote ? noteIndexes.notePreviewLinesById.get(recentNote.id) ?? [] : []

    return {
      recentNote,
      recentNotePreviewLines,
      recentProjectName: recentNote
        ? projectById.get(recentNote.projectId)?.name ?? 'Loose file'
        : 'No project yet',
      looseFileCount,
      dailyStreak,
      wroteToday,
      notesUpdatedThisWeek,
      recentAtomCount,
      topProjects,
      activity,
      maxActivity,
    }
  }, [atoms, dashboardNow, noteIndexes, notes, projectById, projects])
  const homeHeroCityMarginalia = dashboardStats.recentNote && EDITOR_CITY_MARGINALIA_COUNT > 0
    ? EDITOR_CITY_MARGINALIA[cityMarginaliaIndexForNote(dashboardStats.recentNote.id, EDITOR_CITY_MARGINALIA_COUNT)]
    : null
  const homeHeroBackgroundImage = homeHeroCityMarginalia?.src ?? ''
  const homeHeroImageState = homeHeroBackgroundImage ? imageLoadStates[homeHeroBackgroundImage] : undefined
  const homeHeroImageReady = homeHeroImageState === 'ready'
  const selectedEditorImageState = selectedEditorCityMarginalia?.src ? imageLoadStates[selectedEditorCityMarginalia.src] : undefined
  const selectedEditorImageReady = selectedEditorImageState === 'ready'

  const firstName = profileDisplayName.split(/\s+/)[0] ?? ''
  const homeGreeting = useMemo(
    () => getGreeting(dashboardNow, homeVisitCount, firstName),
    [dashboardNow, firstName, homeVisitCount],
  )
  const homeSubtagline = useMemo(() => getSubtagline(homeVisitCount), [homeVisitCount])
  const homeTip = useMemo(() => getTipByIndex(homeVisitCount), [homeVisitCount])
  const recentHomeNotes = useMemo(() => notes.slice(0, 5), [notes])

  useEffect(() => {
    if (activeView === 'home' && previousViewRef.current !== 'home') {
      setDashboardNow(new Date())
      setHomeVisitCount((count) => count + 1)
    }
    previousViewRef.current = activeView
  }, [activeView])

  useEffect(() => {
    ensureImageLoaded(selectedEditorCityMarginalia?.src, 'critical')
  }, [ensureImageLoaded, selectedEditorCityMarginalia?.src])

  useEffect(() => {
    ensureImageLoaded(homeHeroBackgroundImage, 'critical')
  }, [ensureImageLoaded, homeHeroBackgroundImage])

  useEffect(() => {
    if (activeView !== 'home') return
    const node = homeScrollRef.current
    if (!node) return
    let frame = 0
    const updateScroll = () => {
      frame = 0
      node.style.setProperty('--ink-scroll', `${node.scrollTop}px`)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateScroll)
    }
    updateScroll()
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      node.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [activeView, homeVisitCount])

  const searchNormalized = useMemo(() => normalizeSearch(searchQuery), [searchQuery])

  useEffect(() => {
    if (!searchNormalized || !workerReady) {
      setWorkerSearchNoteIds(null)
      return
    }
    const job = runWorkerJob<{ id: string; type: 'search-results'; noteIds: string[]; indexVersion: number }>({
      type: 'search',
      query: searchNormalized,
    })
    if (!job) return
    const jobKey = `search_${workerJobIdRef.current}`
    latestSearchJobRef.current = jobKey
    job.then((result) => {
      if (latestSearchJobRef.current !== jobKey) return
      setWorkerSearchNoteIds(result.noteIds)
    })
  }, [runWorkerJob, searchNormalized, workerReady])

  const searchHits = useMemo((): SearchHit[] => {
    if (!searchNormalized) return []
    const workerMatchedNotes = workerSearchNoteIds
      ? workerSearchNoteIds.map((id) => notes.find((note) => note.id === id)).filter((note): note is Note => Boolean(note))
      : null
    const matchedNotes = workerMatchedNotes ?? notes.filter((note) => {
      const contentLower = (noteIndexes.noteTextById.get(note.id) ?? '').toLowerCase()
      return note.title.toLowerCase().includes(searchNormalized) || contentLower.includes(searchNormalized)
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
  }, [atoms, noteIndexes, notes, projects, searchNormalized, workerSearchNoteIds])

  const searchRows = useMemo(() => {
    const rows: SearchRow[] = []
    searchHits.forEach((hit, index) => {
      const prev = searchHits[index - 1]
      if (index === 0 || hit.kind !== prev.kind) {
        rows.push({
          kind: 'section',
          id: `section-${hit.kind}-${index}`,
          label: hit.kind === 'note' ? 'Notes' : hit.kind === 'project' ? 'Projects' : 'Atoms',
        })
      }
      rows.push({ kind: 'hit', id: hitKey(hit), hit, hitIndex: index })
    })
    return rows
  }, [searchHits])

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

  const submitAppDialogSecondary = useCallback(async () => {
    const dialog = appDialog
    if (!dialog || dialog.kind !== 'confirm' || !dialog.onSecondary) return
    setAppDialog(null)
    await dialog.onSecondary()
  }, [appDialog])

  const openProfileModal = () => {
    const displayName = localProfile && !isBadProfileDisplayName(localProfile.displayName) ? localProfile.displayName : ''
    const existingHandle = accountProfile?.handle ?? ''
    setProfileDraft({
      displayName,
      initials: displayName ? localProfile?.initials ?? '' : '',
      handle: existingHandle || createBaseHandleFromDisplayName(displayName),
      handleEdited: Boolean(existingHandle),
      avatarColor: localProfile?.avatarColor ?? DEFAULT_PROFILE_COLOR,
    })
    setProfileModalOpen(true)
  }

  const saveLocalProfile = async () => {
    const displayName = profileDraft.displayName.trim()
    if (!displayName) return
    const now = nowIso()
    const existingAccountProfile = await profileService.getProfile('local')
    const requestedHandle = normalizeUserHandle(profileDraft.handle || createBaseHandleFromDisplayName(displayName))
    const handle = await createAvailableLocalHandle(requestedHandle || displayName, existingAccountProfile?.accountId)
    const profile: UserProfile = {
      id: 'local',
      displayName,
      initials: normalizeInitials(profileDraft.initials || initialsFromName(displayName)),
      avatarColor: profileDraft.avatarColor || DEFAULT_PROFILE_COLOR,
      createdAt: localProfile?.createdAt ?? now,
      updatedAt: now,
    }
    await profileStore.saveLocalWorkspaceProfile(profile)
    const account = await profileService.saveProfile({
      accountId: 'local',
      displayName,
      handle,
      createdAt: existingAccountProfile?.createdAt ?? now,
      updatedAt: now,
    })
    setLocalProfile(profile)
    setAccountProfile(account)
    setAuthSession((current) => ({
      ...current,
      status: 'signed-in',
      accountId: 'local',
      updatedAt: now,
      lastCheckedAt: now,
    }))
    setProfileModalOpen(false)
  }

  const saveUserSettings = async (next: UserSettings) => {
    const normalized = normalizeUserSettings({ ...next, updatedAt: nowIso() })
    await settingsStore.save(normalized)
    setUserSettings(normalized)
  }

  const searchCommunityUsers = async () => {
    const results = await friendService.searchAccounts(communitySearchQuery)
    setCommunitySearchResults(results)
  }

  const addCommunitySearchResult = async (result: FriendSearchResult) => {
    if (!authSession.accountId) {
      showNotice('Sign in before sending friend requests.')
      return
    }
    const friendship = await friendService.sendRequest(authSession.accountId, result)
    setFriendships((current) => [friendship, ...current])
    setCommunityTarget({ kind: 'friend', id: friendship.id })
    setCommunitySearchResults([])
    setCommunitySearchQuery('')
    showNotice(`${result.handle ? `@${result.handle}` : result.displayName} request pending.`)
  }

  const togglePinnedCommunityRecipient = (target: CommunityTarget) => {
    const targetId = communityRecipientId(target.kind, target.id)
    const pinned = userSettings.pinnedCommunityRecipientIds.includes(targetId)
    const pinnedCommunityRecipientIds = pinned
      ? userSettings.pinnedCommunityRecipientIds.filter((id) => id !== targetId)
      : [targetId, ...userSettings.pinnedCommunityRecipientIds]
    void saveUserSettings({ ...userSettings, pinnedCommunityRecipientIds })
  }

  const removePinnedCommunityRecipient = (target: CommunityTarget) => {
    const targetId = communityRecipientId(target.kind, target.id)
    if (!userSettings.pinnedCommunityRecipientIds.includes(targetId)) return
    void saveUserSettings({
      ...userSettings,
      pinnedCommunityRecipientIds: userSettings.pinnedCommunityRecipientIds.filter((id) => id !== targetId),
    })
  }

  const acceptCommunityFriend = async (friendshipId: string) => {
    const friendship = await friendService.acceptRequest(friendshipId)
    if (!friendship) return
    setFriendships((current) => current.map((item) => item.id === friendshipId ? friendship : item))
    showNotice(`${friendship.friendDisplayName} accepted.`)
  }

  const rejectCommunityFriend = async (friendshipId: string) => {
    await friendService.declineRequest(friendshipId)
    setFriendships((current) => current.filter((friendship) => friendship.id !== friendshipId))
    setCommunityTarget((current) => current?.kind === 'friend' && current.id === friendshipId ? null : current)
    removePinnedCommunityRecipient({ kind: 'friend', id: friendshipId })
    showNotice('Request removed.')
  }

  const removeCommunityFriend = async (friendshipId: string) => {
    await friendService.declineRequest(friendshipId)
    setFriendships((current) => current.filter((friendship) => friendship.id !== friendshipId))
    setCommunityTarget((current) => current?.kind === 'friend' && current.id === friendshipId ? null : current)
    removePinnedCommunityRecipient({ kind: 'friend', id: friendshipId })
    showNotice('User removed.')
  }

  const openCreateGroupDialog = () => {
    setGroupDialogDraft({
      name: '',
      memberAccountIds: acceptedFriendships.map((friendship) => friendship.friendAccountId),
    })
  }

  const toggleGroupDialogMember = (accountId: string) => {
    setGroupDialogDraft((current) => {
      if (!current) return current
      const memberAccountIds = current.memberAccountIds.includes(accountId)
        ? current.memberAccountIds.filter((id) => id !== accountId)
        : [...current.memberAccountIds, accountId]
      return { ...current, memberAccountIds }
    })
  }

  const saveFriendGroupDialog = async () => {
    if (!groupDialogDraft?.name.trim()) return
    const group = await friendGroupService.createGroup(
      groupDialogDraft.name,
      authSession.accountId,
      groupDialogDraft.memberAccountIds,
    )
    setFriendGroups((current) => [group, ...current])
    setCommunityTarget({ kind: 'group', id: group.id })
    setGroupDialogDraft(null)
    showNotice('Friend group created.')
  }

  const createTargetedShareForSelectedNote = async (permission: SharedNoteExport['permission'] = 'view', noteId?: string) => {
    if (!noteId) {
      showNotice('Search for a note, then press Send or Enter.')
      return
    }
    const noteToShare = notes.find((note) => note.id === noteId)
    if (!noteToShare) {
      showNotice('That note could not be found.')
      return
    }
    if (!selectedCommunityFriend && !selectedCommunityGroup) {
      showNotice('Choose a friend or group before sending a note.')
      return
    }
    const options = { ownerAccountId: authSession.accountId, permission }
    const share = selectedCommunityFriend
      ? await sharingService.sendNoteToFriend(noteToShare.id, selectedCommunityFriend, options)
      : await sharingService.sendNoteToGroup(noteToShare.id, selectedCommunityGroup as FriendGroup, options)
    await communityActivityService.create({
      recipientKind: selectedCommunityFriend ? 'friend' : 'group',
      recipientId: selectedCommunityFriend?.id ?? (selectedCommunityGroup as FriendGroup).id,
      actorAccountId: authSession.accountId,
      kind: 'note-shared',
      objectType: 'sharedNoteExport',
      objectId: share.id,
      payload: {
        noteId: noteToShare.id,
        title: noteToShare.title || 'Untitled Note',
        permission,
      },
    })
    setSharedNoteExports((current) => [share, ...current])
    showNotice(permission === 'edit' ? 'Editable note share prepared.' : 'Note share prepared.')
  }

  const createCollaborationForSelectedNote = async (noteId?: string) => {
    if (!noteId) {
      showNotice('Search for a note, then choose Edit together.')
      return
    }
    const note = notes.find((n) => n.id === noteId)
    if (!note) {
      showNotice('That note could not be found.')
      return
    }
    if (!selectedCommunityFriend && !selectedCommunityGroup) {
      showNotice('Choose a friend or group before starting edit-together.')
      return
    }
    const options = { ownerAccountId: authSession.accountId, permission: 'edit' as const }
    const share = selectedCommunityFriend
      ? await sharingService.sendNoteToFriend(note.id, selectedCommunityFriend, options)
      : await sharingService.sendNoteToGroup(note.id, selectedCommunityGroup as FriendGroup, options)
    const session = await collaborationService.createSession({
      localNoteId: note.id,
      shareId: share.id,
      ownerAccountId: authSession.accountId,
      title: note.title || 'Untitled collaboration',
    })
    await communityActivityService.create({
      recipientKind: selectedCommunityFriend ? 'friend' : 'group',
      recipientId: selectedCommunityFriend?.id ?? (selectedCommunityGroup as FriendGroup).id,
      actorAccountId: authSession.accountId,
      kind: 'edit-session-created',
      objectType: 'collaborationSession',
      objectId: session.id,
      payload: {
        noteId: note.id,
        shareId: share.id,
        title: session.title,
      },
    })
    setSharedNoteExports((current) => [{ ...share, collaborationSessionId: session.id }, ...current])
    showNotice('Edit-together foundation created for this note.')
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

  const syncFlashcardSet = (nextSet: FlashcardSet | undefined) => {
    if (!nextSet) return
    const normalized = normalizeFlashcardSet(nextSet)
    setFlashcardSets((current) =>
      current.map((set) => (set.id === normalized.id ? normalized : set))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    )
  }

  const persistStudySession = async () => {
    if (!studyingFlashcardSetId || studySessionStartedAtRef.current === null || studySessionPersistedRef.current) return
    const durationMs = Date.now() - studySessionStartedAtRef.current
    if (durationMs < 1000) return
    studySessionPersistedRef.current = true
    setStudyElapsedMs(durationMs)
    const updatedSet = await flashcardSetsStore.updateStudyTiming(studyingFlashcardSetId, durationMs, nowIso(), studyMode ?? undefined)
    syncFlashcardSet(updatedSet)
  }

  const beginStudySession = (setId: string, mode: StudyMode) => {
    setStudyingFlashcardSetId(setId)
    setStudyMode(mode)
    studySessionStartedAtRef.current = Date.now()
    studySessionPersistedRef.current = false
    setStudyElapsedMs(0)
  }

  const stopStudySession = () => {
    void persistStudySession()
    studySessionStartedAtRef.current = null
  }

  const stopActiveStudySession = () => {
    if (atomSubView === 'study' || atomSubView === 'match' || atomSubView === 'quiz-setup' || atomSubView === 'quiz') {
      stopStudySession()
    }
  }

  useEffect(() => {
    return () => {
      if (!studyingFlashcardSetId || studySessionStartedAtRef.current === null || studySessionPersistedRef.current) return
      const durationMs = Date.now() - studySessionStartedAtRef.current
      if (durationMs >= 1000) {
        void flashcardSetsStore.updateStudyTiming(studyingFlashcardSetId, durationMs, nowIso(), studyMode ?? undefined)
      }
    }
  }, [studyingFlashcardSetId, studyMode])

  useEffect(() => {
    if (atomSubView !== 'match' || studySessionStartedAtRef.current === null || studySessionPersistedRef.current) return
    const updateElapsed = () => {
      if (studySessionStartedAtRef.current === null) return
      setStudyElapsedMs(Date.now() - studySessionStartedAtRef.current)
    }
    updateElapsed()
    const timerId = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timerId)
  }, [atomSubView, studyMode, matchComplete])

  useEffect(() => {
    if (
      (atomSubView === 'study' && studyRoundComplete) ||
      (atomSubView === 'match' && matchComplete) ||
      (atomSubView === 'quiz' && quizMarked)
    ) {
      void persistStudySession()
    }
  }, [atomSubView, matchComplete, quizMarked, studyRoundComplete])

  const switchAtomWorkspace = (nextView: 'atoms' | 'sets') => {
    if (isSetWorkspace(atomSubView)) stopActiveStudySession()
    setAtomSubView(nextView)
    setAtomHeadingMenuOpen(false)
    setAtomHeadingHoverTarget(null)
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

  const requestConfiguredAIText = async (taskInstruction: string, userContent: string, signal: AbortSignal) => {
    const providerId = userSettings.defaultAIProvider
    const providerMeta = aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0]
    const provider = userSettings.aiProviders[providerId]
    return requestAIText({
      providerId,
      provider,
      providerMeta,
      taskInstruction,
      userContent,
      promptCacheKey: selectedNote?.id ?? 'loci-notes-local',
      signal,
    })
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
      showNotice(`Add a ${providerMeta.name} API key in Settings first.`)
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
    showNotice('')
    try {
      const result = await requestAIText({
        providerId,
        provider,
        providerMeta,
        taskInstruction,
        userContent,
        promptCacheKey: selectedNote?.id ?? 'loci-notes-local',
        signal: controller.signal,
      })
      const { responseText, usage } = result
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
        aiLastProvider: result.providerId,
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
      showNotice(`${providerMeta.name}: ${message}`)
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
      showNotice('No atom candidates found in the AI response.')
      return
    }
    const now = nowIso()
    const projectId = selectedNote?.projectId ?? UNASSIGNED_PROJECT_ID
    const created = candidates.map((candidate) => ({
      id: createId('atom'),
      projectId,
      phrase: candidate.phrase,
      definition: candidate.definition,
      tags: [],
      createdAt: now,
      updatedAt: now,
      reviewCount: 0,
      knownCount: 0,
    }))
    await atomsStore.saveMany(created)
    setAtoms((current) => [...created, ...current])
    const markCount = selectedNote ? await syncProjectAtomMarks(selectedNote.projectId, created) : editor ? applyAtomMarksToEditor(editor, created) : 0
    setAiResult(null)
    clearAISelectionHighlight()
    showNotice(`Created ${created.length} atom${created.length === 1 ? '' : 's'}${markCount ? ` and linked ${markCount} note match${markCount === 1 ? '' : 'es'}` : ''}.`)
  }

  const draftProjectInstructionsFromAIResult = async () => {
    if (!aiResult || !selectedProject) return
    const providerId = userSettings.defaultAIProvider
    const providerMeta = aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0]
    const provider = userSettings.aiProviders[providerId]
    if (!provider.enabled || !provider.apiKey.trim()) {
      showNotice(`Add a ${providerMeta.name} API key in Settings first.`)
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
    showNotice('')
    try {
      const result = await requestConfiguredAIText(taskInstruction, userContent, controller.signal)
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
      showNotice(`${providerMeta.name}: ${message}`)
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
    openNote(noteId)
    setActiveEditorPanel(null)
    setNoteHistoryOpen(false)
    showNotice('')
  }, [openNote, showNotice])

  const switchToPreviousOpenedNote = useCallback(() => {
    const currentNoteId = selectedNoteIdRef.current
    const validNoteIds = new Set(notesRef.current.map((note) => note.id))
    const history = noteOpenHistoryRef.current.filter((id) => validNoteIds.has(id))
    noteOpenHistoryRef.current = history
    if (activeView !== 'editor' || history.length < 2 || !currentNoteId) return

    const previousNoteId = history.find((id) => id !== currentNoteId)
    if (!previousNoteId) return

    const nextHistory = [
      previousNoteId,
      ...history.filter((id) => id !== currentNoteId && id !== previousNoteId),
      currentNoteId,
    ]
    noteOpenHistoryRef.current = nextHistory
    openNote(previousNoteId, { trackHistory: false })
    setActiveEditorPanel(null)
    setNoteHistoryOpen(false)
    showNotice('')
  }, [activeView, openNote, showNotice])

  useEffect(() => {
    const onDocKeyDown = (event: KeyboardEvent) => {
      const isNoteHistoryShortcut =
        event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'Shift' && !event.repeat
      if (isNoteHistoryShortcut && !appDialog && !searchOpen && !atomDialog && !noteHistoryOpen && !templateProjectId) {
        event.preventDefault()
        switchToPreviousOpenedNote()
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
  }, [activeEditorPanel, aiPromptFocused, appDialog, atomDialog, clearAIContextRange, closeAppDialog, closeSearch, imageCropEditing, localProfile, noteHistoryOpen, profileModalOpen, searchOpen, switchToPreviousOpenedNote, templateProjectId])

  
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
          setSelectedProjectId('')
          openNote(hit.note.id)
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
    [closeSearch, openNote],
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
          await flushPendingNoteSaves()
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
    const baseTemplateData = templateDataFor(templateId, template.content)
    const headingMigration = templateId === 'blank'
      ? ensureDocumentHeading(templateDataToContent(baseTemplateData), template.title)
      : null
    const templateData = headingMigration
      ? { ...baseTemplateData, body: headingMigration.content }
      : baseTemplateData
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

    await notesStore.save(note)
    setTemplateProjectId(null)
    setNotes((current) => [note, ...current])
    openNote(note.id)
    setSelectedNoteIds([])
    setSelectedProjectId(projectId === UNASSIGNED_PROJECT_ID ? '' : projectId)
  }

  const persistTemplateData = (templateData: NoteTemplateData) => {
    void persistNote({ templateData, content: templateDataToContent(templateData) })
  }

  const persistBlocks = (blocks: LociBlock[]) => {
    if (!selectedNote) return
    const content = contentFromBlocks(blocks)
    lastLocalEditorContentRef.current = { noteId: selectedNote.id, content }
    const templateData = updatePrimaryTemplateContent(selectedNote, content)
    void persistNote({ blocks, templateData, content: templateDataToContent(templateData) })
    if (editor) {
      preserveEditorScroll(() => {
        suppressEditorPersistRef.current = true
        editor.commands.setContent(content, { emitUpdate: false })
        suppressEditorPersistRef.current = false
      })
    }
  }

  const selectedBlocks = selectedNote?.blocks
    ? flattenLegacyLociBlocks(selectedNote.blocks)
    : selectedNote
      ? normalizeBlocksForContent(selectedNote.content ?? emptyDoc)
      : []
  selectedBlocksRef.current = selectedBlocks
  const selectedBlocksKey = selectedBlocks
    .map((block) => `${block.id}:${block.type}:${block.updatedAt}:${blockContentNodes(block.content).length}`)
    .join('|')
  const visibleBlockPickerOptions = blockPickerOptions.filter((option) => {
    const query = blockPicker.query.trim().toLowerCase()
    if (!query) return true
    return `${option.label} ${option.description} ${option.type}`.toLowerCase().includes(query)
  })

  const highlightedFormatBlock = useCallback((range: EditorRange): { block: LociBlock; index: number } | null => {
    if (!editor) return null
    let runningPos = 1
    const blocks = selectedBlocksRef.current
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index]
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

  const {
    measureBlockControls: measureGutterBlockControls,
    measureBlockDropTargets,
  } = useBlockGutter({
    editor,
    shellRef: blockEditorShellRef,
    blocks: selectedBlocks,
    draggedBlockIdRef,
  })

  const measureBlockControls = useCallback(() => {
    const controls = measureGutterBlockControls()
    setBlockControls((current) => (sameBlockControls(current, controls) ? current : controls))
  }, [measureGutterBlockControls])

  const updateFloatingToolbarPosition = useCallback(() => {
    const wrap = floatingEditorWrapRef.current
    if (!wrap) return
    if (activeView !== 'editor') {
      wrap.style.removeProperty('--floating-toolbar-center-x')
      wrap.style.removeProperty('--floating-toolbar-max-width')
      return
    }

    const noteCard = document.querySelector<HTMLElement>('.document-card')
    if (!noteCard) return

    const rect = noteCard.getBoundingClientRect()
    const viewportPadding = window.matchMedia('(max-width: 760px)').matches ? 14 : 24
    const centerX = rect.left + rect.width / 2
    const clampedCenterX = Math.min(window.innerWidth - viewportPadding, Math.max(viewportPadding, centerX))
    const maxWidth = Math.max(
      260,
      Math.min(
        940,
        rect.width - 24,
        window.innerWidth - viewportPadding * 2,
      ),
    )

    wrap.style.setProperty('--floating-toolbar-center-x', `${clampedCenterX}px`)
    wrap.style.setProperty('--floating-toolbar-max-width', `${maxWidth}px`)
  }, [activeView])

  const scheduleFloatingToolbarPosition = useCallback(() => {
    if (floatingToolbarFrameRef.current) return
    floatingToolbarFrameRef.current = requestAnimationFrame(() => {
      floatingToolbarFrameRef.current = null
      updateFloatingToolbarPosition()
    })
  }, [updateFloatingToolbarPosition])

  const queueFloatingToolbarRemeasure = useCallback((delayMs = 0) => {
    scheduleFloatingToolbarPosition()
    if (floatingToolbarDeferredMeasureRef.current) clearTimeout(floatingToolbarDeferredMeasureRef.current)
    floatingToolbarDeferredMeasureRef.current = setTimeout(() => {
      floatingToolbarDeferredMeasureRef.current = null
      scheduleFloatingToolbarPosition()
    }, delayMs)
  }, [scheduleFloatingToolbarPosition])

  const { markActiveEditorBlock } = useFocusModePlugin({
    editor,
    isFocusMode: editorFocusMode && activeView === 'editor',
    scrollContainerRef: documentScrollRef,
  })

  useEffect(() => {
    if (editorFocusModeVisualTimerRef.current) {
      clearTimeout(editorFocusModeVisualTimerRef.current)
      editorFocusModeVisualTimerRef.current = null
    }
    if (editorFocusModeVisualFrameRef.current) {
      cancelAnimationFrame(editorFocusModeVisualFrameRef.current)
      editorFocusModeVisualFrameRef.current = null
    }

    if (editorFocusMode && activeView === 'editor') {
      setEditorFocusModeVisual(false)
      markActiveEditorBlock()
      const scrollContainer = documentScrollRef.current
      if (!scrollContainer) {
        editorFocusModeVisualTimerRef.current = setTimeout(() => {
          editorFocusModeVisualTimerRef.current = null
          setEditorFocusModeVisual(true)
        }, 320)
        return () => {
          if (editorFocusModeVisualTimerRef.current) {
            clearTimeout(editorFocusModeVisualTimerRef.current)
            editorFocusModeVisualTimerRef.current = null
          }
        }
      }

      const startedAt = performance.now()
      let lastScrollTop = scrollContainer.scrollTop
      let stableFrames = 0
      const revealWhenScrollSettles = (timestamp: number) => {
        const currentScrollTop = scrollContainer.scrollTop
        const moved = Math.abs(currentScrollTop - lastScrollTop) > 0.5
        stableFrames = moved ? 0 : stableFrames + 1
        lastScrollTop = currentScrollTop

        const elapsed = timestamp - startedAt
        if ((elapsed >= 340 && stableFrames >= 6) || elapsed >= 1100) {
          editorFocusModeVisualFrameRef.current = null
          setEditorFocusModeVisual(true)
          return
        }

        editorFocusModeVisualFrameRef.current = requestAnimationFrame(revealWhenScrollSettles)
      }

      editorFocusModeVisualFrameRef.current = requestAnimationFrame(revealWhenScrollSettles)
      return () => {
        if (editorFocusModeVisualFrameRef.current) {
          cancelAnimationFrame(editorFocusModeVisualFrameRef.current)
          editorFocusModeVisualFrameRef.current = null
        }
        if (editorFocusModeVisualTimerRef.current) {
          clearTimeout(editorFocusModeVisualTimerRef.current)
          editorFocusModeVisualTimerRef.current = null
        }
      }
    }

    editorFocusModeVisualTimerRef.current = setTimeout(() => {
      editorFocusModeVisualTimerRef.current = null
      setEditorFocusModeVisual(false)
    }, 40)
    return () => {
      if (editorFocusModeVisualTimerRef.current) {
        clearTimeout(editorFocusModeVisualTimerRef.current)
        editorFocusModeVisualTimerRef.current = null
      }
      if (editorFocusModeVisualFrameRef.current) {
        cancelAnimationFrame(editorFocusModeVisualFrameRef.current)
        editorFocusModeVisualFrameRef.current = null
      }
    }
  }, [activeView, editorFocusMode, markActiveEditorBlock])

  const scheduleFormatSideControls = useCallback(() => {
    if (formatSideFrameRef.current) return
    formatSideFrameRef.current = requestAnimationFrame(() => {
      formatSideFrameRef.current = null
      syncFormatSideControls()
    })
  }, [syncFormatSideControls])

  const scheduleBlockControls = useCallback(() => {
    if (formatBlockFrameRef.current) return
    formatBlockFrameRef.current = requestAnimationFrame(() => {
      formatBlockFrameRef.current = null
      measureBlockControls()
    })
  }, [measureBlockControls])

  const scheduleEditorResizeMeasurements = useCallback(() => {
    if (activeView !== 'editor' || !blockEditorShellRef.current || !mountedEditorDom(editor)) return
    if (editorResizeFrameRef.current) return
    editorResizeFrameRef.current = requestAnimationFrame(() => {
      editorResizeFrameRef.current = null
      if (activeView !== 'editor' || !blockEditorShellRef.current || !mountedEditorDom(editor)) return
      syncFormatSideControls()
      measureBlockControls()
      updateFloatingToolbarPosition()
    })
  }, [activeView, editor, measureBlockControls, syncFormatSideControls, updateFloatingToolbarPosition])

  useLayoutEffect(() => {
    measureBlockControls()
    scheduleFloatingToolbarPosition()
  }, [measureBlockControls, scheduleFloatingToolbarPosition])

  useEffect(() => {
    if (!editor) return
    syncFormatSideControls()
    measureBlockControls()
    markActiveEditorBlock()
    editor.on('selectionUpdate', scheduleFormatSideControls)
    editor.on('selectionUpdate', markActiveEditorBlock)
    editor.on('transaction', scheduleFormatSideControls)
    editor.on('transaction', scheduleBlockControls)
    editor.on('transaction', markActiveEditorBlock)
    window.addEventListener('resize', scheduleEditorResizeMeasurements)
    documentScrollRef.current?.addEventListener('scroll', scheduleFormatSideControls)
    documentScrollRef.current?.addEventListener('scroll', scheduleBlockControls)
    documentScrollRef.current?.addEventListener('scroll', scheduleFloatingToolbarPosition)
    return () => {
      editor.off('selectionUpdate', scheduleFormatSideControls)
      editor.off('selectionUpdate', markActiveEditorBlock)
      editor.off('transaction', scheduleFormatSideControls)
      editor.off('transaction', scheduleBlockControls)
      editor.off('transaction', markActiveEditorBlock)
      window.removeEventListener('resize', scheduleEditorResizeMeasurements)
      documentScrollRef.current?.removeEventListener('scroll', scheduleFormatSideControls)
      documentScrollRef.current?.removeEventListener('scroll', scheduleBlockControls)
      documentScrollRef.current?.removeEventListener('scroll', scheduleFloatingToolbarPosition)
      if (editorResizeFrameRef.current) {
        cancelAnimationFrame(editorResizeFrameRef.current)
        editorResizeFrameRef.current = null
      }
    }
  }, [editor, markActiveEditorBlock, measureBlockControls, scheduleBlockControls, scheduleEditorResizeMeasurements, scheduleFloatingToolbarPosition, scheduleFormatSideControls, syncFormatSideControls])

  useEffect(() => {
    markActiveEditorBlock()
    scheduleEditorResizeMeasurements()
    queueFloatingToolbarRemeasure(180)
  }, [editorFocusMode, markActiveEditorBlock, queueFloatingToolbarRemeasure, scheduleEditorResizeMeasurements])

  useEffect(() => {
    queueFloatingToolbarRemeasure(220)
  }, [activeView, appFullscreen, appImmersiveFullscreen, queueFloatingToolbarRemeasure, selectedNoteId, sidebarRevealAnimating])

  const insertBlock = (blockId: string, type: LociBlockType, placement: 'before' | 'after' = 'after') => {
    if (!selectedBlocks.length) return
    const newBlock = createLociBlock(blankBlockNode(type), type)
    const nextBlocks = insertBlockRelative(selectedBlocks, blockId, newBlock, placement)
    persistBlocks(nextBlocks)
    setBlockPicker({ open: false, blockId: '', placement: 'after', query: '' })
  }

  const insertFlashcardAfterActive = () => {
    if (!selectedNote || !selectedBlocksRef.current.length) return
    const now = nowIso()
    const atom: Atom = {
      id: createId('atom'),
      projectId: selectedNote.projectId,
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
    const targetBlockId = selectedBlocksRef.current[Math.max(0, insertIndex - 1)]?.id ?? ''
    const nextBlocks = targetBlockId ? insertBlockRelative(selectedBlocks, targetBlockId, block, 'after') : [...selectedBlocks, block]
    void atomsStore.save(atom)
    setAtoms((current) => [atom, ...current])
    persistBlocks(nextBlocks)
    showNotice('Flashcard block added and linked as an atom.')
  }

  const insertImageAfterActive = (src: string) => {
    const safeSrc = sanitizeImageUrl(src)
    if (!safeSrc) {
      showNotice('Use a valid http(s) image URL or supported image data URL.')
      return
    }
    if (!selectedBlocksRef.current.length) {
      editor?.chain().focus().insertContent(imageBlockDoc(safeSrc).content?.[0] ?? { type: 'image', attrs: { src: safeSrc } }).run()
      return
    }
    const insertIndex = Math.min(selectedBlocksRef.current.length, activeBlockIndex() + 1)
    const block = createLociBlock(imageBlockDoc(safeSrc), 'image')
    const targetBlockId = selectedBlocksRef.current[Math.max(0, insertIndex - 1)]?.id ?? ''
    const nextBlocks = targetBlockId ? insertBlockRelative(selectedBlocks, targetBlockId, block, 'after') : [...selectedBlocks, block]
    persistBlocks(nextBlocks)
    showNotice('Image block added.')
  }

  const applyAIBlockPayload = (payload: AIBlockPayload) => {
    if (!selectedBlocksRef.current.length) return
    const content = payload.kind === 'table'
      ? tableBlockDocFromData(payload.data.columns, payload.data.rows)
      : quoteBlockDocFromData(payload.data.quote, payload.data.author)
    const type: LociBlockType = payload.kind === 'table' ? 'table' : 'quote'
    const flatBlocks = selectedBlocksRef.current
    const targetIndex = payload.targetBlockId ? flatBlocks.findIndex((block) => block.id === payload.targetBlockId) : -1
    const targetBlock = targetIndex >= 0 ? flatBlocks[targetIndex] : null
    const nextBlocks = targetBlock?.type === type
      ? updateBlockById(selectedBlocks, targetBlock.id, (block) => ({
        ...block,
        content,
        updatedAt: nowIso(),
      }))
      : (() => {
          const insertIndex = Math.min(flatBlocks.length, activeBlockIndex() + 1)
          const targetBlockId = flatBlocks[Math.max(0, insertIndex - 1)]?.id ?? ''
          const block = createLociBlock(content, type)
          return targetBlockId ? insertBlockRelative(selectedBlocks, targetBlockId, block, 'after') : [...selectedBlocks, block]
        })()
    persistBlocks(nextBlocks)
  }

  const activeBlockIndex = () => {
    const blocks = selectedBlocksRef.current
    if (!editor) return Math.max(0, blocks.length - 1)
    const selectionFrom = editor.state.selection.from
    let runningPos = 1
    for (let index = 0; index < blocks.length; index += 1) {
      const blockSize = blockContentNodes(blocks[index].content).reduce((total, node) => total + editor.schema.nodeFromJSON(node).nodeSize, 0)
      if (selectionFrom <= runningPos + blockSize) return index
      runningPos += blockSize
    }
    return Math.max(0, blocks.length - 1)
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
      measureBlockControls()
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

  const syncHoveredBlockControl = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-block-id]') : null
    const targetBlockId = target?.dataset.blockId
    if (targetBlockId && blockControls.some((control) => control.blockId === targetBlockId)) {
      setHoveredBlockControlId((current) => (current === targetBlockId ? current : targetBlockId))
      return
    }

    const shellRect = event.currentTarget.getBoundingClientRect()
    const pointerY = event.clientY - shellRect.top
    const hoveredControl = blockControls.find((control) => pointerY >= control.top && pointerY <= control.top + control.height)
    const nextBlockId = hoveredControl?.blockId ?? ''
    setHoveredBlockControlId((current) => (current === nextBlockId ? current : nextBlockId))
  }

  const handleBlockEditorPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    handleImageCropPointerMove(event)
    if (!imageCropDragRef.current) syncHoveredBlockControl(event)
  }

  const handleBlockEditorPointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Element && nextTarget.closest('.block-controls-layer, [data-block-id]')) return
    if (!imageCropDragRef.current) setHoveredBlockControlId('')
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

  const renderBlockControls = () => {
    if (!blockControls.length) return null
    return (
      <div className="block-controls-layer" aria-hidden={false}>
        {blockControls.map((control) => {
          const block = selectedBlocksRef.current.find((item) => item.id === control.blockId)
          return (
          <span key={control.blockId} className={`block-control-hotspot ${hoveredBlockControlId === control.blockId ? 'is-hovered' : ''}`} style={{ top: control.top, height: control.height }}>
            <span
              className="block-hover-controls"
              data-block-id={control.blockId}
              data-block-type={block?.type ?? ''}
              contentEditable={false}
            >
              {selectedBlocksRef.current.length > 1 && (
                <button className="block-control-button block-control-delete" type="button" aria-label="Delete block" data-block-action="delete" data-block-id={control.blockId}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
                </button>
              )}
              <button className="block-control-button" type="button" aria-label="Insert block after block" data-block-action="insert" data-block-id={control.blockId}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              </button>
              <button className="block-control-button block-control-handle" type="button" aria-label="Move block" draggable data-block-action="drag" data-block-id={control.blockId}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="7.5" r="1.25" /><circle cx="15" cy="7.5" r="1.25" />
                  <circle cx="9" cy="12" r="1.25" /><circle cx="15" cy="12" r="1.25" />
                  <circle cx="9" cy="16.5" r="1.25" /><circle cx="15" cy="16.5" r="1.25" />
                </svg>
              </button>
            </span>
          </span>
          )
        })}
      </div>
    )
  }

  const nearestBlockDropTarget = (clientX: number, clientY: number): { target: BlockDropTarget; placement: DropPlacement } | null => {
    const targets = blockDropTargetsRef.current
    const direct = targets.find((target) => {
      const horizontalPadding = Math.max(96, target.rect.width * 0.18)
      return clientX >= target.rect.left - horizontalPadding &&
      clientX <= target.rect.right + horizontalPadding &&
      clientY >= target.rect.top &&
      clientY <= target.rect.bottom
    })

    if (direct) {
      return {
        target: direct,
        placement: clientY < direct.rect.top + direct.rect.height / 2 ? 'above' : 'below',
      }
    }

    return targets.reduce<{ target: BlockDropTarget; placement: DropPlacement; distance: number } | null>((nearest, target) => {
      const aboveDistance = Math.abs(clientY - target.rect.top)
      const belowDistance = Math.abs(clientY - target.rect.bottom)
      const placement: DropPlacement = aboveDistance <= belowDistance ? 'above' : 'below'
      const distance = Math.min(aboveDistance, belowDistance)
      if (!nearest || distance < nearest.distance) return { target, placement, distance }
      return nearest
    }, null)
  }

  const positionBlockDropIndicator = (target: BlockDropTarget, placement: DropPlacement) => {
    const indicator = blockDropIndicatorRef.current
    if (!indicator) return
    const overlayRect = indicator.parentElement?.getBoundingClientRect()
    const originTop = overlayRect?.top ?? target.shellTop
    const originLeft = overlayRect?.left ?? target.shellLeft
    const top = placement === 'above'
      ? target.rect.top - originTop
      : target.rect.bottom - originTop
    const left = target.rect.left - originLeft
    const width = Math.max(36, target.rect.width)
    indicator.dataset.placement = placement
    indicator.style.opacity = '1'
    indicator.style.width = `${width}px`
    indicator.style.height = '2px'
    indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }

  const hideBlockDropIndicator = () => {
    blockDropIntentRef.current = null
    const indicator = blockDropIndicatorRef.current
    if (indicator) indicator.style.opacity = '0'
  }

  const resetBlockDragState = useCallback(() => {
    draggedBlockIdRef.current = ''
    setDraggedBlockId('')
    blockDropTargetsRef.current = []
    hideBlockDropIndicator()
  }, [])

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

  const handleAuthorshipPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!editor || editor.isDestroyed) return false
    const target = event.target instanceof Element ? event.target : null
    if (!target || !editor.view.dom.contains(target)) return false
    if (target.closest('[data-block-action], .format-side-controls, .block-drop-overlay')) return false

    const { from, to, empty } = editor.state.selection
    if (empty) {
      setAuthorshipMenu(null)
      return false
    }

    const position = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
    if (!position || position.pos < from || position.pos > to) {
      setAuthorshipMenu(null)
      return false
    }

    event.preventDefault()
    event.stopPropagation()
    setAuthorshipMenu({
      from,
      to,
      top: event.clientY,
      left: event.clientX,
    })
    return true
  }

  const handleEditorPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (handleAuthorshipPointerDown(event)) return
    handleImageCropPointerDown(event)
  }

  const markSelectionAsCopied = () => {
    if (!editor || !authorshipMenu) return
    editor
      .chain()
      .focus()
      .setTextSelection({ from: authorshipMenu.from, to: authorshipMenu.to })
      .setAuthorship({ kind: 'copied', createdAt: nowIso(), source: 'manual-mark' })
      .run()
    setAuthorshipMenu(null)
  }

  const clearCopiedMark = () => {
    if (!editor || !authorshipMenu) return
    editor
      .chain()
      .focus()
      .setTextSelection({ from: authorshipMenu.from, to: authorshipMenu.to })
      .unsetAuthorship()
      .run()
    setAuthorshipMenu(null)
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
    draggedBlockIdRef.current = target.dataset.blockId
    setDraggedBlockId(target.dataset.blockId)
    blockDropTargetsRef.current = measureBlockDropTargets()
    requestAnimationFrame(() => {
      blockDropTargetsRef.current = measureBlockDropTargets()
    })
  }

  const trackBlockDropFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!blockDropTargetsRef.current.length) {
      blockDropTargetsRef.current = measureBlockDropTargets()
    }
    if (blockDropFrameRef.current) return
    blockDropFrameRef.current = requestAnimationFrame(() => {
      blockDropFrameRef.current = null
      const intentTarget = nearestBlockDropTarget(clientX, clientY)
      const draggedId = draggedBlockIdRef.current
      if (!intentTarget || !draggedId) {
        hideBlockDropIndicator()
        return
      }
      const { target, placement } = intentTarget
      blockDropIntentRef.current = { draggedId, targetId: target.blockId, placement }
      positionBlockDropIndicator(target, placement)
    })
  }, [measureBlockDropTargets])

  const handleBlockDropOverlayDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    trackBlockDropFromPoint(event.clientX, event.clientY)
  }

  const handleBlockDropOverlayDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const draggedId = event.dataTransfer.getData('application/x-loci-block') || draggedBlockIdRef.current
    const intent = blockDropIntentRef.current?.draggedId ? blockDropIntentRef.current : null
    if (draggedId && intent) {
      const nextBlocks = applyBlockDrop(selectedBlocksRef.current, { ...intent, draggedId })
      if (nextBlocks !== selectedBlocksRef.current) persistBlocks(nextBlocks)
    }
    resetBlockDragState()
  }

  const handleBlockDragEnd = () => {
    resetBlockDragState()
  }

  const renderBlockDropOverlay = () =>
    draggedBlockId ? (
      <div className="block-drop-overlay" aria-hidden>
        <span ref={blockDropIndicatorRef} className="block-drop-indicator" />
      </div>
    ) : null

  useEffect(() => {
    if (!draggedBlockId) return undefined
    const refreshDropTargets = () => {
      blockDropTargetsRef.current = measureBlockDropTargets()
    }
    const trackDocumentDrag = (event: DragEvent) => {
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      trackBlockDropFromPoint(event.clientX, event.clientY)
    }
    const dropFromDocument = (event: DragEvent) => {
      event.preventDefault()
      const draggedId = event.dataTransfer?.getData('application/x-loci-block') || draggedBlockIdRef.current
      const intent = blockDropIntentRef.current?.draggedId ? blockDropIntentRef.current : null
      if (draggedId && intent) {
        const nextBlocks = applyBlockDrop(selectedBlocksRef.current, { ...intent, draggedId })
        if (nextBlocks !== selectedBlocksRef.current) persistBlocks(nextBlocks)
      }
      resetBlockDragState()
    }
    const cleanupDrag = () => resetBlockDragState()
    window.addEventListener('resize', refreshDropTargets)
    window.addEventListener('dragover', trackDocumentDrag)
    window.addEventListener('dragend', cleanupDrag)
    window.addEventListener('drop', dropFromDocument)
    documentScrollRef.current?.addEventListener('scroll', refreshDropTargets)
    return () => {
      window.removeEventListener('resize', refreshDropTargets)
      window.removeEventListener('dragover', trackDocumentDrag)
      window.removeEventListener('dragend', cleanupDrag)
      window.removeEventListener('drop', dropFromDocument)
      documentScrollRef.current?.removeEventListener('scroll', refreshDropTargets)
    }
  }, [draggedBlockId, measureBlockDropTargets, persistBlocks, resetBlockDragState, trackBlockDropFromPoint])

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
      onConfirm: () => {
        pendingNoteSavesRef.current.delete(note.id)
        const previousNotes = notesRef.current
        const remaining = previousNotes.filter((item) => item.id !== note.id)
        notesRef.current = remaining
        setNotes(remaining)
        if (selectedNoteIdRef.current === note.id) {
          setSelectedNoteId(remaining[0]?.id ?? '')
        }
        setActiveEditorPanel(null)
        setNoteHistoryOpen(false)
        showNotice('')
        const restore = () => {
          const timer = optimisticDeleteTimersRef.current.get(note.id)
          if (timer) clearTimeout(timer)
          optimisticDeleteTimersRef.current.delete(note.id)
          notesRef.current = previousNotes
          setNotes(previousNotes)
          setSelectedNoteId(note.id)
          setActiveView('editor')
          setUndoNotice(null)
          showNotice('Note restored.')
        }
        setUndoNotice({ message: 'Note deleted.', action: restore })
        const timer = setTimeout(() => {
          optimisticDeleteTimersRef.current.delete(note.id)
          setUndoNotice((current) => (current?.message === 'Note deleted.' ? null : current))
          void notesStore.deleteWithSnapshots(note.id).catch(() => {
            notesRef.current = previousNotes
            setNotes(previousNotes)
            showNotice('Could not delete the note. It has been restored.')
          })
        }, OPTIMISTIC_UNDO_MS)
        optimisticDeleteTimersRef.current.set(note.id, timer)
        if (selectedNoteIdRef.current === note.id) setActiveView(remaining.length ? 'editor' : 'home')
      },
    })
  }

  const duplicateNote = async (note: Note) => {
    const now = nowIso()
    const duplicatedNote: Note = {
      ...note,
      id: createId('note'),
      title: `${note.title || 'Untitled Note'} Copy`,
      createdAt: now,
      updatedAt: now,
    }
    await notesStore.save(duplicatedNote)
    setNotes((current) => [duplicatedNote, ...current].sort(sortByUpdated))
    setOpenLooseNoteMenuId('')
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

        await atomsStore.deleteManyAndUnlink(atomIds, touchedNotes, updatedSets)

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
    const nextAtomIds = Array.from(new Set(flashcardSetDraftAtomIds))
    const next: FlashcardSet = {
      id: existing?.id ?? createId('set'),
      name,
      description: flashcardSetDraftDescription.trim(),
      atomIds: nextAtomIds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastStudiedAt: existing?.lastStudiedAt,
      totalStudyMs: existing?.totalStudyMs,
      lastStudyDurationMs: existing?.lastStudyDurationMs,
      studySessionCount: existing?.studySessionCount,
      matchBestMs: existing?.matchBestMs,
      matchTotalMs: existing?.matchTotalMs,
      matchSessionCount: existing?.matchSessionCount,
      aiHintsByAtomId: existing?.aiHintsByAtomId,
      cachedQuiz: existing?.cachedQuiz,
    }
    await flashcardSetsStore.save(next)
    if (existing) {
      const removedAtomIds = existing.atomIds.filter((atomId) => !nextAtomIds.includes(atomId))
      if (removedAtomIds.length) void flashcardSetsStore.deleteReviewStatesForAtoms(existing.id, removedAtomIds)
    }
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
        await flashcardSetsStore.delete(set.id)
        setFlashcardSets((current) => current.filter((item) => item.id !== set.id))
        if (studyingFlashcardSetId === set.id) {
          studySessionStartedAtRef.current = null
          studySessionPersistedRef.current = true
          setStudyingFlashcardSetId(null)
          setStudyMode(null)
          setStudyElapsedMs(0)
          setAtomSubView('sets')
        }
      },
    })
  }

  const resetFlashcardSetStudyProgress = async (set: FlashcardSet) => {
    setAppDialog({
      kind: 'confirm',
      title: 'Reset study progress',
      message: `Reset all study progress for "${set.name}"? Cards, Match times, AI hints, and quiz progress will start fresh.`,
      confirmLabel: 'Reset',
      intent: 'danger',
      onConfirm: async () => {
        const updatedSet = await flashcardSetsStore.resetStudyProgress(set.id, nowIso())
        syncFlashcardSet(updatedSet)
        if (studyingFlashcardSetId === set.id) {
          studySessionStartedAtRef.current = null
          studySessionPersistedRef.current = true
          setStudyMode(null)
          setStudyAtomIds([])
          setStudyIndex(0)
          setStudyFlipped(false)
          setStudyKnownAtomIds([])
          setStudyLearningAtomIds([])
          setReviewStates([])
          setAiHintRunningAtomId(null)
          setMatchTiles([])
          setMatchSelection(null)
          setMatchMatchedAtomIds([])
          setMatchMistakes(0)
          setStudyElapsedMs(0)
          setQuizAnswers({})
          setQuizGenerating(false)
          setAtomSubView('set-open')
        }
      },
    })
  }

  const toggleFlashcardSetAtom = (atomId: string) => {
    setFlashcardSetDraftAtomIds((current) =>
      current.includes(atomId) ? current.filter((id) => id !== atomId) : [...current, atomId],
    )
  }

  const openFlashcardSet = (set: FlashcardSet) => {
    const availableIds = set.atomIds.filter((id) => atoms.some((atom) => atom.id === id))
    if (!availableIds.length) return
    stopActiveStudySession()
    setStudyingFlashcardSetId(set.id)
    setAtomSubView('set-open')
  }

  const openQuizSetup = (set: FlashcardSet) => {
    const availableIds = set.atomIds.filter((id) => atoms.some((atom) => atom.id === id))
    if (!availableIds.length) return
    stopActiveStudySession()
    setStudyingFlashcardSetId(set.id)
    setQuizAnswers({})
    setQuizResult(null)
    setQuizGenerating(false)
    setQuizSetupOptions((current) => ({
      ...current,
      questionCount: Math.min(10, Math.max(1, Math.min(current.questionCount, availableIds.length))),
    }))
    setAtomSubView('quiz-setup')
  }

  const startFlashcardStudy = async (set: FlashcardSet) => {
    const availableIds = set.atomIds.filter((id) => atoms.some((atom) => atom.id === id))
    if (!availableIds.length) return
    const states = await flashcardSetsStore.listReviewStates(set.id)
    const dueIds = sortDueAtomIds(availableIds, states, nowIso())
    const nextIds = studyShuffle ? shuffleList(dueIds) : dueIds
    beginStudySession(set.id, 'flashcards')
    setReviewStates(states)
    setStudyAtomIds(nextIds)
    setStudyIndex(0)
    setStudyFlipped(false)
    setStudyKnownAtomIds([])
    setStudyLearningAtomIds([])
    setAtomSubView('study')
  }

  const startMatchStudy = (set: FlashcardSet) => {
    const availableAtoms = set.atomIds.map((id) => atomById.get(id)).filter((atom): atom is Atom => Boolean(atom))
    if (!availableAtoms.length) return
    beginStudySession(set.id, 'match')
    setMatchTiles(shuffleList([
      ...availableAtoms.map((atom) => ({ id: `${atom.id}-term`, atomId: atom.id, text: atom.phrase, kind: 'term' as const })),
      ...availableAtoms.map((atom) => ({ id: `${atom.id}-definition`, atomId: atom.id, text: atom.definition, kind: 'definition' as const })),
    ]))
    setMatchSelection(null)
    setMatchMatchedAtomIds([])
    setMatchMistakes(0)
    setAtomSubView('match')
  }

  const markStudyCard = async (rating: StudyRating) => {
    if (!activeStudyAtom || !studyingFlashcardSetId) return
    const atomId = activeStudyAtom.id
    const now = nowIso()
    const existing = reviewStates.find((state) => state.atomId === atomId)
    const nextState = applyStudyRating(
      reviewStateForCard(existing, studyingFlashcardSetId, atomId, now),
      rating,
      now,
    )
    await flashcardSetsStore.saveReviewState(nextState)
    setReviewStates((current) => [nextState, ...current.filter((state) => state.atomId !== atomId)])
    if (rating === 'again' || rating === 'hard') {
      setStudyLearningAtomIds((current) => (current.includes(atomId) ? current : [...current, atomId]))
    } else {
      setStudyKnownAtomIds((current) => (current.includes(atomId) ? current : [...current, atomId]))
      setStudyLearningAtomIds((current) => current.filter((id) => id !== atomId))
    }
    setStudyAtomIds((current) => current.filter((id) => id !== atomId))
    setStudyIndex((current) => {
      if (studyAtoms.length <= 1) return 0
      return Math.min(current, studyAtoms.length - 2)
    })
    setStudyFlipped(false)
  }

  const moveStudyCard = (direction: 1 | -1) => {
    setStudyIndex((current) => {
      if (!studyAtoms.length) return 0
      return (current + direction + studyAtoms.length) % studyAtoms.length
    })
    setStudyFlipped(false)
  }

  const restartStudyRound = async () => {
    if (!studyingFlashcardSet) return
    const availableIds = studyingFlashcardSet.atomIds.filter((id) => atoms.some((atom) => atom.id === id))
    const states = await flashcardSetsStore.listReviewStates(studyingFlashcardSet.id)
    const dueIds = sortDueAtomIds(availableIds, states, nowIso())
    setReviewStates(states)
    setStudyAtomIds(studyShuffle ? shuffleList(dueIds) : dueIds)
    setStudyKnownAtomIds([])
    setStudyLearningAtomIds([])
    setStudyIndex(0)
    setStudyFlipped(false)
  }

  const chooseMatchTile = (tile: MatchTile) => {
    if (matchMatchedAtomIds.includes(tile.atomId)) return
    if (!matchSelection) {
      setMatchSelection({ id: tile.id, atomId: tile.atomId, kind: tile.kind })
      return
    }
    if (matchSelection.id === tile.id) {
      setMatchSelection(null)
      return
    }
    if (matchSelection.kind === tile.kind) {
      setMatchSelection({ id: tile.id, atomId: tile.atomId, kind: tile.kind })
      return
    }
    if (matchSelection.atomId === tile.atomId) {
      setMatchMatchedAtomIds((current) => (current.includes(tile.atomId) ? current : [...current, tile.atomId]))
    } else {
      setMatchMistakes((current) => current + 1)
    }
    setMatchSelection(null)
  }

  const requestSetAIText = async (taskType: AITaskType, set: FlashcardSet, userContent: string) => {
    const providerId = userSettings.defaultAIProvider
    const providerMeta = aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0]
    const provider = userSettings.aiProviders[providerId]
    if (!provider.enabled || !provider.apiKey.trim()) {
      showNotice(`Add a ${providerMeta.name} API key in Settings first.`)
      setActiveView('settings')
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: 'error',
        aiLastProvider: providerId,
        aiLastError: `Missing ${providerMeta.name} API key.`,
        aiLastRequestAt: nowIso(),
      })
      throw new Error(`Missing ${providerMeta.name} API key.`)
    }
    const timeoutMs = userSettings.aiTimeoutMs ?? DEFAULT_AI_TIMEOUT_MS
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const result = await requestAIText({
        providerId,
        provider,
        providerMeta,
        taskInstruction: `${AI_SYSTEM_INSTRUCTION}\n\n${AI_TASK_CONTRACTS[taskType]}`,
        userContent,
        promptCacheKey: set.id,
        signal: controller.signal,
      })
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: 'success',
        aiLastProvider: providerId,
        aiLastUsage: result.usage,
        aiLastError: undefined,
        aiLastRequestAt: nowIso(),
      })
      return result.responseText
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'AI request timed out.'
        : error instanceof Error
          ? error.message
          : 'AI request failed.'
      showNotice(`${providerMeta.name}: ${message}`)
      void saveUserSettings({
        ...userSettings,
        aiLastStatus: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error',
        aiLastProvider: providerId,
        aiLastError: message,
        aiLastRequestAt: nowIso(),
      })
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const generateAIHint = async (atom: Atom) => {
    if (!studyingFlashcardSet || aiHintRunningAtomId) return
    setAiHintRunningAtomId(atom.id)
    try {
      const text = await requestSetAIText(
        'flashcard_hint',
        studyingFlashcardSet,
        `Set: ${studyingFlashcardSet.name}\nTerm: ${atom.phrase}\nDefinition: ${atom.definition}`,
      )
      const hint = cleanAIDraftFormatting(sanitizeAIInsertText(text)).slice(0, 220)
      const updatedSet = await flashcardSetsStore.cacheAIHint(studyingFlashcardSet.id, atom.id, hint, nowIso())
      syncFlashcardSet(updatedSet)
    } catch (error) {
      console.error('Could not generate flashcard hint', error)
    } finally {
      setAiHintRunningAtomId(null)
    }
  }

  const startQuizStudy = async (set: FlashcardSet) => {
    const availableAtoms = set.atomIds.map((id) => atomById.get(id)).filter((atom): atom is Atom => Boolean(atom))
    if (!availableAtoms.length || quizGenerating || !quizSetupCanStart) return
    beginStudySession(set.id, 'quiz')
    setQuizAnswers({})
    setQuizResult(null)
    setQuizGenerating(true)
    setAtomSubView('quiz')
    try {
      const generatedAt = nowIso()
      const requestedQuestionCount = Math.min(10, Math.max(1, quizSetupOptions.questionCount), availableAtoms.length)
      const quizAtoms = shuffleList(availableAtoms).slice(0, requestedQuestionCount)
      const questionFormats = [
        quizSetupOptions.includeTrueFalse ? 'true-false' : '',
        quizSetupOptions.includeMultipleChoice ? 'multiple-choice' : '',
        quizSetupOptions.includeMatching ? 'matching' : '',
        quizSetupOptions.includeWritten ? 'short-answer' : '',
      ].filter(Boolean)
      const response = await requestSetAIText(
        'flashcard_quiz',
        set,
        [
          `Set: ${set.name}`,
          set.description ? `Description: ${set.description}` : '',
          `Question count: create exactly ${requestedQuestionCount} questions. Do not exceed 10 questions.`,
          `Answer with: ${quizSetupOptions.answerWith}. If "term", prompt with definitions and expect terms. If "definition", prompt with terms and expect definitions. If "both", mix both directions.`,
          `Question formats: ${questionFormats.join(', ')}`,
          'Distribute questions across the selected formats. Only use the selected formats.',
          'For multiple-choice questions, make the answer one of the choices exactly.',
          'For true-false questions, use a boolean answer.',
          'For matching questions, provide pairs with left and right text.',
          'For short-answer questions, do not require typo checking; provide the expected answer and a simple self-check rubric.',
          'Atoms:',
          ...quizAtoms.map((atom) => `- ${atom.id}: ${atom.phrase} — ${atom.definition}`),
        ].filter(Boolean).join('\n'),
      )
      const parsedQuiz = parseFlashcardQuizPayload(response, quizAtoms.map((atom) => atom.id), generatedAt)
      const quiz = { ...parsedQuiz, questions: parsedQuiz.questions.slice(0, requestedQuestionCount) }
      const updatedSet = await flashcardSetsStore.cacheQuiz(set.id, quiz)
      syncFlashcardSet(updatedSet)
    } catch (error) {
      console.error('Could not generate quiz', error)
      if (set.cachedQuiz) showNotice('Using the latest cached quiz.')
      else setAtomSubView('set-open')
    } finally {
      setQuizGenerating(false)
    }
  }

  const updateQuizAnswer = (questionId: string, patch: QuizAnswerState) => {
    if (quizMarked) return
    setQuizAnswers((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] ?? {}), ...patch },
    }))
  }

  const markQuiz = async () => {
    if (!studyingFlashcardSet?.cachedQuiz || quizResult?.marking || !quizReadyToMark) return
    const quiz = studyingFlashcardSet.cachedQuiz
    const resultsByQuestionId: Record<string, QuizQuestionResult> = {}
    setQuizResult({ resultsByQuestionId: {}, score: 0, total: quiz.questions.length, marking: true })
    for (const question of quiz.questions) {
      const answer = quizAnswers[question.id] ?? {}
      if (question.type === 'multiple-choice') {
        resultsByQuestionId[question.id] = { correct: answer.selectedChoice === question.answer }
      } else if (question.type === 'true-false') {
        resultsByQuestionId[question.id] = { correct: answer.trueFalseAnswer === question.answer }
      } else if (question.type === 'matching') {
        resultsByQuestionId[question.id] = {
          correct: question.pairs.every((pair) => answer.matchingPairs?.[pair.left] === pair.right),
        }
      } else {
        const shortAnswer = answer.shortAnswer?.trim() ?? ''
        try {
          const response = await requestSetAIText(
            'flashcard_short_answer_mark',
            studyingFlashcardSet,
            `Question: ${question.prompt}\nExpected answer: ${question.expectedAnswer}\nRubric: ${question.rubric}\nStudent answer: ${shortAnswer}`,
          )
          const mark = parseFlashcardShortAnswerMark(response)
          resultsByQuestionId[question.id] = { correct: mark.correct, score: mark.score, feedback: mark.feedback }
        } catch (error) {
          console.error('Could not mark short answer', error)
          resultsByQuestionId[question.id] = { correct: false, score: 0, feedback: 'Could not mark this written answer.' }
        }
      }
    }
    const score = Object.values(resultsByQuestionId).filter((result) => result.correct).length
    setQuizResult({ resultsByQuestionId, score, total: quiz.questions.length, marking: false })
  }

  const retakeQuiz = () => {
    setQuizAnswers({})
    setQuizResult(null)
  }

  const startNewQuizSetup = (set: FlashcardSet) => {
    setQuizAnswers({})
    setQuizResult(null)
    openQuizSetup(set)
  }

  const deleteProject = async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const projectNotes = notes.filter((note) => note.projectId === projectId)
    const projectNoteIds = new Set(projectNotes.map((note) => note.id))
    const deletedProjectAtomIds = new Set(atoms.filter((atom) => projectIdForAtom(atom) === projectId).map((atom) => atom.id))
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
        const snapshots = await noteSnapshotsStore.list()
        const snapshotIdsToDelete = snapshots.filter((snapshot) => projectNoteIds.has(snapshot.noteId)).map((snapshot) => snapshot.id)

        const deletedAtomIdSet = new Set(atomIdsToDelete)
        const updatedSets = flashcardSets
          .map((set) => ({ ...set, atomIds: set.atomIds.filter((atomId) => !deletedAtomIdSet.has(atomId)), updatedAt: nowIso() }))
          .filter((set, index) => set.atomIds.length !== flashcardSets[index].atomIds.length)

        await projectsStore.deleteProjectData(projectId, projectNotes, snapshotIdsToDelete, atomIdsToDelete, updatedSets)

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
        const projectName = name.trim()
        if (!projectName) return
        const project: Project = {
          id: createId('project'),
          name: projectName,
          description: description?.trim() ?? '',
          color: '#1A1A1A',
          createdAt: nowIso(),
        }
        await projectsStore.save(project)
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
    await projectsStore.save(duplicatedProject)
    setProjects((current) => [...current, duplicatedProject].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const updateProjectDescription = async (projectId: string, description: string) => {
    await projectsStore.updateDescription(projectId, description)
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, description } : project)))
  }

  const updateProjectColor = async (projectId: string, color: string) => {
    await projectsStore.updateColor(projectId, color)
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, color } : project)))
    setOpenProjectMenuId('')
  }

  const toggleProjectPinned = async (project: Project) => {
    const pinnedAt = project.pinnedAt ? undefined : nowIso()
    await projectsStore.updatePinned(project.id, pinnedAt)
    setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, pinnedAt } : item)))
    setOpenProjectMenuId('')
  }

  const updateProjectName = async (projectId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    await projectsStore.rename(projectId, nextName)
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
      showNotice('Atom link removed.')
      return
    }

    if (empty) {
      const projectId = selectedNote?.projectId ?? UNASSIGNED_PROJECT_ID
      showNotice('')
      setActiveEditorPanel(null)
      setAtomDialog({
        phrase: '',
        definition: '',
        projectId,
        mode: 'manual',
      })
      return
    }

    const phrase = editor.state.doc.textBetween(from, to, ' ').trim()
    if (!phrase) return
    const projectId = selectedNote?.projectId ?? UNASSIGNED_PROJECT_ID
    const existing = findProjectAtomByPhrase(atoms, projectId, phrase)
    showNotice('')
    setAtomDialog({
      phrase,
      definition: existing?.definition ?? '',
      existingId: existing?.id,
      projectId,
      from,
      to,
      mode: 'selection',
    })
  }

  const saveAtomDialog = async () => {
    if (!atomDialog || !editor || !atomDialog.definition.trim() || !atomDialog.phrase.trim()) return
    const phrase = atomDialog.phrase.trim()
    const definition = atomDialog.definition.trim()
    const existing =
      atomDialog.existingId
        ? atoms.find((atom) => atom.id === atomDialog.existingId)
        : findProjectAtomByPhrase(atoms, atomDialog.projectId, phrase)
    const conflict = findProjectAtomByPhrase(atoms, atomDialog.projectId, phrase, existing?.id)
    const replacementTarget = conflict ?? existing
    if (replacementTarget && replacementTarget.definition.trim() !== definition) {
      const saveNewAtom = () => void saveAtomFromDialog(phrase, definition, null, 'selection')
      setAppDialog({
        kind: 'confirm',
        title: 'Replace existing atom?',
        message: `"${replacementTarget.phrase}" already exists in this project. Replace its definition, or keep the old version and create a separate atom?`,
        confirmLabel: 'Replace',
        secondaryLabel: 'Keep old',
        onConfirm: () => void saveAtomFromDialog(phrase, definition, replacementTarget, 'project'),
        onSecondary: saveNewAtom,
      })
      return
    }
    await saveAtomFromDialog(phrase, definition, existing ?? null, existing ? 'project' : 'selection')
  }

  const saveAtomFromDialog = async (phrase: string, definition: string, existing: Atom | null, linkScope: 'project' | 'selection') => {
    if (!atomDialog || !editor) return
    const atom: Atom = {
      id: existing?.id ?? createId('atom'),
      projectId: existing?.projectId ?? atomDialog.projectId,
      phrase: existing?.phrase ?? phrase,
      definition,
      tags: existing?.tags ?? [],
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      reviewCount: existing?.reviewCount ?? 0,
      knownCount: existing?.knownCount ?? 0,
    }

    await atomsStore.save(atom)
    setAtoms((current) => [atom, ...current.filter((item) => item.id !== atom.id)])
    let markCount: number
    if (linkScope === 'selection' && atomDialog.from !== undefined && atomDialog.to !== undefined) {
      editor.chain().focus().setTextSelection({ from: atomDialog.from, to: atomDialog.to }).setAtom({ atomId: atom.id, phrase: atom.phrase, definition: atom.definition }).run()
      markCount = 1
    } else {
      markCount = selectedNote ? await syncProjectAtomMarks(selectedNote.projectId, [atom]) : applyAtomMarksToEditor(editor, [atom])
    }
    showNotice(markCount > 1 ? `Atomised ${markCount} matches.` : '')
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
        const safeHref = sanitizeLinkUrl(href)
        if (!safeHref) {
          showNotice('Use a valid http, https, or mailto link.')
          return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: safeHref }).run()
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
        const safeSrc = sanitizeImageUrl(src)
        if (!safeSrc) {
          showNotice('Use a valid http(s) image URL or supported image data URL.')
          return
        }
        insertImageAfterActive(safeSrc)
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
      description: 'Top-level title for the current line.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      icon: Heading2,
      description: 'Section heading for the current line.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      icon: Heading3,
      description: 'Compact subheading.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'checklist',
      label: 'Checklist',
      icon: ListTodo,
      description: 'Turn lines into tappable tasks.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleTaskList().run(),
    },
    {
      id: 'table',
      label: 'Table',
      icon: Table2,
      description: 'Study grid with header row.',
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
      description: 'Question-and-answer study card.',
      group: 'Structure',
      enabled: true,
      action: () => insertFlashcardAfterActive(),
    },
    {
      id: 'highlight',
      label: 'Highlight',
      icon: Highlighter,
      description: 'Tint the selection with your highlighter color.',
      group: 'Text',
      enabled: true,
      action: () => toggleHighlight(),
    },
    {
      id: 'clear-formatting',
      label: 'Clear formatting',
      icon: RemoveFormatting,
      description: 'Strip marks, links, and block styles.',
      ariaLabel: 'Clear formatting. Shortcut: Control or Command+Backslash.',
      group: 'Text',
      enabled: true,
      action: clearFormatting,
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
      description: 'Insert a picture from a URL.',
      group: 'Insert',
      enabled: true,
      action: addImage,
    },
  ]

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

  const clearSidebarRevealTimers = () => {
    if (sidebarRevealTimeoutRef.current) {
      clearTimeout(sidebarRevealTimeoutRef.current)
      sidebarRevealTimeoutRef.current = null
    }
    if (sidebarRevealCleanupTimeoutRef.current) {
      clearTimeout(sidebarRevealCleanupTimeoutRef.current)
      sidebarRevealCleanupTimeoutRef.current = null
    }
  }

  const endSidebarRevealAnimation = () => {
    clearSidebarRevealTimers()
    setSidebarRevealAnimating(false)
  }

  const toggleAppFullscreen = () => {
    endSidebarRevealAnimation()
    setAppFullscreen((active) => {
      const next = !active
      if (!next) setAppImmersiveFullscreen(false)
      return next
    })
    queueFloatingToolbarRemeasure(220)
  }

  const handleAppShellWheel = (event: WheelEvent<HTMLElement>) => {
    const now = window.performance.now()
    if (now - sidebarFlickAtRef.current < SIDEBAR_FLICK_COOLDOWN_MS) return

    const verticalIntent = Math.abs(event.deltaY) > Math.abs(event.deltaX) * 1.35
    const resolveActiveScrollable = () => {
      const shell = event.currentTarget
      const startNode = event.target instanceof HTMLElement ? event.target : null
      let scrollHost: HTMLElement | null = null
      let node = startNode
      while (node && node !== shell) {
        if (node.scrollHeight > node.clientHeight + 1) {
          const overflowY = window.getComputedStyle(node).overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') {
            scrollHost = node
            break
          }
        }
        node = node.parentElement
      }

      const fallbackScrollable =
        activeView === 'home'
          ? homeScrollRef.current
          : activeView === 'editor'
            ? documentScrollRef.current
            : appShellRef.current?.querySelector<HTMLElement>('.main-pane')
      return scrollHost ?? fallbackScrollable ?? null
    }

    if (appFullscreen && appImmersiveFullscreen && verticalIntent && event.deltaY < -6) {
      const activeScrollable = resolveActiveScrollable()
      const atTop = !activeScrollable || activeScrollable.scrollTop <= 1
      if (!atTop) return

      sidebarFlickAtRef.current = now
      event.preventDefault()
      setAppImmersiveFullscreen(false)
      queueFloatingToolbarRemeasure(220)
      return
    }

    if (appFullscreen && !appImmersiveFullscreen && verticalIntent && Math.abs(event.deltaY) > 6) {
      sidebarFlickAtRef.current = now
      event.preventDefault()
      setAppImmersiveFullscreen(true)
      queueFloatingToolbarRemeasure(220)
      return
    }

    const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.35
    if (!horizontalIntent || Math.abs(event.deltaX) < SIDEBAR_FLICK_THRESHOLD) return

    const nextFullscreen = event.deltaX > 0 ? true : false
    if (nextFullscreen === appFullscreen) return

    sidebarFlickAtRef.current = now

    event.preventDefault()
    if (!nextFullscreen && appFullscreen) {
      if (!appImmersiveFullscreen) {
        endSidebarRevealAnimation()
        setAppFullscreen(false)
        queueFloatingToolbarRemeasure(220)
        return
      }
      clearSidebarRevealTimers()
      setSidebarRevealAnimating(true)
      sidebarRevealTimeoutRef.current = setTimeout(() => {
        sidebarRevealTimeoutRef.current = null
        setAppImmersiveFullscreen(false)
        setAppFullscreen(false)
        queueFloatingToolbarRemeasure(220)
      }, 140)
      sidebarRevealCleanupTimeoutRef.current = setTimeout(() => {
        sidebarRevealCleanupTimeoutRef.current = null
        setSidebarRevealAnimating(false)
      }, 620)
      return
    }

    endSidebarRevealAnimation()
    if (nextFullscreen) setAppImmersiveFullscreen(false)
    setAppFullscreen(nextFullscreen)
    queueFloatingToolbarRemeasure(220)
  }

  const formatDialogQueryNormalized = formatDialogQuery.trim().toLowerCase()
  const formatOptionMatchesFormatDialog = (option: FormatOption) => {
    if (!option.enabled) return false
    if (!formatDialogQueryNormalized) return true
    return (
      option.label.toLowerCase().includes(formatDialogQueryNormalized) ||
      option.description.toLowerCase().includes(formatDialogQueryNormalized) ||
      option.group.toLowerCase().includes(formatDialogQueryNormalized)
    )
  }
  const formatDialogSections = FORMAT_DIALOG_GROUP_ORDER.map((group) => ({
    group,
    options: formatOptions.filter((option) => option.group === group && formatOptionMatchesFormatDialog(option)),
  })).filter((section) => section.options.length > 0)

  return (
    <main className="app-stage">
      {notice && (
        <div className="toast-notice" role="status" aria-live="polite">
          <span className="toast-notice-content">{notice}</span>
          <button type="button" className="toast-notice-dismiss" aria-label="Dismiss notification" onClick={() => showNotice('')}>
            <X size={14} aria-hidden />
          </button>
        </div>
      )}
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
      <section
        className={`app-shell ${appFullscreen ? 'is-fullscreen' : ''} ${appImmersiveFullscreen ? 'is-immersive-fullscreen' : ''} ${sidebarRevealAnimating ? 'is-revealing-sidebar' : ''}`}
        aria-label="Loci Notes"
        onWheel={handleAppShellWheel}
        ref={appShellRef}
      >
        <Sidebar
          activeView={activeView}
          activeProject={activeProjectForQuickNav}
          activeNoteId={selectedNote?.id}
          atomSubView={atomSubView}
          draggedNoteIds={draggedNoteIds}
          dragOverProjectId={dragOverProjectId}
          profileAvatarColor={profileAvatarColor}
          profileDisplayName={profileDisplayName}
          profileHandleLabel={profileHandleLabel}
          profileInitials={profileInitials}
          projectQuickNotes={projectQuickNotes}
          onAssignNoteToProjectDrop={assignNoteToProjectDrop}
          onDragEnterProject={setDragOverProjectId}
          onDragLeaveProject={(projectId) => setDragOverProjectId((current) => (current === projectId ? '' : current))}
          onDragOverProject={handleNoteDropTargetDragOver}
          onNewNote={() => openTemplateChooser()}
          onOpenNote={openProjectQuickNote}
          onOpenProfile={openProfileModal}
          onOpenSearch={() => {
            setSearchQuery('')
            setSearchActiveIndex(0)
            setSearchOpen(true)
          }}
          onOpenProjectsRoot={() => {
            setSelectedProjectId('')
            setActiveView('projects')
          }}
          onRenameNote={(noteId, title) => void persistNote({ title }, noteId)}
          onSetActiveView={setActiveView}
          fullscreenActive={appFullscreen}
          onToggleFullscreen={toggleAppFullscreen}
        />
        {appFullscreen && (
          <button
            className="fullscreen-exit-button"
            type="button"
            aria-label="Exit fullscreen layout"
            onClick={() => {
              endSidebarRevealAnimation()
              setAppImmersiveFullscreen(false)
              setAppFullscreen(false)
              queueFloatingToolbarRemeasure(220)
            }}
          >
            <span>Exit</span>
          </button>
        )}

        {activeView === 'home' && (
          <section className="home-editorial" ref={homeScrollRef}>
            <div className="home-editorial-inner">
              <header className="home-greeting">
                <p className="home-eyebrow">Loci Notes</p>
                <h1>{homeGreeting}</h1>
                <p className="home-subtagline">{homeSubtagline}</p>
                <InkCharacter character={INK_WALKMAN_BOY} slotClass="margin-ink--welcome" dataInk={0} visitKey={homeVisitCount} />
              </header>

              <section className="home-section" aria-labelledby="continue-writing-title">
                <p className="home-eyebrow home-eyebrow--accent" id="continue-writing-title">Continue writing</p>
                {dashboardStats.recentNote ? (
                  <button className="home-hero-card" type="button" onClick={() => openNote(dashboardStats.recentNote.id)}>
                    <span
                      className={`home-hero-card-bleed home-hero-card-bleed--image ${homeHeroImageReady ? 'is-image-ready' : ''} ${homeHeroImageState === 'failed' ? 'is-image-failed' : ''}`}
                      style={{ '--home-hero-bleed-image': `url("${homeHeroBackgroundImage}")` } as CSSProperties}
                      aria-hidden
                    />
                    <span className="home-hero-card-glass">
                      <span className="home-hero-card-text">
                        <span className="home-hero-project">{dashboardStats.recentProjectName} · {formatDay(dashboardStats.recentNote.updatedAt)}</span>
                        <strong className="home-hero-title">{dashboardStats.recentNote.title}</strong>
                        <span className="home-hero-preview">{dashboardStats.recentNotePreviewLines[0] ?? 'Empty file'}</span>
                      </span>
                      <span className="home-hero-arrow" aria-hidden><ArrowRight size={18} /></span>
                    </span>
                  </button>
                ) : (
                  <button className="home-hero-card home-hero-card--empty" type="button" onClick={() => openTemplateChooser()}>
                    <span className="home-hero-card-bleed" aria-hidden />
                    <span className="home-hero-card-glass">
                      <span className="home-hero-card-text">
                        <span className="home-hero-project">No notes yet</span>
                        <strong className="home-hero-title">Start your first note</strong>
                        <span className="home-hero-preview">A small sentence is enough to begin.</span>
                      </span>
                      <span className="home-hero-arrow" aria-hidden><ArrowRight size={18} /></span>
                    </span>
                  </button>
                )}
              </section>

              <section className="home-section" aria-labelledby="home-tip-title">
                <p className="home-eyebrow home-eyebrow--accent" id="home-tip-title">Tip</p>
                <div className="home-tip-card">
                  <blockquote>{homeTip.body}</blockquote>
                  {homeTip.cta && (
                    <button
                      className="home-tip-cta"
                      type="button"
                      onClick={() => {
                        if (homeTip.cta?.action === 'newNote') openTemplateChooser()
                        if (homeTip.cta?.action === 'openAtoms') setActiveView('atoms')
                        if (homeTip.cta?.action === 'openProjects') {
                          setSelectedProjectId('')
                          setActiveView('projects')
                        }
                        if (homeTip.cta?.action === 'openSearch') {
                          setSearchQuery('')
                          setSearchActiveIndex(0)
                          setSearchOpen(true)
                        }
                      }}
                    >
                      {homeTip.cta.label}
                      <ArrowRight size={14} aria-hidden />
                    </button>
                  )}
                </div>
                <InkCharacter character={INK_READING_WOMAN} slotClass="margin-ink--tip" dataInk={1} visitKey={homeVisitCount} />
              </section>

              <section className="home-section home-recent" aria-labelledby="recent-notes-title">
                <div className="home-recent-head">
                  <h2 id="recent-notes-title">Recent notes</h2>
                  <button type="button" className="home-link" onClick={() => setActiveView('projects')}>View all</button>
                </div>
                {recentHomeNotes.length ? (
                  <ul className="home-recent-list">
                    {recentHomeNotes.map((note) => (
                      <li key={note.id}>
                        <button type="button" onClick={() => openNote(note.id)}>
                          <span className="home-recent-text">
                            <strong>{note.title}</strong>
                            <small>{projectById.get(note.projectId)?.name ?? 'Loose file'} · {formatDay(note.updatedAt)}</small>
                          </span>
                          <ChevronRight className="home-recent-chevron" size={16} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="home-recent-empty">No recent notes yet.</p>
                )}
                <InkCharacter character={INK_WALKING_WOMAN} slotClass="margin-ink--recent" dataInk={2} visitKey={homeVisitCount} />
              </section>
            </div>
          </section>
        )}

        {activeView === 'editor' && selectedNote && (
          <section className={`main-pane editor-pane ${editorFocusModeVisual ? 'is-focus-mode' : ''}`} ref={documentScrollRef}>
            {selectedEditorCityMarginalia && (
              <figure
                className={`editor-page-marginalia ${selectedEditorImageReady ? 'is-image-ready' : ''} ${selectedEditorImageState === 'failed' ? 'is-image-failed' : ''}`}
                style={{ opacity: editorCityMarginaliaOpacity }}
                aria-hidden
              >
                <img
                  key={`${selectedEditorCityMarginalia.id}-${selectedNote.id}`}
                  className="editor-page-marginalia-image"
                  src={selectedEditorCityMarginalia.src}
                  alt=""
                />
              </figure>
            )}
            <div className="document-scroll">
              <article className={`document-card ${atomUnderlinesVisible ? '' : 'hide-atom-underlines'} ${editorFocusModeVisual ? 'is-focus-mode' : ''} ${editorAuthenticWriterMode ? 'is-authentic-writer' : ''}`}>
                {undoNotice && (
                  <div className="notice notice-with-action">
                    <span>{undoNotice.message}</span>
                    <button type="button" onClick={undoNotice.action}>Undo</button>
                  </div>
                )}
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
                    <LociEditor
                      editor={editor}
                      isFocusMode={editorFocusModeVisual}
                      shellRef={(node) => { blockEditorShellRef.current = node }}
                      className="template-rich-section"
                      label={<span>Appendix / body</span>}
                      draggedBlockId={draggedBlockId}
                      imageCropEditing={imageCropEditing}
                      imageCropDragging={imageCropDragging}
                      blockControls={renderBlockControls()}
                      formatSideControls={renderFormatSideControls()}
                      blockDropOverlay={renderBlockDropOverlay()}
                      onClick={handleBlockControlsClick}
                      onPointerDown={handleEditorPointerDown}
                      onPointerMove={handleBlockEditorPointerMove}
                      onPointerLeave={handleBlockEditorPointerLeave}
                      onPointerUp={handleImageCropPointerEnd}
                      onPointerCancel={handleImageCropPointerEnd}
                      onDragStart={handleBlockDragStart}
                      onDragOver={handleBlockDropOverlayDragOver}
                      onDrop={handleBlockDropOverlayDrop}
                      onDragEnd={handleBlockDragEnd}
                    />
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
                    <LociEditor
                      editor={editor}
                      isFocusMode={editorFocusModeVisual}
                      shellRef={(node) => { blockEditorShellRef.current = node }}
                      className="template-rich-section"
                      label={<span>Notes</span>}
                      draggedBlockId={draggedBlockId}
                      imageCropEditing={imageCropEditing}
                      imageCropDragging={imageCropDragging}
                      blockControls={renderBlockControls()}
                      formatSideControls={renderFormatSideControls()}
                      blockDropOverlay={renderBlockDropOverlay()}
                      onClick={handleBlockControlsClick}
                      onPointerDown={handleEditorPointerDown}
                      onPointerMove={handleBlockEditorPointerMove}
                      onPointerLeave={handleBlockEditorPointerLeave}
                      onPointerUp={handleImageCropPointerEnd}
                      onPointerCancel={handleImageCropPointerEnd}
                      onDragStart={handleBlockDragStart}
                      onDragOver={handleBlockDropOverlayDragOver}
                      onDrop={handleBlockDropOverlayDrop}
                      onDragEnd={handleBlockDragEnd}
                    />
                  </div>
                )}
                {selectedTemplateData?.kind === 'slideshow' && (
                  <div className="template-editor slideshow-editor">
                    <div className="slide-strip scroll-hover">
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
                          <LociEditor
                            editor={editor}
                            isFocusMode={editorFocusModeVisual}
                            shellRef={(node) => { blockEditorShellRef.current = node }}
                            draggedBlockId={draggedBlockId}
                            imageCropEditing={imageCropEditing}
                            imageCropDragging={imageCropDragging}
                            blockControls={renderBlockControls()}
                            formatSideControls={renderFormatSideControls()}
                            blockDropOverlay={renderBlockDropOverlay()}
                            onClick={handleBlockControlsClick}
                            onPointerDown={handleEditorPointerDown}
                            onPointerMove={handleBlockEditorPointerMove}
                            onPointerLeave={handleBlockEditorPointerLeave}
                            onPointerUp={handleImageCropPointerEnd}
                            onPointerCancel={handleImageCropPointerEnd}
                            onDragStart={handleBlockDragStart}
                            onDragOver={handleBlockDropOverlayDragOver}
                            onDrop={handleBlockDropOverlayDrop}
                            onDragEnd={handleBlockDragEnd}
                          />
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
                  <LociEditor
                    editor={editor}
                    isFocusMode={editorFocusModeVisual}
                    shellRef={(node) => { blockEditorShellRef.current = node }}
                    draggedBlockId={draggedBlockId}
                    imageCropEditing={imageCropEditing}
                    imageCropDragging={imageCropDragging}
                    blockControls={renderBlockControls()}
                    formatSideControls={renderFormatSideControls()}
                    blockDropOverlay={renderBlockDropOverlay()}
                    onClick={handleBlockControlsClick}
                    onPointerDown={handleEditorPointerDown}
                    onPointerMove={handleBlockEditorPointerMove}
                    onPointerLeave={handleBlockEditorPointerLeave}
                    onPointerUp={handleImageCropPointerEnd}
                    onPointerCancel={handleImageCropPointerEnd}
                    onDragStart={handleBlockDragStart}
                    onDragOver={handleBlockDropOverlayDragOver}
                    onDrop={handleBlockDropOverlayDrop}
                    onDragEnd={handleBlockDragEnd}
                  />
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
                    <div className="block-picker-list scroll-hover">
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
            </div>
            <EditorBottomToolbar
              wrapRef={floatingEditorWrapRef}
              activePanel={activeEditorPanel}
              atomUnderlinesVisible={atomUnderlinesVisible}
              editorFocusMode={editorFocusMode}
              editorAuthenticWriterMode={editorAuthenticWriterMode}
              aiPromptFocused={aiPromptFocused}
              aiRunning={aiRunning}
              activeAICommand={activeAICommand}
              visibleAICommand={visibleAICommand}
              aiPrompt={aiPrompt}
              aiPromptInputRef={aiPromptInputRef}
              aiPromptHintVisible={aiPromptHintVisible}
              aiPromptHint={aiPromptHint}
              highlighterArmed={highlighterArmed}
              highlighterColor={userSettings.highlighterColor || DEFAULT_HIGHLIGHTER_COLOR}
              highlightPaletteOpen={highlightPaletteOpen}
              highlighterColors={HIGHLIGHTER_COLORS}
              onToggleAtomUnderlines={() => setAtomUnderlinesVisible((visible) => !visible)}
              onToggleFocusMode={() => setEditorFocusMode((enabled) => !enabled)}
              onToggleAuthenticWriterMode={() => setEditorAuthenticWriterMode((enabled) => !enabled)}
              onOpenNoteHistory={() => void openNoteHistory()}
              onExportPdf={() => void exportNotePdf(selectedNote, selectedProject)}
              onExportDocx={() => void exportNoteDocx(selectedNote, selectedProject, atoms)}
              onDeleteNote={() => void deleteNote()}
              onAtomise={atomiseSelection}
              onToggleHighlight={() => toggleHighlight()}
              onToggleHighlightPalette={() => setHighlightPaletteOpen((open) => !open)}
              onSelectHighlightColor={selectHighlighterColor}
              onToggleFormat={() => setActiveEditorPanel((panel) => (panel === 'format' ? null : 'format'))}
              onToggleMore={() => setActiveEditorPanel((panel) => (panel === 'more' ? null : 'more'))}
              onPromptMouseDown={() => {
                const range = captureAIContextRange()
                if (editor) editor.view.dispatch(editor.state.tr.setMeta(aiSelectionHighlightKey, { range }))
              }}
              onPromptFocus={() => {
                const range = captureAIContextRange()
                if (editor) editor.view.dispatch(editor.state.tr.setMeta(aiSelectionHighlightKey, { range }))
                setAiPromptFocused(true)
                setActiveEditorPanel(null)
              }}
              onPromptBlur={() => {
                setAiPromptFocused(false)
                if (!aiRunning) clearAIContextRange()
              }}
              onPromptChange={(event) => {
                setAiPrompt(event.target.value)
                if (event.target.value.trim().toLowerCase() !== aiPromptHintDismissedFor) {
                  setAiPromptHintDismissedFor('')
                }
              }}
              onPromptKeyDown={(event) => {
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
              onDismissPromptHint={(event) => {
                event.preventDefault()
                setAiPromptHintVisible(false)
                setAiPromptHintDismissedFor(aiPrompt.trim().toLowerCase())
              }}
            />
            {authorshipMenu && (
              <div
                className="authorship-popover"
                style={{ top: authorshipMenu.top, left: authorshipMenu.left }}
                role="menu"
                aria-label="Mark selected text"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button type="button" role="menuitem" onClick={markSelectionAsCopied}>
                  Mark as Copied
                </button>
                <button type="button" role="menuitem" onClick={clearCopiedMark}>
                  Clear Copied Mark
                </button>
              </div>
            )}
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
              <h2 id="format-dialog-title" className="visually-hidden">
                Formatting and blocks
              </h2>
              <div className="format-dialog-search" onMouseDown={(event) => event.stopPropagation()}>
                <Search size={18} aria-hidden />
                <input
                  ref={formatDialogSearchRef}
                  type="text"
                  role="searchbox"
                  value={formatDialogQuery}
                  onChange={(event) => setFormatDialogQuery(event.target.value)}
                  placeholder="Search formats…"
                  aria-label="Filter format options"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="format-dialog-scroll scroll-hover">
                <div className="format-dialog-grid">
                  {formatDialogSections.length === 0 ? (
                    <p className="format-dialog-empty">No matches.</p>
                  ) : (
                    formatDialogSections.map(({ group, options }) => (
                      <section className="format-option-section" key={group}>
                        <span>{group}</span>
                        <div className="format-option-grid">
                          {options.map((option) => {
                            const Icon = option.icon
                            const aria = option.ariaLabel ?? `${option.label}. ${option.description}`
                            return (
                              <button
                                type="button"
                                key={option.id}
                                aria-label={aria}
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
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </div>
              <footer>
                <button type="button" onClick={() => setActiveEditorPanel(null)}>Cancel</button>
              </footer>
            </section>
          </div>
        )}

        {activeView === 'projects' && (
          <section className="main-pane compact-pane scroll-hover">
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
                openNote={openNote}
                newNote={() => openTemplateChooser(openedProject.id)}
                renameNote={(noteId, title) => void persistNote({ title }, noteId)}
                deleteProject={() => void deleteProject(openedProject.id)}
                updateDescription={(description) => void updateProjectDescription(openedProject.id, description)}
                updateName={(name) => void updateProjectName(openedProject.id, name)}
                back={() => setSelectedProjectId('')}
                formatDay={formatDay}
              />
            ) : (
              <>
                <PageHeader
                  title="Projects"
                  action={<button type="button" onClick={createProject}><Plus size={17} /> Add project</button>}
                />
                <div className="project-hub">
                  {localDatabaseNeedsRepair && (
                    <section className="project-empty-state">
                      <h2>Local database needs attention.</h2>
                      <p>{localLoadIssues[0] ?? 'Some local workspace data could not load cleanly.'}</p>
                      <button type="button" onClick={() => void repairLocalDatabase()}>
                        Repair local database
                      </button>
                    </section>
                  )}
                  {!starterWorkspaceVisible && (
                    <section className="project-empty-state">
                      <h2>{projects.length || unassignedNotes.length ? 'Onboarding files missing.' : 'No projects yet.'}</h2>
                      <p>Restore the onboarding workspace with guide notes, projects, atoms, and writing examples.</p>
                      <button type="button" onClick={() => void seedStarterWorkspace()}>
                        Restore onboarding files
                      </button>
                    </section>
                  )}
                  {projectCards.length > 0 && (
                    <div className="project-card-grid">
                      {projectCards.map(({ project, notes: projectNotes, recentNotes }) => {
                        const isDropActive = dragOverProjectId === project.id
                        const projectAccent = projectDisplayColor(project)
                        const projectCardStyle = {
                          '--project-accent': projectAccent,
                          '--project-accent-soft': hexToRgba(projectAccent, 0.14),
                          '--project-accent-wash': hexToRgba(projectAccent, 0.11),
                          '--project-accent-card': hexToRgba(projectAccent, 0.075),
                          '--project-accent-hover': hexToRgba(projectAccent, 0.18),
                        } as CSSProperties
                        const projectDescription = project.description?.trim() || 'No description yet'
                        const openProject = () => {
                          if (Date.now() < suppressProjectNavUntilRef.current) return
                          setSelectedProjectId(project.id)
                        }
                        return (
                          <article
                            key={project.id}
                            className={`project-card ${draggedNoteIds.length ? 'is-drop-target' : ''} ${isDropActive ? 'is-drop-active' : ''}`}
                            style={projectCardStyle}
                            onDragOver={handleNoteDropTargetDragOver}
                            onDragEnter={() => setDragOverProjectId(project.id)}
                            onDragLeave={() => setDragOverProjectId((current) => (current === project.id ? '' : current))}
                            onDrop={(event) => assignNoteToProjectDrop(event, project.id)}
                          >
                            <button
                              type="button"
                              className="project-card-open"
                              onClick={openProject}
                              aria-label={`Open ${project.name}`}
                              title={project.name}
                            >
                              <span className="project-card-heading">
                                <span>
                                  <strong title={project.name}>{project.name}</strong>
                                </span>
                              </span>
                              <p title={projectDescription}>{projectDescription}</p>
                            </button>
                            <div className="project-card-menu">
                              {project.pinnedAt && (
                                <span className="project-pin-indicator" aria-label="Pinned project" title="Pinned project">
                                  <Pin size={15} aria-hidden />
                                </span>
                              )}
                              <button
                                type="button"
                                className="project-card-menu-trigger"
                                aria-label={`More options for ${project.name}`}
                                aria-expanded={openProjectMenuId === project.id}
                                onPointerDown={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setOpenProjectMenuId((current) => (current === project.id ? '' : project.id))
                                }}
                              >
                                <MoreVertical size={18} aria-hidden />
                              </button>
                              {openProjectMenuId === project.id && (
                                <div
                                  className="project-card-menu-popover"
                                  role="menu"
                                  aria-label={`${project.name} options`}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="project-card-menu-action"
                                    onClick={() => void toggleProjectPinned(project)}
                                  >
                                    {project.pinnedAt ? 'Unpin project' : 'Pin project'}
                                  </button>
                                  <span>Project colour</span>
                                  <div className="project-color-swatches" role="group" aria-label="Project colour">
                                    {PROJECT_COLORS.map((color) => (
                                      <button
                                        type="button"
                                        key={color}
                                        className={project.color?.toLowerCase() === color.toLowerCase() ? 'is-active' : ''}
                                        style={{ background: color }}
                                        aria-label={`Use project colour ${color}`}
                                        onClick={() => void updateProjectColor(project.id, color)}
                                      />
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    className="project-card-menu-action"
                                    onClick={() => {
                                      setOpenProjectMenuId('')
                                      void duplicateProject(project)
                                    }}
                                  >
                                    Duplicate project
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="project-card-notes" aria-label={`${project.name} recent notes`}>
                              {recentNotes.length ? (
                                recentNotes.map((note) => {
                                  const NoteTypeIcon = noteTemplateIcons[note.templateId ?? 'blank']
                                  const noteTitle = note.title || 'Untitled Note'
                                  return (
                                    <button
                                      type="button"
                                      key={note.id}
                                      className="project-card-note"
                                      aria-label={`Open ${noteTitle}`}
                                      title={noteTitle}
                                      onClick={() => {
                                        setSelectedNoteIds([])
                                        openNote(note.id)
                                      }}
                                    >
                                      <NoteTypeIcon size={15} aria-hidden />
                                      <span>
                                        <strong title={noteTitle}>{noteTitle}</strong>
                                        <small>{formatDay(note.updatedAt)}</small>
                                      </span>
                                    </button>
                                  )
                                })
                              ) : (
                                <p className="project-card-empty">No notes yet.</p>
                              )}
                            </div>
                            <div className="project-card-footer">
                              {projectNotes.length > RECENT_PROJECT_NOTE_LIMIT ? (
                                <button type="button" className="project-card-view-all" onClick={openProject}>
                                  View all {projectNotes.length}
                                </button>
                              ) : (
                                <span>{projectNotes[0] ? `Updated ${formatDay(projectNotes[0].updatedAt)}` : 'Ready for notes'}</span>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                  {unassignedNotes.length > 0 && (
                    <section className="project-loose-notes-list" aria-label="Unsorted files">
                      <span className="project-section-label">Unsorted files</span>
                      {unassignedNotes.map((note) => {
                        const isSelected = selectedNoteIds.includes(note.id)
                        const isDragging = draggedNoteIds.includes(note.id)
                        const noteTitle = note.title || 'Untitled Note'
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
                                openNote(note.id)
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
                              openNote(note.id)
                            }}
                          >
                            <span className="project-row-main">
                              <strong title={noteTitle}>{noteTitle}</strong>
                            </span>
                            <span className="project-loose-note-menu">
                              <button
                                type="button"
                                className="project-loose-note-menu-trigger"
                                aria-label={`More options for ${noteTitle}`}
                                aria-expanded={openLooseNoteMenuId === note.id}
                                onPointerDown={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setOpenLooseNoteMenuId((current) => (current === note.id ? '' : note.id))
                                }}
                              >
                                <MoreVertical size={18} aria-hidden />
                              </button>
                              {openLooseNoteMenuId === note.id && (
                                <span
                                  className="project-loose-note-menu-popover"
                                  role="menu"
                                  aria-label={`${noteTitle} options`}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="project-card-menu-action"
                                    onClick={() => void duplicateNote(note)}
                                  >
                                    Duplicate note
                                  </button>
                                  <button
                                    type="button"
                                    className="project-card-menu-action is-danger"
                                    onClick={() => {
                                      setOpenLooseNoteMenuId('')
                                      void deleteNote(note)
                                    }}
                                  >
                                    Delete note
                                  </button>
                                </span>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </section>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {activeView === 'community' && (
          <CommunityView
            searchQuery={communitySearchQuery}
            searchResults={communitySearchResults}
            canAddRecipients={Boolean(authSession.accountId)}
            communityTarget={communityTarget}
            pinnedRecipientIds={userSettings.pinnedCommunityRecipientIds}
            friendships={friendships}
            friendGroups={friendGroups}
            selectedFriend={selectedCommunityFriend}
            selectedGroup={selectedCommunityGroup}
            selectedNote={selectedNote}
            selectedShares={selectedCommunityShares}
            notes={notes}
            onSearchQueryChange={setCommunitySearchQuery}
            onSearch={() => void searchCommunityUsers()}
            onAddSearchResult={(result) => void addCommunitySearchResult(result)}
            onCreateGroup={openCreateGroupDialog}
            onSelectTarget={setCommunityTarget}
            onTogglePinnedTarget={togglePinnedCommunityRecipient}
            onAcceptFriend={(friendshipId) => void acceptCommunityFriend(friendshipId)}
            onRejectFriend={(friendshipId) => void rejectCommunityFriend(friendshipId)}
            onRemoveFriend={(friendshipId) => void removeCommunityFriend(friendshipId)}
            onSendNote={(permission, noteId) => void createTargetedShareForSelectedNote(permission, noteId)}
            onCreateCollaboration={(noteId) => void createCollaborationForSelectedNote(noteId)}
            formatDay={formatDay}
          />
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
                    {isSetWorkspace(atomSubView) ? 'Sets' : 'Atoms'}
                    <ChevronDown size={18} aria-hidden />
                  </button>
                  {atomHeadingMenuOpen && (
                    <div
                      className="atoms-title-menu"
                      role="menu"
                      data-highlight={atomHeadingHoverTarget ?? (isSetWorkspace(atomSubView) ? 'sets' : 'atoms')}
                      onPointerLeave={() => setAtomHeadingHoverTarget(null)}
                    >
                      <span className="atoms-title-menu-highlight" aria-hidden />
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={atomSubView === 'atoms'}
                        className={atomSubView === 'atoms' ? 'is-active' : ''}
                        onPointerEnter={() => setAtomHeadingHoverTarget('atoms')}
                        onFocus={() => setAtomHeadingHoverTarget('atoms')}
                        onBlur={() => setAtomHeadingHoverTarget(null)}
                        onClick={() => switchAtomWorkspace('atoms')}
                      >
                        <span>Atoms</span>
                        <small>Browse and flip atom cards</small>
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSetWorkspace(atomSubView)}
                        className={isSetWorkspace(atomSubView) ? 'is-active' : ''}
                        onPointerEnter={() => setAtomHeadingHoverTarget('sets')}
                        onFocus={() => setAtomHeadingHoverTarget('sets')}
                        onBlur={() => setAtomHeadingHoverTarget(null)}
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
                  {atomSubView === 'set-edit' && (
                    <button className="atoms-select-action" type="button" onClick={() => {
                      stopActiveStudySession()
                      setAtomSubView('sets')
                    }}>
                      <ArrowLeft size={15} />
                      Back to sets
                    </button>
                  )}
                </div>
              }
            />
            <div className="atoms-page">
              {(atomSubView === 'set-open' || atomSubView === 'study' || atomSubView === 'match' || atomSubView === 'quiz-setup' || atomSubView === 'quiz') && (
                <div className="flashcard-back-row">
                  <button type="button" onClick={() => {
                    stopActiveStudySession()
                    setAtomSubView('sets')
                  }}>
                    <ArrowLeft size={15} aria-hidden />
                    Back to sets
                  </button>
                </div>
              )}

              {atomSubView === 'atoms' && (
                <VirtualGrid
                  className="atom-card-grid atom-card-grid--virtual"
                  items={filteredAtomCards}
                  minItemWidth={320}
                  rowHeight={190}
                  overscan={4}
                  ariaLabel="Atoms"
                  renderItem={(card) => {
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
                  }}
                />
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
                            if (setAtoms.length) openFlashcardSet(set)
                          }}
                          onKeyDown={(event) => {
                            if (!setAtoms.length) return
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openFlashcardSet(set)
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
                            {Boolean(set.totalStudyMs) && <span>{formatDuration(set.totalStudyMs ?? 0)} studied</span>}
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
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void resetFlashcardSetStudyProgress(set)
                                }}
                              >
                                Reset
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
                    <div className="flashcard-atom-picker-list scroll-hover">
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

              {atomSubView === 'set-open' && studyingFlashcardSet && (
                <div className="flashcard-set-open">
                  <section className="flashcard-set-stats" aria-label="Set study stats">
                    <div>
                      <span>Cards</span>
                      <strong>{studyingSetAtoms.length}</strong>
                    </div>
                    <div>
                      <span>Last studied</span>
                      <strong>{studyingFlashcardSet.lastStudiedAt ? formatDay(studyingFlashcardSet.lastStudiedAt) : 'Not yet'}</strong>
                    </div>
                    <div>
                      <span>Total study</span>
                      <strong>{formatDuration(studyingFlashcardSet.totalStudyMs ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Fastest match</span>
                      <strong>{studyingFlashcardSet.matchBestMs ? formatTimer(studyingFlashcardSet.matchBestMs) : 'No time'}</strong>
                    </div>
                    <div>
                      <span>Avg match</span>
                      <strong>{matchAverageMs ? formatTimer(matchAverageMs) : 'No time'}</strong>
                    </div>
                    <button type="button" onClick={() => void resetFlashcardSetStudyProgress(studyingFlashcardSet)}>
                      Reset study progress
                    </button>
                  </section>
                  <div className="flashcard-mode-picker">
                    <header>
                      <span>Choose study mode</span>
                      <h3>{studyingFlashcardSet.name}</h3>
                      {studyingFlashcardSet.description?.trim() && <p>{studyingFlashcardSet.description.trim()}</p>}
                    </header>
                    <div className="flashcard-mode-grid">
                      <button type="button" onClick={() => void startFlashcardStudy(studyingFlashcardSet)}>
                        <Brain size={18} aria-hidden />
                        <span>Flashcards</span>
                        <small>Review due cards with Again, Hard, Good, Easy.</small>
                      </button>
                      <button type="button" onClick={() => startMatchStudy(studyingFlashcardSet)}>
                        <Layers3 size={18} aria-hidden />
                        <span>Match</span>
                        <small>Pair terms with definitions in a shuffled board.</small>
                      </button>
                      <button type="button" onClick={() => openQuizSetup(studyingFlashcardSet)}>
                        <Sparkles size={18} aria-hidden />
                        <span>Quiz</span>
                        <small>Set up a custom exam before AI generates it.</small>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {atomSubView === 'quiz-setup' && studyingFlashcardSet && (
                <div className="flashcard-quiz-setup">
                  <header>
                    <span>{studyingFlashcardSet.name}</span>
                    <h3>Set up your test</h3>
                    <p>Choose the exam settings first. Loci will generate the quiz after you start.</p>
                  </header>
                  <section className="flashcard-quiz-setup-card">
                    <div className="flashcard-quiz-setting-row">
                      <div>
                        <strong>Questions</strong>
                        <small>(Max. 10)</small>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={quizSetupAvailableCount}
                        value={quizSetupQuestionCount}
                        onChange={(event) => {
                          const nextCount = Number(event.target.value)
                          setQuizSetupOptions((current) => ({
                            ...current,
                            questionCount: Math.min(quizSetupAvailableCount, Math.max(1, Number.isFinite(nextCount) ? nextCount : 1)),
                          }))
                        }}
                      />
                    </div>
                    <div className="flashcard-quiz-setting-row">
                      <strong>Answer with</strong>
                      <div className="flashcard-quiz-answer-dropdown" ref={quizAnswerDropdownRef}>
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={quizAnswerMenuOpen}
                          onClick={() => setQuizAnswerMenuOpen((open) => !open)}
                        >
                          <span>{formatQuizAnswerWith(quizSetupOptions.answerWith)}</span>
                          <ChevronDown size={15} aria-hidden />
                        </button>
                        {quizAnswerMenuOpen && (
                          <div className="flashcard-quiz-answer-menu" role="listbox" aria-label="Answer with">
                            {(['term', 'definition', 'both'] as QuizAnswerWith[]).map((option) => (
                              <button
                                type="button"
                                key={option}
                                role="option"
                                aria-selected={quizSetupOptions.answerWith === option}
                                className={quizSetupOptions.answerWith === option ? 'is-active' : ''}
                                onClick={() => {
                                  setQuizSetupOptions((current) => ({ ...current, answerWith: option }))
                                  setQuizAnswerMenuOpen(false)
                                }}
                              >
                                {formatQuizAnswerWith(option)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                  <section className="flashcard-quiz-setup-card">
                    <div className="flashcard-quiz-setup-heading">
                      <div>
                        <strong>Question Types</strong>
                      </div>
                      <small>Choose any mix.</small>
                    </div>
                    <div className="flashcard-quiz-toggle-list">
                      <label>
                        <span>
                          <strong>True/False</strong>
                          <small>Decide whether a statement is correct.</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={quizSetupOptions.includeTrueFalse}
                          onChange={(event) => setQuizSetupOptions((current) => ({ ...current, includeTrueFalse: event.target.checked }))}
                        />
                      </label>
                      <label>
                        <span>
                          <strong>Multiple choice</strong>
                          <small>Pick from card-style options.</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={quizSetupOptions.includeMultipleChoice}
                          onChange={(event) => setQuizSetupOptions((current) => ({ ...current, includeMultipleChoice: event.target.checked }))}
                        />
                      </label>
                      <label>
                        <span>
                          <strong>Matching</strong>
                          <small>Pair related terms and definitions.</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={quizSetupOptions.includeMatching}
                          onChange={(event) => setQuizSetupOptions((current) => ({ ...current, includeMatching: event.target.checked }))}
                        />
                      </label>
                      <label>
                        <span>
                          <strong>Written</strong>
                          <small>Type your answer without typo checking.</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={quizSetupOptions.includeWritten}
                          onChange={(event) => setQuizSetupOptions((current) => ({ ...current, includeWritten: event.target.checked }))}
                        />
                      </label>
                    </div>
                  </section>
                  <div className="flashcard-study-controls">
                    <button type="button" onClick={() => setAtomSubView('set-open')}>Back to modes</button>
                    <button
                      type="button"
                      className="primary"
                      disabled={!quizSetupCanStart || quizGenerating}
                      onClick={() => void startQuizStudy(studyingFlashcardSet)}
                    >
                      {quizGenerating ? 'Starting...' : 'Start quiz'}
                    </button>
                  </div>
                </div>
              )}

              {atomSubView === 'study' && (
                <div className="flashcard-study">
                  <header>
                    <div>
                      <span>{studyingFlashcardSet?.name ?? 'Study set'}</span>
                      <h3>{studyMode === 'flashcards' && studyRoundComplete ? 'Round complete' : studyAtoms.length ? `${studyIndex + 1} of ${studyAtoms.length}` : 'No cards to study'}</h3>
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
                      <span>{studyKnownCount} scheduled</span>
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
                      <section className="flashcard-hint-panel">
                        <button
                          type="button"
                          disabled={aiHintRunningAtomId === activeStudyAtom.id}
                          onClick={() => void generateAIHint(activeStudyAtom)}
                        >
                          <Sparkles size={14} aria-hidden />
                          {activeStudyHint ? 'Refresh AI hint' : aiHintRunningAtomId === activeStudyAtom.id ? 'Making hint...' : 'AI hint'}
                        </button>
                        {activeStudyHint && <p>{activeStudyHint}</p>}
                      </section>
                      <div className="flashcard-study-controls">
                        <button type="button" aria-label="Previous card" onClick={() => moveStudyCard(-1)}>{'<'}</button>
                        <button type="button" onClick={() => void markStudyCard('again')}>Again</button>
                        <button type="button" onClick={() => void markStudyCard('hard')}>Hard</button>
                        <button type="button" className="primary" onClick={() => void markStudyCard('good')}>Good</button>
                        <button type="button" onClick={() => void markStudyCard('easy')}>Easy</button>
                        <button type="button" aria-label="Next card" onClick={() => moveStudyCard(1)}>{'>'}</button>
                      </div>
                    </>
                  ) : studyRoundComplete ? (
                    <section className="flashcard-study-complete">
                      <span>Session</span>
                      <h3>All cards known</h3>
                      <p>
                        You scheduled this round. Restart when you want another pass.
                      </p>
                      <button type="button" onClick={() => void restartStudyRound()}>Restart round</button>
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

              {atomSubView === 'match' && (
                <div className="flashcard-study flashcard-match">
                  <header>
                    <div>
                      <span>{studyingFlashcardSet?.name ?? 'Match set'}</span>
                      <h3>{matchComplete ? 'Matched' : 'Match terms to definitions'}</h3>
                    </div>
                    <div className="flashcard-study-options">
                      <button type="button" onClick={() => studyingFlashcardSet && startMatchStudy(studyingFlashcardSet)}>
                        Restart
                      </button>
                    </div>
                  </header>
                  <div className="flashcard-study-progress" aria-label="Match progress">
                    <span>{matchMatchedAtomIds.length} of {studyingSetAtoms.length} matched</span>
                    <span>Time {formatTimer(studyElapsedMs)}</span>
                    {Boolean(studyingFlashcardSet?.matchBestMs) && <span>Fastest {formatTimer(studyingFlashcardSet?.matchBestMs ?? 0)}</span>}
                    {Boolean(matchAverageMs) && <span>Avg {formatTimer(matchAverageMs)}</span>}
                    <span>{matchMistakes} mistake{matchMistakes === 1 ? '' : 's'}</span>
                  </div>
                  <div className="flashcard-match-board" aria-label="Match cards">
                    {matchTiles.map((tile) => (
                      <button
                        type="button"
                        key={tile.id}
                        className={`${matchSelection?.id === tile.id ? 'is-selected' : ''} ${matchMatchedAtomIds.includes(tile.atomId) ? 'is-matched' : ''}`}
                        onClick={() => chooseMatchTile(tile)}
                      >
                        <span>{tile.text}</span>
                      </button>
                    ))}
                  </div>
                  {matchComplete && (
                    <section className="flashcard-study-complete">
                      <span>Session</span>
                      <h3>All pairs matched</h3>
                      <p>You matched every term in this set in {formatTimer(studyElapsedMs)}.</p>
                      <button type="button" onClick={() => {
                        void persistStudySession()
                        if (studyingFlashcardSet) startMatchStudy(studyingFlashcardSet)
                      }}>Play again</button>
                    </section>
                  )}
                </div>
              )}

              {atomSubView === 'quiz' && (
                <div className="flashcard-study flashcard-quiz">
                  <header>
                    <div>
                      <span>{studyingFlashcardSet?.name ?? 'Quiz set'}</span>
                      <h3>{quizGenerating ? 'Generating quiz' : quizMarked ? 'Quiz results' : 'AI quiz'}</h3>
                    </div>
                    <div className="flashcard-study-options">
                      {studyingFlashcardSet && quizMarked && (
                        <>
                          <button type="button" onClick={retakeQuiz}>Retake same quiz</button>
                          <button type="button" onClick={() => startNewQuizSetup(studyingFlashcardSet)}>New quiz</button>
                        </>
                      )}
                    </div>
                  </header>
                  <div className="flashcard-study-progress" aria-label="Quiz progress">
                    <span>{quizAnsweredCount} of {quizQuestionCount} answered</span>
                    {activeQuiz && <span>Generated {formatDay(activeQuiz.generatedAt)}</span>}
                    {quizMarked && quizResult && <span>Score {quizResult.score} of {quizResult.total}</span>}
                  </div>
                  {quizGenerating && (
                    <section className="flashcard-empty-state">
                      <Sparkles size={22} aria-hidden />
                      <h3>Building a fresh quiz</h3>
                      <p>Loci is using your setup choices across every card in this set.</p>
                    </section>
                  )}
                  {!quizGenerating && activeQuiz && (
                    <div className="flashcard-quiz-list">
                      {quizResult?.marking && (
                        <section className="flashcard-empty-state">
                          <Sparkles size={22} aria-hidden />
                          <h3>Marking quiz</h3>
                          <p>Loci is checking your answers and preparing your score.</p>
                        </section>
                      )}
                      {quizMarked && quizResult && (
                        <section className="flashcard-quiz-result">
                          <span>Score</span>
                          <h3>{quizResult.score} / {quizResult.total}</h3>
                          <p>{Math.round((quizResult.score / Math.max(1, quizResult.total)) * 100)}% correct</p>
                          <div>
                            <button type="button" onClick={retakeQuiz}>Retake same quiz</button>
                            {studyingFlashcardSet && <button type="button" className="primary" onClick={() => startNewQuizSetup(studyingFlashcardSet)}>New quiz</button>}
                          </div>
                        </section>
                      )}
                      {activeQuiz.questions.map((question, index) => {
                        const answer = quizAnswers[question.id] ?? {}
                        const result = quizResult?.resultsByQuestionId[question.id]
                        return (
                          <section className={`flashcard-quiz-question ${quizMarked && result?.correct ? 'is-correct' : ''} ${quizMarked && result && !result.correct ? 'is-incorrect' : ''}`} key={question.id}>
                            <span>Question {index + 1} · {formatQuizQuestionType(question.type)}</span>
                            <h4>{question.prompt}</h4>
                            {question.type === 'multiple-choice' ? (
                              <>
                                <div className="flashcard-quiz-choices">
                                  {question.choices.map((choice, choiceIndex) => (
                                    <button
                                      type="button"
                                      key={choice}
                                      disabled={quizMarked}
                                      className={`${answer.selectedChoice === choice ? 'is-selected' : ''} ${quizMarked && choice === question.answer ? 'is-correct-choice' : ''} ${quizMarked && answer.selectedChoice === choice && choice !== question.answer ? 'is-incorrect-choice' : ''}`}
                                      onClick={() => updateQuizAnswer(question.id, { selectedChoice: choice })}
                                    >
                                      <span>{String.fromCharCode(65 + choiceIndex)}</span>
                                      <strong>{choice}</strong>
                                    </button>
                                  ))}
                                </div>
                                {quizMarked && (
                                  <p className={result?.correct ? 'is-correct' : 'is-incorrect'}>
                                    Answer: {question.answer}. {question.explanation ?? ''}
                                  </p>
                                )}
                              </>
                            ) : question.type === 'true-false' ? (
                              <>
                                <div className="flashcard-quiz-choices flashcard-quiz-choices--boolean">
                                  {[true, false].map((choice) => (
                                    <button
                                      type="button"
                                      key={String(choice)}
                                      disabled={quizMarked}
                                      className={`${answer.trueFalseAnswer === choice ? 'is-selected' : ''} ${quizMarked && choice === question.answer ? 'is-correct-choice' : ''} ${quizMarked && answer.trueFalseAnswer === choice && choice !== question.answer ? 'is-incorrect-choice' : ''}`}
                                      onClick={() => updateQuizAnswer(question.id, { trueFalseAnswer: choice })}
                                    >
                                      <strong>{choice ? 'True' : 'False'}</strong>
                                    </button>
                                  ))}
                                </div>
                                {quizMarked && (
                                  <p className={result?.correct ? 'is-correct' : 'is-incorrect'}>
                                    Answer: {question.answer ? 'True' : 'False'}. {question.explanation ?? ''}
                                  </p>
                                )}
                              </>
                            ) : question.type === 'matching' ? (
                              <>
                                <div className="flashcard-quiz-matching">
                                  {question.pairs.map((pair) => (
                                    <label key={pair.left}>
                                      <span>{pair.left}</span>
                                      <select
                                        disabled={quizMarked}
                                        value={answer.matchingPairs?.[pair.left] ?? ''}
                                        onChange={(event) => updateQuizAnswer(question.id, {
                                          matchingPairs: { ...(answer.matchingPairs ?? {}), [pair.left]: event.target.value },
                                        })}
                                      >
                                        <option value="">Choose match</option>
                                        {question.pairs.map((option) => <option key={option.right} value={option.right}>{option.right}</option>)}
                                      </select>
                                    </label>
                                  ))}
                                </div>
                                {quizMarked && (
                                  <p className={result?.correct ? 'is-correct' : 'is-incorrect'}>
                                    Correct matches: {question.pairs.map((pair) => `${pair.left} -> ${pair.right}`).join('; ')}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <textarea
                                  value={answer.shortAnswer ?? ''}
                                  disabled={quizMarked}
                                  onChange={(event) => updateQuizAnswer(question.id, { shortAnswer: event.target.value })}
                                  placeholder="Write your answer..."
                                />
                                {quizMarked && (
                                  <p className={result?.correct ? 'is-correct' : 'is-incorrect'}>
                                    Expected: {question.expectedAnswer}. {result?.feedback ?? question.rubric}
                                  </p>
                                )}
                              </>
                            )}
                          </section>
                        )
                      })}
                      {!quizMarked && (
                        <div className="flashcard-study-controls">
                          <button
                            type="button"
                            className="primary"
                            disabled={!quizReadyToMark || quizResult?.marking}
                            onClick={() => void markQuiz()}
                          >
                            {quizResult?.marking ? 'Marking...' : 'Mark quiz'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {!quizGenerating && !activeQuiz && (
                    <section className="flashcard-empty-state">
                      <h3>No quiz generated yet</h3>
                      <p>Generate a quiz once AI is configured in Settings.</p>
                    </section>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {activeView === 'settings' && (
          <section className="main-pane compact-pane settings-pane scroll-hover">
            <PageHeader
              title="Settings"
              action={<button type="button" onClick={openProfileModal}><Settings size={17} /> Edit profile</button>}
            />
            <div className="settings-layout">
              <section className="settings-profile-strip">
                <div className="avatar" style={{ background: profileAvatarColor, color: avatarTextColor(profileAvatarColor) }}>{profileInitials}</div>
                <div>
                  <strong>{profileDisplayName}</strong>
                  <span>Local workspace profile · used for new notes</span>
                </div>
                <button type="button" onClick={openProfileModal}>Manage</button>
              </section>

              <section className="settings-card settings-account-card">
                <div className="settings-card-heading">
                  <Shield size={18} />
                  <div>
                    <h3>Online account</h3>
                    <p>Prepared for account profiles, profile pictures, and friending while notes stay local.</p>
                  </div>
                </div>
                <div className="settings-data-list">
                  <span><strong>{authSession.status}</strong> Session</span>
                  <span><strong>{accountStatusLabel}</strong> Account</span>
                  <span><strong>{acceptedFriendCount}</strong> Friends</span>
                  <span><strong>{pendingFriendCount}</strong> Pending requests</span>
                  <span><strong>{developerNotifications.length}</strong> Dev notifications cached</span>
                </div>
                <div className="settings-warning">
                  <Info size={16} />
                  <span>These controls use backend-neutral services now. A real provider can be connected later without making notes sync automatically.</span>
                </div>
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

              <section className="settings-card settings-grid-pair">
                <div className="settings-card-heading">
                  <Download size={18} />
                  <div>
                    <h3>App updates</h3>
                    <p>Signed desktop updates are delivered from GitHub Releases.</p>
                  </div>
                </div>
                <div className={`settings-update-status is-${updateState.status}`}>
                  <strong>
                    {updateState.status === 'available'
                      ? `Update ${updateState.version}`
                      : updateState.status === 'checking'
                        ? 'Checking'
                        : updateState.status === 'installing'
                          ? 'Installing'
                          : updateState.status === 'error'
                            ? 'Update check failed'
                            : 'Desktop updater'}
                  </strong>
                  <span>{updateState.message}</span>
                </div>
                <button
                  type="button"
                  className="settings-update-button"
                  disabled={updateState.status === 'checking' || updateState.status === 'installing'}
                  onClick={() => void checkForUpdates(true)}
                >
                  {updateState.status === 'checking'
                    ? 'Checking...'
                    : updateState.status === 'installing'
                      ? 'Installing...'
                      : 'Check for updates'}
                </button>
              </section>
            </div>
          </section>
        )}
      </section>

      {aiResult && (
        <AIResultDialog
          result={aiResult}
          selectedProjectName={selectedProject?.name}
          aiInstructionUpdating={aiInstructionUpdating}
          onClose={closeAIResult}
          onDraftChange={(patch) => setAiResult((current) => (current ? { ...current, ...patch } : current))}
          onPrimaryAction={() => {
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
          onDraftProjectInstructions={() => void draftProjectInstructionsFromAIResult()}
          onSaveProjectInstructions={(draft) => {
            if (!selectedProject) return
            void updateProjectDescription(selectedProject.id, draft)
            setAiResult((current) => (current ? { ...current, projectInstructionDraft: undefined } : current))
          }}
          onCopy={() => void copyToClipboard(aiResult.draftText)}
        />
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
                type="text"
                role="searchbox"
                value={searchQuery}
                placeholder="Search notes, projects, atoms…"
                autoComplete="off"
                aria-labelledby="global-search-title"
                aria-autocomplete="list"
                aria-controls="global-search-list"
                aria-activedescendant={searchHits[searchActiveIndex] ? `search-hit-${searchActiveIndex}` : undefined}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            {searchNormalized && (
              <div id="global-search-list" className="global-search-results" role="listbox" aria-label="Search results">
                {searchHits.length === 0 && <p className="global-search-empty">No results found</p>}
                <VirtualList
                  className="global-search-results-virtual"
                  items={searchRows}
                  rowHeight={52}
                  overscan={6}
                  renderItem={(row) => {
                    if (row.kind === 'section') {
                      return (
                        <div className="global-search-section-label" role="presentation">
                          {row.label}
                        </div>
                      )
                    }
                    const hit = row.hit
                    const index = row.hitIndex
                  return (
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
                            <span className="global-search-hit-meta">{noteIndexes.notesByProjectId.get(hit.project.id)?.length ?? 0} notes</span>
                          </>
                        )}
                        {hit.kind === 'atom' && (
                          <>
                            <span className="global-search-hit-icon" aria-hidden>
                              <AtomIcon size={16} />
                            </span>
                            <span className="global-search-hit-main global-search-hit-main--stacked">
                              <strong>{hit.atom.phrase}</strong>
                              <small>{truncateOneLine(hit.atom.definition, 120)}</small>
                            </span>
                          </>
                        )}
                      </button>
                  )
                  }}
                />
              </div>
            )}
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
          <section className="template-chooser-dialog scroll-hover" role="dialog" aria-modal="true" aria-labelledby="template-chooser-title" onMouseDown={(event) => event.stopPropagation()}>
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

      {groupDialogDraft && (
        <div
          className="modal-backdrop group-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setGroupDialogDraft(null)
          }}
        >
          <section
            className="app-dialog group-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void saveFriendGroupDialog()
              }}
            >
              <h2 id="group-dialog-title">Create group</h2>
              <p>Name the group and choose the accepted friends to include.</p>
              <label>
                Group name
                <input
                  value={groupDialogDraft.name}
                  onChange={(event) => setGroupDialogDraft((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder="Study circle"
                  autoFocus
                />
              </label>
              <div className="group-member-list" aria-label="Group members">
                {acceptedFriendships.length ? acceptedFriendships.map((friendship) => (
                  <label className="group-member-row" key={friendship.id}>
                    <input
                      type="checkbox"
                      checked={groupDialogDraft.memberAccountIds.includes(friendship.friendAccountId)}
                      onChange={() => toggleGroupDialogMember(friendship.friendAccountId)}
                    />
                    <span>
                      <strong>{friendship.friendDisplayName}</strong>
                      <small>{friendship.friendHandle ? `@${friendship.friendHandle}` : 'Connected'}</small>
                    </span>
                  </label>
                )) : (
                  <p className="group-member-empty">No accepted friends yet. You can create an empty group.</p>
                )}
              </div>
              <footer>
                <button type="button" onClick={() => setGroupDialogDraft(null)}>Cancel</button>
                <button type="submit" className="primary" disabled={!groupDialogDraft.name.trim()}>
                  Create group
                </button>
              </footer>
            </form>
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
                {appDialog.kind === 'confirm' && appDialog.secondaryLabel && appDialog.onSecondary && (
                  <button type="button" onClick={() => void submitAppDialogSecondary()}>
                    {appDialog.secondaryLabel}
                  </button>
                )}
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
            <ul className="note-history-list scroll-hover">
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
            <h2 id="atom-dialog-title" className="visually-hidden">
              Add term and meaning
            </h2>
            {atomDialog.mode === 'manual' && (
              <label>
                Term
                <input
                  value={atomDialog.phrase}
                  onChange={(event) => setAtomDialog({ ...atomDialog, phrase: event.target.value })}
                  autoFocus
                />
              </label>
            )}
            {atomDialog.mode === 'selection' && <div className="atom-dialog-phrase">{atomDialog.phrase}</div>}
            <label>
              Meaning
              <textarea
                value={atomDialog.definition}
                onChange={(event) => setAtomDialog({ ...atomDialog, definition: event.target.value })}
                autoFocus={atomDialog.mode === 'selection'}
              />
            </label>
            <div className="dialog-context">
              {(selectedProject?.name ?? openedProject?.name ?? 'Unassigned') === 'Unassigned'
                ? 'Project: Unassigned'
                : (selectedProject?.name ?? openedProject?.name ?? '')}
            </div>
            <footer>
              <button type="button" onClick={() => setAtomDialog(null)}>Cancel</button>
              <button type="button" className="primary" onClick={() => void saveAtomDialog()} disabled={!atomDialog.phrase.trim() || !atomDialog.definition.trim()}>Save</button>
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
            <h2 id="profile-dialog-title">{localProfile ? 'Profile' : 'Set up your profile'}</h2>
            <p>{localProfile ? 'Tune how your local workspace identifies you.' : 'Choose the name shown in your notes and sidebar.'}</p>
            <div className="profile-dialog-main">
              <div className="profile-preview">
                <div className="avatar profile-preview-avatar" style={{ background: profileDraft.avatarColor || DEFAULT_PROFILE_COLOR, color: avatarTextColor(profileDraft.avatarColor || DEFAULT_PROFILE_COLOR) }}>{normalizeInitials(profileDraft.initials || initialsFromName(profileDraft.displayName) || 'LN')}</div>
                <strong>{profileDraft.displayName.trim() || 'Your name'}</strong>
                  <span>{profileDraft.handle ? `@${profileDraft.handle}` : 'Local profile'}</span>
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
                        handle: current.handleEdited ? current.handle : createBaseHandleFromDisplayName(displayName),
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
                <label>
                  User tag
                  <div className="profile-tag-input">
                    <span>@</span>
                    <input
                      value={profileDraft.handle}
                      onChange={(event) => setProfileDraft((current) => ({
                        ...current,
                        handle: normalizeUserHandle(event.target.value),
                        handleEdited: true,
                      }))}
                      placeholder="yourtag"
                    />
                  </div>
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

function buildAtomCards(atoms: Atom[], noteIndexes: NoteIndexes, projectById: Map<string, Project>): AtomCard[] {
  return atoms.map((atom) => {
    const scopedProjectId = projectIdForAtom(atom)
    const linkedProjectIds = Array.from(noteIndexes.projectIdsByAtomId.get(atom.id) ?? [])
    const projectIds = Array.from(new Set([scopedProjectId, ...linkedProjectIds]))
    const noteCount = noteIndexes.noteIdsByAtomId.get(atom.id)?.size ?? 0
    const projectNames = projectIds.map((id) => projectById.get(id)?.name).filter(Boolean) as string[]
    return { atom: { ...atom, tags: atom.tags ?? [] }, noteCount, projectIds, projectNames }
  })
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

function applyBlockDrop(blocks: LociBlock[], intent: BlockDropIntent): LociBlock[] {
  if (intent.draggedId === intent.targetId) return blocks
  const nextBlocks = [...blocks]
  const draggedIndex = nextBlocks.findIndex((block) => block.id === intent.draggedId)
  const targetIndex = nextBlocks.findIndex((block) => block.id === intent.targetId)
  if (draggedIndex < 0 || targetIndex < 0) return blocks
  const [removed] = nextBlocks.splice(draggedIndex, 1)
  const nextTargetIndex = nextBlocks.findIndex((block) => block.id === intent.targetId)
  if (nextTargetIndex < 0) return blocks
  const insertIndex = intent.placement === 'above' ? nextTargetIndex : nextTargetIndex + 1
  nextBlocks.splice(insertIndex, 0, removed)
  return nextBlocks
}

function insertBlockRelative(blocks: LociBlock[], targetId: string, blockToInsert: LociBlock, placement: 'before' | 'after') {
  const nextBlocks = [...blocks]
  const targetIndex = nextBlocks.findIndex((block) => block.id === targetId)
  if (targetIndex < 0) return [...nextBlocks, blockToInsert]
  const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1
  nextBlocks.splice(insertIndex, 0, blockToInsert)
  return nextBlocks
}

function updateBlockById(blocks: LociBlock[], blockId: string, updater: (block: LociBlock) => LociBlock): LociBlock[] {
  let changed = false
  const next = blocks.map((block) => {
    if (block.id === blockId) {
      changed = true
      return updater(block)
    }

    return block
  })

  return changed ? next : blocks
}

function shuffleList<T>(items: T[]) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function formatQuizQuestionType(type: string) {
  if (type === 'multiple-choice') return 'Multiple choice'
  if (type === 'true-false') return 'True/False'
  if (type === 'matching') return 'Matching'
  return 'Written'
}

function normalizeFlashcardSet(set: FlashcardSet): FlashcardSet {
  return {
    ...set,
    atomIds: set.atomIds ?? [],
    totalStudyMs: Math.max(0, set.totalStudyMs ?? 0),
    lastStudyDurationMs: Math.max(0, set.lastStudyDurationMs ?? 0),
    studySessionCount: Math.max(0, set.studySessionCount ?? 0),
    matchBestMs: Math.max(0, set.matchBestMs ?? 0),
    matchTotalMs: Math.max(0, set.matchTotalMs ?? 0),
    matchSessionCount: Math.max(0, set.matchSessionCount ?? 0),
    aiHintsByAtomId: set.aiHintsByAtomId ?? {},
  }
}

function formatTimer(ms: number) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes}:${seconds.toString().padStart(2, '0')}`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatDuration(ms: number) {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60000)
  if (totalMinutes < 1) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours} hr`
  return `${hours} hr ${minutes} min`
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

function isBadProfileDisplayName(value: string | undefined) {
  return value === BAD_PROFILE_DISPLAY_NAME
}

function createBaseHandleFromDisplayName(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const [firstName] = words
  const lastInitial = words.length > 1 ? words[words.length - 1][0] : ''
  return normalizeUserHandle(`${firstName}${lastInitial}`).replace(/[._-]+/g, '')
}

async function createAvailableLocalHandle(value: string, currentAccountId?: string) {
  const base = normalizeUserHandle(value).replace(/[._-]+/g, '') || 'lociuser'
  const profiles = await friendService.searchAccounts(base)
  const taken = new Set(
    profiles
      .filter((profile) => profile.accountId !== currentAccountId)
      .map((profile) => normalizeUserHandle(profile.handle ?? ''))
  )
  if (!taken.has(base)) return base
  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const candidate = `${base}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}${Date.now().toString(36)}`
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
