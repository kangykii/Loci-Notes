/* eslint-disable react-hooks/set-state-in-effect */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject, SyntheticEvent, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { useEditor } from '@tiptap/react'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
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
  CheckSquare,
  Code2,
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
  List,
  ListOrdered,
  Layers3,
  LinkIcon,
  Maximize2,
  Minimize2,
  Minus,
  MoreVertical,
  Pin,
  Plus,
  Radical,
  RemoveFormatting,
  Search,
  Settings,
  Shield,
  Shuffle as ShuffleIcon,
  Sparkles,
  Table2,
  Trash2,
  Users,
  X as XIcon,
} from 'lucide-react'
import { AtomMark } from './AtomMark'
import { AuthorshipMark } from './AuthorshipMark'
import {
  appendNoteSnapshot,
  createId,
  db,
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
} from './db'
import { exportNoteDocx, exportNotePdf } from './exports'
import { requestAIText } from './ai/aiClient'
import { buildAIContextFromPolicy } from './ai/aiOrchestrator'
import type { AIContextDraftItem } from './ai/aiOrchestrator'
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
  parseAICodePayload,
  parseAILatexPayload,
  parseAIListPayload,
  parseAIQuotePayload,
  parseAITablePayload,
  parseAtomCandidates,
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
import { ModalBackdrop } from './components/dialogs/ModalBackdrop'
import { PageHeader } from './components/layout/PageHeader'
import { CommunityView } from './components/views/CommunityView'
import type { CommunityTarget } from './components/views/CommunityView'
import { ProjectDetail } from './components/views/ProjectDetail'
import { LociEditor } from './components/editor/LociEditor'
import { FormatSideControls } from './components/editor/FormatSideControls'
import { EditorBottomToolbar } from './components/editor/EditorBottomToolbar'
import { mountedEditorDom, useFocusModePlugin } from './components/editor/focusModePlugin'
import { sameBlockControls, useBlockGutter } from './components/editor/useBlockGutter'
import type { BlockControlRect, BlockDropTarget } from './components/editor/useBlockGutter'
import { VirtualGrid, VirtualList } from './components/virtual/VirtualList'
import {
  ActiveBlockHighlight,
  AISelectionHighlight,
  LociImage,
  LociLatex,
  LociQuote,
  TabIndent,
  aiSelectionHighlightKey,
} from './editor/extensions'
import type { EditorRange } from './editor/extensions'
import { applyAuthorshipToContent } from './editor/authorship'
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
  flattenLegacyLociBlocks,
  formatBlockTypeForBlock,
  imageBlockDoc,
  codeBlockDocFromData,
  codeDataFromNode,
  latexBlockDoc,
  latexDataFromNode,
  listBlockDocFromData,
  listDataFromNode,
  normalizeBlocksForContent,
  quoteAuthorNode,
  quoteBlockDocFromData,
  quoteDataFromNode,
  stripAtomMarks,
  tableBlockDocFromData,
  tableDataFromNode,
  textToEditorContent,
} from './editor/blocks'
import type { FormatBlockType, ImageAlignPreset, ListBlockType } from './editor/blocks'
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
import { getProfileGreeting, getProfileNextAction, getProfileProgressMessage } from './profile/profileMessages'
import { buildProfileStats } from './profile/profileStats'
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
import { surveyService } from './services/surveyService'
import type { SurveyPrompt } from './services/surveyService'
import { initialUpdateState, updateService } from './services/updateService'
import type { UpdateState } from './services/updateService'
import { isAllowedLinkUrl, sanitizeImageUrl, sanitizeLinkUrl } from './utils/urlValidation'
import { INK_READING_WOMAN, INK_WALKING_WOMAN, INK_WALKMAN_BOY } from './assets/marginalia/parts.generated'
import type { InkCharacter as InkCharacterAsset } from './assets/marginalia/parts.generated'
import { EDITOR_CITY_MARGINALIA } from './assets/marginalia/city.generated'
import { cityMarginaliaIndexForNote, editorMarginaliaOpacityFromText } from './marginalia/editorMarginalia'
import { useImageLoadCoordinator } from './marginalia/useImageLoadCoordinator'
import { getGreeting, getSubtagline, getTipByIndex } from './home/tips'
import './App.css'
import './components/editor/formatBlocks.css'
import './styles/marginalia.css'

type IconComponent = React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

type View = 'home' | 'editor' | 'projects' | 'community' | 'atoms' | 'settings'
type AtomSubView = 'atoms' | 'sets' | 'set-edit' | 'study'
type StudyDirection = 'term' | 'definition'
const RELEASE_TEMPLATE_CHOOSER_ENABLED = false
const RELEASE_COMMUNITY_ENABLED = false
const EDITOR_CITY_MARGINALIA_COUNT = EDITOR_CITY_MARGINALIA.length
const LIST_BLOCK_TYPES = ['checklist', 'bulletList', 'numberedList'] as const

function isListBlockType(type: LociBlockType | FormatBlockType): type is ListBlockType {
  return LIST_BLOCK_TYPES.includes(type as ListBlockType)
}

type FloatingEditorToolbarLayoutOptions = {
  activeView: View
  appFullscreen: boolean
  appImmersiveFullscreen: boolean
  appShellRef: RefObject<HTMLElement | null>
  fullscreenExitStaging: boolean
  selectedNoteId: string
  sidebarRevealAnimating: boolean
  toolbarRef: RefObject<HTMLDivElement | null>
}

function useFloatingEditorToolbarLayout({
  activeView,
  appFullscreen,
  appImmersiveFullscreen,
  appShellRef,
  fullscreenExitStaging,
  selectedNoteId,
  sidebarRevealAnimating,
  toolbarRef,
}: FloatingEditorToolbarLayoutOptions) {
  const frameRef = useRef<number | null>(null)
  const deferredMeasureRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const layoutMeasureRefs = useRef<number[]>([])

  const clearLayoutMeasureTimers = useCallback(() => {
    layoutMeasureRefs.current.forEach((timer) => clearTimeout(timer))
    layoutMeasureRefs.current = []
  }, [])

  const updateFloatingToolbarPosition = useCallback(() => {
    const wrap = toolbarRef.current
    if (!wrap) return

    if (activeView !== 'editor') {
      wrap.style.removeProperty('--floating-toolbar-center-x')
      wrap.style.removeProperty('--floating-toolbar-max-width')
      return
    }

    const editorPane = appShellRef.current?.querySelector<HTMLElement>('.main-pane.editor-pane')
    if (!editorPane) return

    const rect = editorPane.getBoundingClientRect()
    const viewportPadding = window.matchMedia('(max-width: 760px)').matches ? 14 : 24
    const viewportWidth = window.innerWidth
    const centerX = rect.left + rect.width / 2
    const clampedCenterX = Math.min(viewportWidth - viewportPadding, Math.max(viewportPadding, centerX))
    const availableViewportWidth = Math.max(0, viewportWidth - viewportPadding * 2)
    const availableEditorWidth = Math.max(0, rect.width - viewportPadding * 2)
    const maxWidth = Math.max(
      Math.min(260, availableViewportWidth),
      Math.min(940, availableEditorWidth, availableViewportWidth),
    )

    wrap.style.setProperty('--floating-toolbar-center-x', `${clampedCenterX}px`)
    wrap.style.setProperty('--floating-toolbar-max-width', `${maxWidth}px`)
  }, [activeView, appShellRef, toolbarRef])

  const scheduleFloatingToolbarPosition = useCallback(() => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      updateFloatingToolbarPosition()
    })
  }, [updateFloatingToolbarPosition])

  const queueFloatingToolbarRemeasure = useCallback((delayMs = 0) => {
    scheduleFloatingToolbarPosition()
    if (deferredMeasureRef.current) clearTimeout(deferredMeasureRef.current)
    deferredMeasureRef.current = setTimeout(() => {
      deferredMeasureRef.current = null
      scheduleFloatingToolbarPosition()
    }, delayMs)
  }, [scheduleFloatingToolbarPosition])

  const queueFloatingToolbarLayoutRemeasure = useCallback(() => {
    clearLayoutMeasureTimers()
    layoutMeasureRefs.current = [0, 80, 180, 320, 520].map((delay) =>
      window.setTimeout(scheduleFloatingToolbarPosition, delay),
    )
  }, [clearLayoutMeasureTimers, scheduleFloatingToolbarPosition])

  useLayoutEffect(() => {
    scheduleFloatingToolbarPosition()
  }, [activeView, scheduleFloatingToolbarPosition, selectedNoteId])

  useEffect(() => {
    queueFloatingToolbarLayoutRemeasure()
  }, [
    activeView,
    appFullscreen,
    appImmersiveFullscreen,
    fullscreenExitStaging,
    queueFloatingToolbarLayoutRemeasure,
    selectedNoteId,
    sidebarRevealAnimating,
  ])

  useEffect(() => {
    if (activeView !== 'editor') return

    const editorPane = appShellRef.current?.querySelector<HTMLElement>('.main-pane.editor-pane')
    const appShell = appShellRef.current
    const visualViewport = window.visualViewport
    const onLayoutChange = () => queueFloatingToolbarLayoutRemeasure()
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(onLayoutChange)
      : null

    if (editorPane) resizeObserver?.observe(editorPane)
    if (appShell) resizeObserver?.observe(appShell)
    window.addEventListener('resize', onLayoutChange)
    visualViewport?.addEventListener('resize', onLayoutChange)
    visualViewport?.addEventListener('scroll', onLayoutChange)
    editorPane?.addEventListener('transitionrun', onLayoutChange)
    editorPane?.addEventListener('transitionend', onLayoutChange)
    appShell?.addEventListener('transitionrun', onLayoutChange)
    appShell?.addEventListener('transitionend', onLayoutChange)
    queueFloatingToolbarLayoutRemeasure()

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', onLayoutChange)
      visualViewport?.removeEventListener('resize', onLayoutChange)
      visualViewport?.removeEventListener('scroll', onLayoutChange)
      editorPane?.removeEventListener('transitionrun', onLayoutChange)
      editorPane?.removeEventListener('transitionend', onLayoutChange)
      appShell?.removeEventListener('transitionrun', onLayoutChange)
      appShell?.removeEventListener('transitionend', onLayoutChange)
    }
  }, [activeView, appShellRef, queueFloatingToolbarLayoutRemeasure])

  useEffect(() => () => {
    clearLayoutMeasureTimers()
    if (deferredMeasureRef.current) clearTimeout(deferredMeasureRef.current)
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [clearLayoutMeasureTimers])

  return {
    queueFloatingToolbarRemeasure,
    scheduleFloatingToolbarPosition,
    updateFloatingToolbarPosition,
  }
}

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

const PROJECT_QUICK_NAV_ROW_HEIGHT = 34
const PROJECT_QUICK_NAV_MAX_HEIGHT = 240
const SIDEBAR_FLICK_THRESHOLD = 72
const SIDEBAR_FLICK_COOLDOWN_MS = 380
const IMMERSIVE_TOP_EXIT_WINDOW_MS = 1200
const IMMERSIVE_TOP_EXIT_QUIET_MS = 260
const TRUE_FULLSCREEN_EXIT_STAGE_MS = 260
const SIDEBAR_REVEAL_STAGE_MS = 280
const LAYOUT_TRANSITION_MS = 360

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

function authorshipMenuPosition(clientX: number, clientY: number) {
  const margin = 12
  const estimatedWidth = 184
  const estimatedHeight = 92
  return {
    top: Math.max(margin, Math.min(clientY, window.innerHeight - estimatedHeight - margin)),
    left: Math.max(margin, Math.min(clientX, window.innerWidth - estimatedWidth - margin)),
  }
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

const HIGHLIGHTER_PALETTE = [
  { label: 'Yellow', color: 'rgba(244, 211, 94, 0.48)' },
  { label: 'Blue', color: 'rgba(133, 176, 218, 0.42)' },
  { label: 'Red', color: 'rgba(222, 125, 118, 0.36)' },
  { label: 'Green', color: 'rgba(145, 190, 137, 0.38)' },
  { label: 'Lavender', color: 'rgba(183, 154, 211, 0.36)' },
  { label: 'Apricot', color: 'rgba(232, 169, 104, 0.36)' },
] as const
const HIGHLIGHTER_COLORS = HIGHLIGHTER_PALETTE.map(({ color }) => color) as readonly string[]
const DEFAULT_HIGHLIGHTER_COLOR = HIGHLIGHTER_COLORS[0]

function defaultUserSettings(): UserSettings {
  const now = nowIso()
  return {
    id: 'local',
    theme: 'loci',
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
    editorAnimatedTyping: false,
    editorAtomUnderlinesDefault: true,
    editorFocusModeDefault: false,
    editorFocusModeTotalMs: 0,
    editorAuthenticWriterDefault: false,
    editorShowMarginalia: true,
    preferredAtomSubView: 'atoms',
    studyDefaultDirection: 'term',
    studyShuffleDefault: false,
    communityEnabled: false,
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
  const theme = settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system' ? settings.theme : 'loci'
  const preferredAtomSubView = settings.preferredAtomSubView === 'sets' ? 'sets' : 'atoms'
  const highlighterColor = typeof settings.highlighterColor === 'string' && HIGHLIGHTER_COLORS.includes(settings.highlighterColor)
    ? settings.highlighterColor
    : base.highlighterColor
  return {
    ...base,
    ...settings,
    theme,
    highlighterColor,
    aiProviders: providers,
    editorAnimatedTyping: typeof settings.editorAnimatedTyping === 'boolean' ? settings.editorAnimatedTyping : base.editorAnimatedTyping,
    editorAtomUnderlinesDefault: typeof settings.editorAtomUnderlinesDefault === 'boolean' ? settings.editorAtomUnderlinesDefault : base.editorAtomUnderlinesDefault,
    editorFocusModeDefault: typeof settings.editorFocusModeDefault === 'boolean' ? settings.editorFocusModeDefault : base.editorFocusModeDefault,
    editorFocusModeTotalMs: typeof settings.editorFocusModeTotalMs === 'number' && Number.isFinite(settings.editorFocusModeTotalMs) ? Math.max(0, settings.editorFocusModeTotalMs) : base.editorFocusModeTotalMs,
    editorAuthenticWriterDefault: typeof settings.editorAuthenticWriterDefault === 'boolean' ? settings.editorAuthenticWriterDefault : base.editorAuthenticWriterDefault,
    editorShowMarginalia: typeof settings.editorShowMarginalia === 'boolean' ? settings.editorShowMarginalia : base.editorShowMarginalia,
    preferredAtomSubView,
    studyDefaultDirection: settings.studyDefaultDirection === 'definition' ? 'definition' : 'term',
    studyShuffleDefault: typeof settings.studyShuffleDefault === 'boolean' ? settings.studyShuffleDefault : base.studyShuffleDefault,
    communityEnabled: Boolean(settings.communityEnabled),
    pinnedCommunityRecipientIds: Array.isArray(settings.pinnedCommunityRecipientIds)
      ? settings.pinnedCommunityRecipientIds.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

function aiGeneratedContent(content: JSONContent): JSONContent {
  return applyAuthorshipToContent(content, {
    kind: 'copied',
    createdAt: nowIso(),
    source: 'ai',
  })
}

function insertDraftText(editor: NonNullable<ReturnType<typeof useEditor>>, text: string) {
  editor.chain().focus().insertContent(aiGeneratedContent(textToEditorContent(text)).content ?? []).run()
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

type AppNotificationAction = {
  label: string
  onClick: () => void | Promise<void>
  intent?: 'primary' | 'danger' | 'neutral'
}

type AppNotification = {
  id: string
  message: string
  tone?: 'info' | 'success' | 'warning' | 'error'
  actions?: AppNotificationAction[]
  persist?: boolean
}

type AppNotificationInput = string | Omit<AppNotification, 'id'> & { id?: string }

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

function formatAnimatedCount(value: number, decimals = 0) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  return safeValue.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

function AnimatedStatNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const [displayValue, setDisplayValue] = useState(safeValue)
  const [hoverRun, setHoverRun] = useState(0)

  useEffect(() => {
    setDisplayValue(safeValue)
  }, [safeValue])

  useEffect(() => {
    if (hoverRun === 0) return
    const target = safeValue
    if (target === 0) {
      setDisplayValue(0)
      return
    }
    const duration = Math.min(1600, Math.max(650, Math.log10(target + 1) * 420))
    const startedAt = performance.now()
    let frameId = 0
    setDisplayValue(0)
    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(target * eased)
      if (progress < 1) frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [hoverRun, safeValue])

  return <span className="animated-stat-number" onMouseEnter={() => setHoverRun((run) => run + 1)}>{formatAnimatedCount(displayValue, decimals)}</span>
}

type OnboardingScreenProps = {
  profileDraft: ProfileDraft
  onDraftChange: React.Dispatch<React.SetStateAction<ProfileDraft>>
  onSubmit: () => void
}

function OnboardingScreen({ profileDraft, onDraftChange, onSubmit }: OnboardingScreenProps) {
  const welcomeMessages = useMemo(() => [
    'Welcome.',
    'Thank you for using Loci Notes.',
    'What is your name?',
  ], [])
  const [welcomeIndex, setWelcomeIndex] = useState(0)
  const [typedLength, setTypedLength] = useState(0)
  const [nameEntryVisible, setNameEntryVisible] = useState(false)
  const displayName = profileDraft.displayName
  const canSubmit = displayName.trim().length > 0
  const activeWelcomeMessage = welcomeMessages[welcomeIndex] ?? ''
  const typedWelcomeMessage = activeWelcomeMessage.slice(0, typedLength)

  useEffect(() => {
    if (nameEntryVisible) return
    if (typedLength < activeWelcomeMessage.length) {
      const timer = window.setTimeout(() => {
        setTypedLength((length) => length + 1)
      }, 72)
      return () => window.clearTimeout(timer)
    }

    if (welcomeIndex < welcomeMessages.length - 1) {
      const timer = window.setTimeout(() => {
        setWelcomeIndex((index) => index + 1)
        setTypedLength(0)
      }, 1500)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => setNameEntryVisible(true), 1000)
    return () => window.clearTimeout(timer)
  }, [activeWelcomeMessage.length, nameEntryVisible, typedLength, welcomeIndex, welcomeMessages.length])

  const updateDisplayName = (nextDisplayName: string) => {
    onDraftChange((current) => ({
      ...current,
      displayName: nextDisplayName,
      initials: initialsFromName(nextDisplayName),
      handle: current.handleEdited ? current.handle : createBaseHandleFromDisplayName(nextDisplayName),
    }))
  }

  return (
    <section className="onboarding-screen" aria-labelledby="onboarding-title">
      <div className="onboarding-canvas">
        <form
          className="onboarding-card"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit) onSubmit()
          }}
        >
          {!nameEntryVisible ? (
            <h1 id="onboarding-title" className="onboarding-typewriter" aria-live="polite">
              <span>{typedWelcomeMessage}</span>
              <span className="onboarding-caret" aria-hidden />
            </h1>
          ) : (
            <>
              <h1 id="onboarding-title">What is your name?</h1>
              <label className="onboarding-name-row">
                <input
                  className="onboarding-name-input"
                  value={displayName}
                  onChange={(event) => updateDisplayName(event.target.value)}
                  placeholder="Type enter to proceed"
                  aria-label="Your name"
                  autoComplete="name"
                  autoFocus
                />
              </label>
            </>
          )}
        </form>
      </div>
    </section>
  )
}

type GroupDialogDraft = {
  name: string
  memberAccountIds: string[]
}

type SidebarQuickSection = {
  id: string
  title: string
  notes: Note[]
}

type SidebarProps = {
  activeView: View
  activeNoteId: string | undefined
  atomSubView: AtomSubView
  collapsedSectionIds: string[]
  draggedNoteIds: string[]
  dragOverProjectId: string
  profileAvatarColor: string
  profileDisplayName: string
  profileHandleLabel: string
  profileInitials: string
  projectQuickSections: SidebarQuickSection[]
  onAssignNoteToProjectDrop: (event: React.DragEvent<HTMLElement>, targetProjectId: string) => void
  onDragEnterProject: (projectId: string) => void
  onDragLeaveProject: (projectId: string) => void
  onDragOverProject: (event: React.DragEvent<HTMLElement>) => void
  onHideSidebarNote: (sectionId: string, noteId: string) => void
  onToggleSidebarSection: (sectionId: string) => void
  onNewNote: () => void
  onOpenNote: (noteId: string) => void
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenSearch: () => void
  onOpenProjectsRoot: () => void
  onRenameNote: (noteId: string, title: string) => void
  onSetActiveView: (view: View) => void
  fullscreenActive: boolean
  onToggleFullscreen: () => void
}

const Sidebar = memo(function Sidebar({
  activeView,
  activeNoteId,
  atomSubView,
  collapsedSectionIds,
  draggedNoteIds,
  dragOverProjectId,
  profileAvatarColor,
  profileDisplayName,
  profileHandleLabel,
  profileInitials,
  projectQuickSections,
  onAssignNoteToProjectDrop,
  onDragEnterProject,
  onDragLeaveProject,
  onDragOverProject,
  onHideSidebarNote,
  onToggleSidebarSection,
  onNewNote,
  onOpenNote,
  onOpenProfile,
  onOpenSettings,
  onOpenSearch,
  onOpenProjectsRoot,
  onRenameNote,
  onSetActiveView,
  fullscreenActive,
  onToggleFullscreen,
}: SidebarProps) {
  const [editingNoteId, setEditingNoteId] = useState('')
  const [editingNoteTitle, setEditingNoteTitle] = useState('')

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
          <span className="nav-label">{atomSubView === 'sets' || atomSubView === 'set-edit' || atomSubView === 'study' ? 'Sets' : 'Atoms'}</span>
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

      {projectQuickSections.map((section) => {
        const isCollapsed = collapsedSectionIds.includes(section.id)
        const projectQuickNavHeight = isCollapsed
          ? 0
          : Math.min(section.notes.length * PROJECT_QUICK_NAV_ROW_HEIGHT, PROJECT_QUICK_NAV_MAX_HEIGHT)
        const projectQuickNavStyle = {
          '--project-quick-nav-height': `${projectQuickNavHeight}px`,
        } as React.CSSProperties
        return (
          <div className={`sidebar-section sidebar-project-section ${isCollapsed ? 'is-collapsed' : ''}`} key={section.id}>
            <button
              type="button"
              className="sidebar-section-toggle"
              aria-expanded={!isCollapsed}
              onClick={() => onToggleSidebarSection(section.id)}
            >
              {isCollapsed ? <ChevronRight size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
              <span className="sidebar-section-label">{section.title}</span>
            </button>
            {!isCollapsed && (
              <VirtualList
                className="project-quick-nav"
                style={projectQuickNavStyle}
                items={section.notes}
                rowHeight={PROJECT_QUICK_NAV_ROW_HEIGHT}
                overscan={6}
                ariaLabel={`${section.title} documents`}
                renderItem={(note, index) => {
                  const isEditing = editingNoteId === note.id
                  const isActive = note.id === activeNoteId
                  return (
                    <div
                      className={`quick-note-row ${isActive ? 'is-active' : ''} ${isEditing ? 'is-editing' : ''}`}
                      style={{ '--quick-note-stagger': `${Math.min(index, 10) * 42}ms` } as React.CSSProperties}
                    >
                      <button className="quick-note-open" type="button" onClick={() => {
                        onOpenNote(note.id)
                      }}>
                        {isEditing ? (
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
                            title={note.title || 'Untitled Note'}
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
                      {!isEditing && (
                        <button
                          className="quick-note-hide"
                          type="button"
                          aria-label={`Hide ${note.title || 'Untitled Note'} from sidebar`}
                          title="Hide from sidebar"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            onHideSidebarNote(section.id, note.id)
                          }}
                        >
                          <XIcon size={20} strokeWidth={2.5} aria-hidden />
                        </button>
                      )}
                    </div>
                  )
                }}
              />
            )}
          </div>
        )
      })}

      <div className="sidebar-bottom">
        {RELEASE_COMMUNITY_ENABLED && (
          <nav className="sidebar-section secondary-nav" aria-label="Community">
            <button className={activeView === 'community' ? 'active' : ''} type="button" onClick={() => onSetActiveView('community')}>
              <Users size={18} />
              <span className="nav-label">Community</span>
            </button>
          </nav>
        )}

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
              className="sidebar-settings"
              type="button"
              aria-label="Settings"
              onClick={onOpenSettings}
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
  const [appFullscreen, setAppFullscreen] = useState(true)
  const [appImmersiveFullscreen, setAppImmersiveFullscreen] = useState(false)
  const [fullscreenExitStaging, setFullscreenExitStaging] = useState(false)
  const [sidebarRevealAnimating, setSidebarRevealAnimating] = useState(false)
  const [layoutTransitioning, setLayoutTransitioning] = useState(false)
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
  const [openSidebarProjectIds, setOpenSidebarProjectIds] = useState<string[]>([])
  const [collapsedSidebarProjectIds, setCollapsedSidebarProjectIds] = useState<string[]>([])
  const [hiddenSidebarNoteIdsByProjectId, setHiddenSidebarNoteIdsByProjectId] = useState<Record<string, string[]>>({})
  const [atomSearchQuery, setAtomSearchQuery] = useState('')
  const [atomProjectFilter, setAtomProjectFilter] = useState('all')
  const [atomProjectMenuOpen, setAtomProjectMenuOpen] = useState(false)
  const [openProjectMenuId, setOpenProjectMenuId] = useState('')
  const [openLooseNoteMenuId, setOpenLooseNoteMenuId] = useState('')
  const [editingLooseNoteId, setEditingLooseNoteId] = useState('')
  const [editingLooseNoteTitle, setEditingLooseNoteTitle] = useState('')
  const [atomUnderlinesVisible, setAtomUnderlinesVisible] = useState(true)
  const [editorFocusMode, setEditorFocusMode] = useState(false)
  const [editorFocusModeVisual, setEditorFocusModeVisual] = useState(false)
  const [editorAuthenticWriterMode, setEditorAuthenticWriterMode] = useState(false)
  const [editorCityMarginaliaOpacity, setEditorCityMarginaliaOpacity] = useState(1)
  const { imageLoadStates, ensureImageLoaded } = useImageLoadCoordinator()
  const [, setSaving] = useState(false)
  const [atomDialog, setAtomDialog] = useState<AtomDialog | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
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
  const [activeFormatBlockId, setActiveFormatBlockId] = useState('')
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
  const [activeSurveyPrompt, setActiveSurveyPrompt] = useState<SurveyPrompt | null>(null)
  const [surveyAnswer, setSurveyAnswer] = useState('')
  const [surveyComment, setSurveyComment] = useState('')
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveySubmitting, setSurveySubmitting] = useState(false)
  const [, setShowSaveState] = useState(true)
  const [localLoadIssues, setLocalLoadIssues] = useState<string[]>([])
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] = useState('general')
  const [openSettingsDropdown, setOpenSettingsDropdown] = useState('')
  const [dashboardNow, setDashboardNow] = useState(() => new Date())
  const [homeVisitCount, setHomeVisitCount] = useState(0)
  const [postOnboardingReveal, setPostOnboardingReveal] = useState(false)
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
  const immersiveTopExitArmedAtRef = useRef(0)
  const immersiveTopExitLastWheelAtRef = useRef(0)
  const layoutTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const postOnboardingRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sidebarRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sidebarRevealCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  const editorFocusModeStartedAtRef = useRef<number | null>(null)
  const userSettingsRef = useRef<UserSettings>(userSettings)
  const notificationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const optimisticDeleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const formatSideFrameRef = useRef<number | null>(null)
  const formatBlockFrameRef = useRef<number | null>(null)
  const editorResizeFrameRef = useRef<number | null>(null)
  const suppressEditorPersistRef = useRef(false)
  const lastLocalEditorContentRef = useRef<{ noteId: string; contentKey: string } | null>(null)
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
  const projectSectionIdForNote = useCallback(
    (note: Note) => (note.projectId !== UNASSIGNED_PROJECT_ID && projectById.has(note.projectId) ? note.projectId : UNASSIGNED_PROJECT_ID),
    [projectById],
  )
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
  const surveyPromptReady = authSession.status === 'signed-in' && Boolean(activeSurveyPrompt)
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

  const dismissNotification = useCallback((id: string) => {
    const timer = notificationTimersRef.current.get(id)
    if (timer) clearTimeout(timer)
    notificationTimersRef.current.delete(id)
    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    notificationTimersRef.current.forEach((timer) => clearTimeout(timer))
    notificationTimersRef.current.clear()
    setNotifications([])
  }, [])

  const showNotification = useCallback((input: AppNotificationInput) => {
    if (typeof input === 'string') {
      if (!input) {
        clearNotifications()
        return ''
      }
      input = { message: input }
    }

    const id = input.id ?? createId('notification')
    const notification: AppNotification = {
      id,
      message: input.message,
      tone: input.tone ?? 'info',
      actions: input.actions,
      persist: input.persist ?? Boolean(input.actions?.length),
    }

    const existingTimer = notificationTimersRef.current.get(id)
    if (existingTimer) clearTimeout(existingTimer)
    notificationTimersRef.current.delete(id)

    setNotifications((current) => [notification, ...current.filter((item) => item.id !== id)].slice(0, 4))

    if (!notification.persist) {
      const timer = setTimeout(() => {
        dismissNotification(id)
      }, NOTICE_TOAST_MS)
      notificationTimersRef.current.set(id, timer)
    }

    return id
  }, [clearNotifications, dismissNotification])

  const showNotice = useCallback((message: string) => {
    showNotification(message)
  }, [showNotification])

  const showConflictNotification = useCallback((message: string, actions: AppNotificationAction[]) => {
    return showNotification({
      message,
      tone: 'warning',
      persist: true,
      actions,
    })
  }, [showNotification])

  const showSyncConflictNotification = useCallback((message = 'Remote changes conflict with your local version.') => {
    return showConflictNotification(message, [
      { label: 'Keep mine', intent: 'neutral', onClick: () => { showNotification({ message: 'Local version kept.', tone: 'success' }) } },
      { label: 'Use remote', intent: 'neutral', onClick: () => { showNotification({ message: 'Remote version accepted.', tone: 'success' }) } },
      { label: 'Review', intent: 'primary', onClick: () => { showNotification({ message: 'Conflict review will open here when sync is release-enabled.', tone: 'info' }) } },
    ])
  }, [showConflictNotification, showNotification])

  const unassignedNotes = useMemo(() => {
    const projectIds = new Set(projects.map((project) => project.id))
    return notes
      .filter((note) => note.projectId === UNASSIGNED_PROJECT_ID || !projectIds.has(note.projectId))
      .sort(sortByUpdated)
  }, [notes, projects])
  const projectQuickSections = useMemo<SidebarQuickSection[]>(() => {
    return openSidebarProjectIds.flatMap((sectionId) => {
      const title = sectionId === UNASSIGNED_PROJECT_ID
        ? 'Unsorted'
        : projectById.get(sectionId)?.name
      if (!title) return []
      const hiddenIds = new Set(hiddenSidebarNoteIdsByProjectId[sectionId] ?? [])
      const sectionNotes = (sectionId === UNASSIGNED_PROJECT_ID
        ? unassignedNotes
        : noteIndexes.notesByProjectId.get(sectionId) ?? []
      ).filter((note) => !hiddenIds.has(note.id))
      if (!sectionNotes.length) return []
      return [{ id: sectionId, title, notes: sectionNotes }]
    })
  }, [hiddenSidebarNoteIdsByProjectId, noteIndexes, openSidebarProjectIds, projectById, unassignedNotes])
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
    const abandonedBlankNoteIds = unassignedNotes
      .filter((note) => {
        if (note.id === selectedNoteId || pendingNoteSavesRef.current.has(note.id)) return false
        if (note.templateId !== 'blank' || note.title !== 'Untitled Note' || note.tags.length) return false
        if (note.createdAt !== note.updatedAt) return false

        const text = collectText(note.content ?? emptyDoc).trim()
        if (!text) return true
        const nodes = note.content?.type === 'doc' ? note.content.content ?? [] : []
        const onlyDefaultHeading =
          nodes.length === 1 &&
          nodes[0]?.type === 'heading' &&
          nodes[0]?.attrs?.level === 1 &&
          text === 'Untitled Note'
        return onlyDefaultHeading
      })
      .map((note) => note.id)

    if (!abandonedBlankNoteIds.length) return

    const abandonedIds = new Set(abandonedBlankNoteIds)
    const remainingNotes = notesRef.current.filter((note) => !abandonedIds.has(note.id))
    notesRef.current = remainingNotes
    setNotes(remainingNotes)
    setSelectedNoteIds((current) => current.filter((id) => !abandonedIds.has(id)))
    setHiddenSidebarNoteIdsByProjectId((current) => {
      let changed = false
      const next: Record<string, string[]> = {}
      Object.entries(current).forEach(([sectionId, noteIds]) => {
        const keptIds = noteIds.filter((id) => !abandonedIds.has(id))
        if (keptIds.length !== noteIds.length) changed = true
        if (keptIds.length) next[sectionId] = keptIds
      })
      return changed ? next : current
    })

    abandonedBlankNoteIds.forEach((noteId) => {
      void notesStore.deleteWithSnapshots(noteId).catch(() => {
        console.warn('Could not delete abandoned blank note', noteId)
      })
    })
  }, [selectedNoteId, unassignedNotes])

  useEffect(() => {
    atomsRef.current = atoms
  }, [atoms])

  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId
  }, [selectedNoteId])

  useEffect(() => {
    if (!appFullscreen) setAppImmersiveFullscreen(false)
  }, [appFullscreen])

  useEffect(() => {
    return () => {
      if (layoutTransitionTimeoutRef.current) clearTimeout(layoutTransitionTimeoutRef.current)
      if (postOnboardingRevealTimeoutRef.current) clearTimeout(postOnboardingRevealTimeoutRef.current)
      if (sidebarRevealTimeoutRef.current) clearTimeout(sidebarRevealTimeoutRef.current)
      if (sidebarRevealCleanupTimeoutRef.current) clearTimeout(sidebarRevealCleanupTimeoutRef.current)
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
      setFlashcardSets(storedFlashcardSets.map((set) => ({ ...set, atomIds: set.atomIds ?? [] })))
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
      setAtomUnderlinesVisible(normalizedSettings.editorAtomUnderlinesDefault)
      setEditorFocusMode(normalizedSettings.editorFocusModeDefault)
      setEditorFocusModeVisual(normalizedSettings.editorFocusModeDefault)
      setEditorAuthenticWriterMode(normalizedSettings.editorAuthenticWriterDefault)
      setEditorCityMarginaliaOpacity(normalizedSettings.editorShowMarginalia ? 1 : 0)
      setStudyDirection(normalizedSettings.studyDefaultDirection)
      setStudyShuffle(normalizedSettings.studyShuffleDefault)
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

  const checkForUpdates = useCallback(async (manual = false, autoInstall = false) => {
    await updateService.check({
      manual,
      autoInstall,
      isDesktop: Boolean(window.__TAURI_INTERNALS__),
      onStateChange: setUpdateState,
    })
    if (manual) showNotification({ message: 'Update check complete.', tone: 'success' })
  }, [showNotification])

  const installAvailableUpdate = useCallback(async () => {
    await updateService.installAvailable({
      isDesktop: Boolean(window.__TAURI_INTERNALS__),
      onStateChange: setUpdateState,
    })
    showNotification({ message: 'Update install started.', tone: 'success' })
  }, [showNotification])

  useEffect(() => {
    if (updateCheckRanRef.current || !window.__TAURI_INTERNALS__) return
    updateCheckRanRef.current = true
    void checkForUpdates(false, true)
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
      if (RELEASE_COMMUNITY_ENABLED && notifications.length) {
        showNotification({
          message: `${notifications.length} developer notification${notifications.length === 1 ? '' : 's'} cached.`,
          tone: 'info',
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [showNotification])

  useEffect(() => {
    const accountId = authSession.accountId
    if (authSession.status !== 'signed-in' || !accountId) {
      setActiveSurveyPrompt(null)
      setSurveyAnswer('')
      setSurveyComment('')
      setSurveyLoading(false)
      return
    }

    let cancelled = false
    setSurveyLoading(true)
    void surveyService.getActivePrompt(accountId, 'settings')
      .then((prompt) => {
        if (cancelled) return
        setActiveSurveyPrompt(prompt)
        setSurveyAnswer(prompt?.kind === 'single-choice' ? prompt.options[0] ?? '' : '')
        setSurveyComment('')
      })
      .catch((error) => {
        if (cancelled) return
        console.warn('Could not load survey prompt', error)
        setActiveSurveyPrompt(null)
      })
      .finally(() => {
        if (!cancelled) setSurveyLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authSession.accountId, authSession.status])

  useEffect(() => {
    if (!RELEASE_COMMUNITY_ENABLED) return
    let cancelled = false
    void db.communitySyncQueue
      .where('status')
      .equals('failed')
      .toArray()
      .then((failedItems) => {
        if (cancelled || !failedItems.length) return
        showNotification({
          message: `${failedItems.length} community sync item${failedItems.length === 1 ? '' : 's'} need attention.`,
          tone: 'warning',
          persist: true,
          actions: [{
            label: 'Review',
            intent: 'primary',
            onClick: () => { showSyncConflictNotification('Community sync has unresolved failures.') },
          }],
        })
      })
    return () => {
      cancelled = true
    }
  }, [showNotification, showSyncConflictNotification])

  async function runSavedNoteMaintenance(savedNotes: Note[]) {
    const contentNotes = savedNotes.filter((note) => note.content)
    if (!contentNotes.length) return

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
      debugEditorLog('scheduled atom sync', {
        noteId: latest.id,
        atomCount: linkedAtoms.length,
        isOpenNote: latest.id === selectedNoteIdRef.current,
        selection: debugEditorState(),
      })
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
      notificationTimersRef.current.forEach((timer) => clearTimeout(timer))
      notificationTimersRef.current.clear()
      optimisticDeleteTimersRef.current.forEach((timer) => clearTimeout(timer))
      if (formatSideFrameRef.current) cancelAnimationFrame(formatSideFrameRef.current)
      if (formatBlockFrameRef.current) cancelAnimationFrame(formatBlockFrameRef.current)
      if (blockDropFrameRef.current) cancelAnimationFrame(blockDropFrameRef.current)
      void flushPendingNoteSaves()
    }
  }, [])

  useLayoutEffect(() => {
    if (!blockPicker.open) return
    const scrollEl = documentScrollRef.current
    if (!scrollEl) return

    const previousOverflow = scrollEl.style.overflow
    const previousOverscrollBehavior = scrollEl.style.overscrollBehavior
    scrollEl.style.overflow = 'hidden'
    scrollEl.style.overscrollBehavior = 'contain'

    return () => {
      scrollEl.style.overflow = previousOverflow
      scrollEl.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [blockPicker.open])

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

  const editorContentKey = (content: JSONContent) => JSON.stringify(content)

  const prosemirrorBlockIndex = (currentEditor = editorRef.current) => {
    if (!currentEditor || currentEditor.isDestroyed) return -1
    return currentEditor.state.selection.$from.index(0)
  }

  const debugEditorState = (currentEditor = editorRef.current) => {
    if (!currentEditor || currentEditor.isDestroyed) return null
    const { from, to } = currentEditor.state.selection
    return {
      from,
      to,
      activeIndex: prosemirrorBlockIndex(currentEditor),
      childCount: currentEditor.state.doc.childCount,
      docSize: currentEditor.state.doc.content.size,
      focused: currentEditor.isFocused,
    }
  }

  const debugEditorLog = (message: string, details: Record<string, unknown>) => {
    if (!(window as typeof window & { __LOCI_EDITOR_DEBUG?: boolean }).__LOCI_EDITOR_DEBUG) return
    console.debug(`[loci-editor] ${message}`, details)
  }

  function setEditorContentFromSync(content: JSONContent, reason = 'sync') {
    const currentEditor = editorRef.current
    if (!currentEditor) return
    const before = debugEditorState(currentEditor)
    const selection = currentEditor.state.selection
    const restoreSelection = selection instanceof TextSelection
      ? { from: selection.from, to: selection.to }
      : null
    preserveEditorScroll(() => {
      suppressEditorPersistRef.current = true
      currentEditor.commands.setContent(content, { emitUpdate: false })
      if (restoreSelection) {
        const nextSize = currentEditor.state.doc.content.size
        const from = Math.min(restoreSelection.from, nextSize)
        const to = Math.min(restoreSelection.to, nextSize)
        try {
          currentEditor.view.dispatch(
            currentEditor.state.tr.setSelection(TextSelection.create(currentEditor.state.doc, from, to)),
          )
        } catch {
          currentEditor.view.dispatch(
            currentEditor.state.tr.setSelection(TextSelection.near(currentEditor.state.doc.resolve(from), -1)),
          )
        }
      }
      suppressEditorPersistRef.current = false
    })
    debugEditorLog('setContent', {
      reason,
      before,
      after: debugEditorState(currentEditor),
      contentBlocks: content.content?.length ?? 0,
      noteId: selectedNoteIdRef.current,
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
    if (openNote) {
      debugEditorLog('atom sync touched open note', {
        noteId: openNote.id,
        selection: debugEditorState(),
        changedBlockCount: primaryTemplateContent(openNote).content?.length ?? 0,
      })
      if (!editorRef.current?.isFocused) setEditorContentFromSync(primaryTemplateContent(openNote), 'atom-sync-open-note')
    }
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
    const isLocalTypingPatch =
      noteId === selectedNoteIdRef.current &&
      Boolean(editorRef.current?.isFocused) &&
      'content' in patch &&
      'templateData' in patch &&
      'blocks' in patch
    const applyNotePatch = (items: Note[]) => {
      const mapped = items.map((note) => (note.id === noteId ? updated : note))
      return isLocalTypingPatch ? mapped : mapped.sort(sortByUpdated)
    }
    notesRef.current = applyNotePatch(notesRef.current)
    setNotes((current) => applyNotePatch(current))
    debugEditorLog('persistNote', {
      noteId,
      isLocalTypingPatch,
      patchKeys: Object.keys(patch),
      selection: debugEditorState(),
    })
    scheduleNoteSave(updated, 'title' in patch || 'content' in patch || 'templateData' in patch)
  }, [])

  const startLooseNoteRename = useCallback((note: Note) => {
    setOpenLooseNoteMenuId('')
    setEditingLooseNoteId(note.id)
    setEditingLooseNoteTitle(note.title || 'Untitled Note')
  }, [])

  const commitLooseNoteRename = useCallback((note: Note) => {
    const nextTitle = editingLooseNoteTitle.replace(/\s*\r?\n\s*/g, ' ').trim() || 'Untitled Note'
    setEditingLooseNoteTitle(nextTitle)
    setEditingLooseNoteId('')
    if (nextTitle !== note.title) void persistNote({ title: nextTitle }, note.id)
  }, [editingLooseNoteTitle, persistNote])

  const openSidebarSectionForNote = useCallback((note: Note, options: { revealNote?: boolean } = {}) => {
    const sectionId = projectSectionIdForNote(note)
    setOpenSidebarProjectIds((current) => (current.includes(sectionId) ? current : [sectionId, ...current]))
    if (options.revealNote !== false) {
      setHiddenSidebarNoteIdsByProjectId((current) => {
        const hiddenIds = current[sectionId] ?? []
        if (!hiddenIds.includes(note.id)) return current
        const nextHiddenIds = hiddenIds.filter((id) => id !== note.id)
        const next = { ...current }
        if (nextHiddenIds.length) next[sectionId] = nextHiddenIds
        else delete next[sectionId]
        return next
      })
    }
  }, [projectSectionIdForNote])

  const hideSidebarNote = useCallback((sectionId: string, noteId: string) => {
    setHiddenSidebarNoteIdsByProjectId((current) => {
      const hiddenIds = current[sectionId] ?? []
      if (hiddenIds.includes(noteId)) return current
      return { ...current, [sectionId]: [...hiddenIds, noteId] }
    })
  }, [])

  const handleNoteDropTargetDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const openNote = useCallback((noteId: string, options: { trackHistory?: boolean } = {}) => {
    beginLayoutTransition(240)
    if (options.trackHistory !== false) {
      noteOpenHistoryRef.current = [noteId, ...noteOpenHistoryRef.current.filter((id) => id !== noteId)]
    }
    const currentNote = notesRef.current.find((note) => note.id === noteId)
    if (currentNote) {
      openSidebarSectionForNote(currentNote)
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
  }, [openSidebarSectionForNote])

  const nextVisibleSidebarNote = useCallback((excludingNoteIds: string[] = []) => {
    const excluded = new Set(excludingNoteIds)
    const noteById = new Map(notesRef.current.map((note) => [note.id, note]))
    const visibleIds = new Set<string>()
    for (const section of projectQuickSections) {
      for (const note of section.notes) {
        if (!excluded.has(note.id)) visibleIds.add(note.id)
      }
    }

    const history = noteOpenHistoryRef.current.filter((id) => {
      const note = noteById.get(id)
      return note && visibleIds.has(id)
    })
    noteOpenHistoryRef.current = history
    const historyNoteId = history.find((id) => !excluded.has(id))
    if (historyNoteId) return noteById.get(historyNoteId)

    for (const section of projectQuickSections) {
      const note = section.notes.find((item) => !excluded.has(item.id))
      if (note) return note
    }
    return undefined
  }, [projectQuickSections])

  const closeSidebarNote = useCallback((noteId: string) => {
    const note = notesRef.current.find((item) => item.id === noteId)
    if (!note) return
    const sectionId = projectSectionIdForNote(note)
    hideSidebarNote(sectionId, noteId)
    noteOpenHistoryRef.current = noteOpenHistoryRef.current.filter((id) => id !== noteId)

    if (selectedNoteIdRef.current !== noteId) return
    const nextNote = nextVisibleSidebarNote([noteId])
    setActiveEditorPanel(null)
    setNoteHistoryOpen(false)
    showNotice('')
    if (nextNote) {
      openNote(nextNote.id, { trackHistory: false })
      return
    }
    setSelectedNoteId('')
    setActiveView('home')
  }, [hideSidebarNote, nextVisibleSidebarNote, openNote, projectSectionIdForNote, showNotice])

  const closeSidebarProject = useCallback((sectionId: string) => {
    setOpenSidebarProjectIds((current) => current.filter((id) => id !== sectionId))
    setHiddenSidebarNoteIdsByProjectId((current) => {
      if (!(sectionId in current)) return current
      const next = { ...current }
      delete next[sectionId]
      return next
    })

    const currentNote = notesRef.current.find((note) => note.id === selectedNoteIdRef.current)
    if (!currentNote || projectSectionIdForNote(currentNote) !== sectionId) return
    const closingNoteIds = notesRef.current
      .filter((note) => projectSectionIdForNote(note) === sectionId)
      .map((note) => note.id)
    noteOpenHistoryRef.current = noteOpenHistoryRef.current.filter((id) => !closingNoteIds.includes(id))
    const nextNote = nextVisibleSidebarNote(closingNoteIds)
    setActiveEditorPanel(null)
    setNoteHistoryOpen(false)
    showNotice('')
    if (nextNote) {
      openNote(nextNote.id, { trackHistory: false })
      return
    }
    setSelectedNoteId('')
    setActiveView('home')
  }, [nextVisibleSidebarNote, openNote, projectSectionIdForNote, showNotice])

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

  const isListBlockActive = () =>
    Boolean(editorRef.current?.isActive('taskList') || editorRef.current?.isActive('bulletList') || editorRef.current?.isActive('orderedList'))

  const listBlockContent = (type: ListBlockType) => listBlockDocFromData(type, [''])

  const blankContentForBlockType = (type: LociBlockType) => (
    isListBlockType(type) ? listBlockContent(type) : blankBlockNode(type)
  )

  const applyListFormat = (type: ListBlockType) => {
    const currentEditor = editorRef.current
    if (!currentEditor || currentEditor.isActive('table')) return false
    const chain = currentEditor.chain().focus()
    if (type === 'checklist') return chain.toggleTaskList().run()
    if (type === 'bulletList') return chain.toggleBulletList().run()
    return chain.toggleOrderedList().run()
  }

  const addRowToActiveList = () => {
    const currentEditor = editorRef.current
    if (!currentEditor || !isListBlockActive()) return false
    const insertListItemAfterSelection = (itemType: 'taskItem' | 'listItem') => {
      const { state, view } = currentEditor
      const { $from } = state.selection
      const itemDepth = Array.from({ length: $from.depth + 1 }, (_, index) => $from.depth - index)
        .find((depth) => $from.node(depth).type.name === itemType)
      if (itemDepth === undefined) return false
      const insertAt = $from.after(itemDepth)
      const item = itemType === 'taskItem'
        ? {
            type: 'taskItem',
            attrs: { checked: false },
            content: [{ type: 'paragraph', content: [] }],
          }
        : {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }],
          }
      const node = currentEditor.schema.nodeFromJSON(item)
      const tr = state.tr.insert(insertAt, node)
      tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(insertAt + 2, tr.doc.content.size)), 1))
      view.dispatch(tr.scrollIntoView())
      return true
    }

    if (currentEditor.isActive('taskList')) {
      if (currentEditor.chain().focus().splitListItem('taskItem').run()) return true
      return insertListItemAfterSelection('taskItem')
    }
    if (currentEditor.chain().focus().splitListItem('listItem').run()) return true
    return insertListItemAfterSelection('listItem')
  }

  const exitActiveListToParagraphBlock = () => {
    const currentEditor = editorRef.current
    if (!currentEditor || !isListBlockActive()) return false
    const { $from } = currentEditor.state.selection
    if ($from.depth < 1) return false
    const topLevelNode = $from.node(1)
    if (!['taskList', 'bulletList', 'orderedList'].includes(topLevelNode.type.name)) return false
    const insertAt = $from.before(1) + topLevelNode.nodeSize
    const nextBlockIndex = activeBlockIndex() + 1
    currentEditor
      .chain()
      .focus()
      .insertContentAt(insertAt, { type: 'paragraph', content: [] })
      .setTextSelection(insertAt + 1)
      .run()
    pendingEnterBlockIndexRef.current = nextBlockIndex
    return true
  }

  const handleBackspaceAtBlockBoundary = () => {
    const currentEditor = editorRef.current
    if (!currentEditor || currentEditor.isActive('table') || currentEditor.isActive('taskList') || currentEditor.isActive('bulletList') || currentEditor.isActive('orderedList')) return false
    const { state, view } = currentEditor
    const { selection } = state
    if (!selection.empty || !(selection instanceof TextSelection)) return false
    const { $from } = selection
    if ($from.depth < 1 || $from.parentOffset !== 0) return false
    const blockIndex = activeBlockIndex()
    if (blockIndex <= 0) return false

    pendingEnterBlockIndexRef.current = blockIndex - 1
    const blockStart = $from.before(1)
    const blockNode = $from.node(1)
    const isEmptyTextBlock = blockNode.isTextblock && blockNode.textContent.length === 0
    if (!isEmptyTextBlock) return false

    const tr = state.tr.delete(blockStart, blockStart + blockNode.nodeSize)
    const selectionPos = Math.max(1, blockStart - 1)
    tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(selectionPos, tr.doc.content.size)), -1))
    view.dispatch(tr.scrollIntoView())
    return true
  }

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
      LociQuote,
      LociLatex,
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
        if (event.key === 'Backspace' && handleBackspaceAtBlockBoundary()) {
          event.preventDefault()
          return true
        }
        if (event.key === 'Enter' && event.shiftKey && addRowToActiveList()) {
          event.preventDefault()
          return true
        }
        if (event.key === 'Enter' && exitActiveListToParagraphBlock()) {
          event.preventDefault()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setEditorCityMarginaliaOpacity(editorMarginaliaOpacityFromText(updatedEditor.getText()))
      if (suppressEditorPersistRef.current) return
      const activeIndex = activeBlockIndex(updatedEditor)
      const id = selectedNoteIdRef.current
      const note = notesRef.current.find((item) => item.id === id)
      if (!note) return
      const templateData = updatePrimaryTemplateContent(note, updatedEditor.getJSON())
      const content = templateDataToContent(templateData)
      const normalizedActiveIndex = pendingEnterBlockIndexRef.current ?? activeIndex
      pendingEnterBlockIndexRef.current = null
      const blocks = normalizeBlocksForContent(content, note.blocks, normalizedActiveIndex)
      const contentKey = editorContentKey(content)
      lastLocalEditorContentRef.current = { noteId: id, contentKey }
      debugEditorLog('onUpdate', {
        noteId: id,
        activeIndex,
        normalizedActiveIndex,
        selection: debugEditorState(updatedEditor),
        sourceBlockCount: content.content?.length ?? 0,
        savedBlockCount: note.blocks?.length ?? 0,
        normalizedBlockIds: blocks.map((block) => block.id),
      })
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

    const els = Array.from(document.querySelectorAll('.scroll-hover, .scroll-region-stable'))
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
    const nextContent = primaryTemplateContent(selectedNote)
    const nextContentKey = editorContentKey(nextContent)
    if (latestLocalContent?.noteId === selectedNote.id && latestLocalContent.contentKey === nextContentKey) {
      debugEditorLog('skip setContent', { reason: 'local-content-key-match', noteId: selectedNote.id })
      return
    }

    const currentContentKey = editorContentKey(editor.getJSON())
    if (currentContentKey === nextContentKey) {
      debugEditorLog('skip setContent', { reason: 'editor-json-match', noteId: selectedNote.id })
      return
    }

    if (editor.isFocused && latestLocalContent?.noteId === selectedNote.id) {
      debugEditorLog('skip setContent', {
        reason: 'focused-local-note',
        noteId: selectedNote.id,
        selection: debugEditorState(editor),
      })
      return
    }

    setEditorContentFromSync(nextContent, 'selected-note-sync')
  }, [editor, selectedNote])

  function activeFormatBlock(): { block: LociBlock; index: number; from: number; to: number } | null {
    if (!editor) return null
    const selectionFrom = editor.state.selection.from
    let runningPos = 1
    const blocks = selectedBlocksRef.current
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index]
      const blockSize = blockContentNodes(block.content).reduce((total, node) => total + editor.schema.nodeFromJSON(node).nodeSize, 0)
      const from = runningPos
      const to = runningPos + blockSize
      runningPos = to
      if (!formatBlockTypeForBlock(block)) continue
      if (selectionFrom >= from && selectionFrom <= to) return { block, index, from, to }
    }
    return null
  }

  const syncFormatSideControls = useCallback(() => {
    const shell = blockEditorShellRef.current
    const editorDom = mountedEditorDom(editor)
    if (!editor || !shell || !editorDom) {
      setFormatSideControls((current) => (current ? null : current))
      setActiveFormatBlockId('')
      return
    }

    const activeElement = document.activeElement instanceof Element ? document.activeElement : null
    const isInsideEditor = editor.isFocused || Boolean(activeElement && editorDom.contains(activeElement))
    if (!isInsideEditor) {
      setFormatSideControls((current) => (current ? null : current))
      setActiveFormatBlockId('')
      return
    }

    const active = activeFormatBlock()
    const activeType = active ? formatBlockTypeForBlock(active.block) : null
    if (!active || !activeType) {
      setFormatSideControls((current) => (current ? null : current))
      setActiveFormatBlockId('')
      return
    }

    const nodeDom = editor.view.nodeDOM(active.from)
    const nodeElement = nodeDom instanceof HTMLElement ? nodeDom : nodeDom instanceof Element ? nodeDom.parentElement : null
    const target = activeType === 'table'
      ? nodeElement?.closest<HTMLElement>('.tableWrapper') ?? nodeElement?.closest<HTMLElement>('table')
      : nodeElement
    if (!(target instanceof HTMLElement)) {
      setFormatSideControls((current) => (current ? null : current))
      setActiveFormatBlockId('')
      return
    }
    const shellRect = shell.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const next = {
      blockId: active.block.id,
      type: activeType,
      top: targetRect.top - shellRect.top,
      left: Math.max(0, shellRect.width + 8),
    }
    setActiveFormatBlockId(active.block.id)
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
      if (activeEditorPanel === 'format' && formatDialogRef.current?.contains(event.target as Node)) return
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
      if (editor && !editor.isDestroyed && editor.view.dom.contains(event.target as Node)) {
        const position = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (position && position.pos >= editor.state.selection.from && position.pos <= editor.state.selection.to) return
      }
      setAuthorshipMenu(null)
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    return () => document.removeEventListener('mousedown', closeOnOutsidePointer)
  }, [authorshipMenu, editor])

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
  }, [activeEditorPanel])

  const editorModalOverlayOpen =
    activeView === 'editor' &&
    (activeEditorPanel === 'format' || Boolean(atomDialog) || Boolean(aiResult))

  useEffect(() => {
    if (!editorModalOverlayOpen) return
    const scrollEl = documentScrollRef.current
    if (!scrollEl) return

    const previousOverflow = scrollEl.style.overflow
    const previousPaddingRight = scrollEl.style.paddingRight
    const scrollbarWidth = scrollEl.offsetWidth - scrollEl.clientWidth
    scrollEl.style.overflow = 'hidden'
    if (scrollbarWidth > 0) scrollEl.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      scrollEl.style.overflow = previousOverflow
      scrollEl.style.paddingRight = previousPaddingRight
    }
  }, [editorModalOverlayOpen])

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
    if (!openSettingsDropdown) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.settings-dropdown')) return
      setOpenSettingsDropdown('')
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenSettingsDropdown('')
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openSettingsDropdown])

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
      const targetElement = event.target instanceof Element ? event.target : null
      const editorEl = editor.view.dom
      const toolbarEl = floatingEditorWrapRef.current
      if (targetElement?.closest('.highlight-palette')) return
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
  const profileStats = useMemo(
    () => buildProfileStats({ notes, projects, atoms, flashcardSets, now: dashboardNow }),
    [atoms, dashboardNow, flashcardSets, notes, projects],
  )
  const focusModeHours = userSettings.editorFocusModeTotalMs / 3_600_000
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
  const profileMessageSeed = useMemo(() => {
    const dayKey = dashboardNow.toISOString().slice(0, 10).replace(/\D/g, '')
    return Number(dayKey) + homeVisitCount + profileStats.totalNotes * 3 + profileStats.totalAtoms * 5 + profileStats.dailyStreak * 7 + Math.floor(focusModeHours)
  }, [dashboardNow, focusModeHours, homeVisitCount, profileStats.dailyStreak, profileStats.totalAtoms, profileStats.totalNotes])
  const profileGreeting = useMemo(() => getProfileGreeting(firstName, profileStats), [firstName, profileStats])
  const profileProgressMessage = useMemo(() => getProfileProgressMessage(profileStats, profileMessageSeed), [profileMessageSeed, profileStats])
  const profileNextAction = useMemo(() => getProfileNextAction(profileStats), [profileStats])
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

  const resetProfileDraftFromSaved = () => {
    const displayName = localProfile && !isBadProfileDisplayName(localProfile.displayName) ? localProfile.displayName : ''
    const existingHandle = accountProfile?.handle ?? ''
    setProfileDraft({
      displayName,
      initials: displayName ? localProfile?.initials ?? '' : '',
      handle: existingHandle || createBaseHandleFromDisplayName(displayName),
      handleEdited: Boolean(existingHandle),
      avatarColor: localProfile?.avatarColor ?? DEFAULT_PROFILE_COLOR,
    })
  }

  useEffect(() => {
    if (!profileLoaded || localProfile) return
    setProfileDraft((current) => {
      if (current.displayName || current.initials || current.handle || current.handleEdited) return current
      return { ...current, avatarColor: current.avatarColor || DEFAULT_PROFILE_COLOR }
    })
  }, [localProfile, profileLoaded])

  useEffect(() => {
    userSettingsRef.current = userSettings
  }, [userSettings])

  const saveLocalProfile = async () => {
    const displayName = profileDraft.displayName.trim()
    if (!displayName) return
    const isFirstRunProfile = !localProfile
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
    if (isFirstRunProfile) {
      beginLayoutTransition(420)
      setAppImmersiveFullscreen(false)
      setAppFullscreen(true)
      setPostOnboardingReveal(true)
      if (postOnboardingRevealTimeoutRef.current) clearTimeout(postOnboardingRevealTimeoutRef.current)
      postOnboardingRevealTimeoutRef.current = setTimeout(() => {
        postOnboardingRevealTimeoutRef.current = null
        setPostOnboardingReveal(false)
      }, 900)
    }
    if (!settingsModalOpen) setProfileModalOpen(false)
  }

  const saveUserSettings = async (next: UserSettings) => {
    const normalized = normalizeUserSettings({ ...next, updatedAt: nowIso() })
    await settingsStore.save(normalized)
    setUserSettings(normalized)
  }

  const dismissSurveyPrompt = async () => {
    if (!activeSurveyPrompt || !authSession.accountId) return
    await surveyService.dismissPrompt(authSession.accountId, activeSurveyPrompt.id)
    setActiveSurveyPrompt(null)
    setSurveyAnswer('')
    setSurveyComment('')
    showNotification({ message: 'Survey prompt dismissed.', tone: 'info' })
  }

  const submitSurveyPrompt = async () => {
    if (!activeSurveyPrompt || !authSession.accountId || surveySubmitting) return
    setSurveySubmitting(true)
    try {
      await surveyService.submitResponse({
        prompt: activeSurveyPrompt,
        accountId: authSession.accountId,
        answer: surveyAnswer,
        comment: surveyComment,
      })
      setActiveSurveyPrompt(null)
      setSurveyAnswer('')
      setSurveyComment('')
      showNotification({ message: 'Thanks for the input.', tone: 'success' })
    } catch (error) {
      showNotification({
        message: error instanceof Error ? error.message : 'Could not submit survey response.',
        tone: 'error',
      })
    } finally {
      setSurveySubmitting(false)
    }
  }

  const recordFocusModeSession = useCallback((durationMs: number) => {
    const safeDuration = Math.max(0, Math.round(durationMs))
    if (safeDuration < 1000) return
    const current = userSettingsRef.current
    const next = normalizeUserSettings({
      ...current,
      editorFocusModeTotalMs: current.editorFocusModeTotalMs + safeDuration,
      updatedAt: nowIso(),
    })
    void settingsStore.save(next)
    setUserSettings(next)
  }, [])

  const runProfileNextAction = () => {
    setProfileModalOpen(false)
    if (profileNextAction.kind === 'newNote') {
      openTemplateChooser()
      return
    }
    if (profileNextAction.kind === 'continueNote') {
      openNote(profileNextAction.noteId)
      return
    }
    if (profileNextAction.kind === 'openAtoms') {
      setActiveView('atoms')
      setAtomSubView('atoms')
      return
    }
    setSelectedProjectId('')
    setActiveView('projects')
  }

  const toggleEditorAtomUnderlines = () => {
    setAtomUnderlinesVisible((visible) => !visible)
  }

  const toggleEditorFocusMode = () => {
    setEditorFocusMode((enabled) => !enabled)
  }

  const toggleEditorAuthenticWriterMode = () => {
    setEditorAuthenticWriterMode((enabled) => !enabled)
  }

  const updateEditorDefault = (patch: Pick<Partial<UserSettings>, 'editorAtomUnderlinesDefault' | 'editorFocusModeDefault' | 'editorAuthenticWriterDefault' | 'editorShowMarginalia'>) => {
    updateUserSettings(patch)
    if (typeof patch.editorAtomUnderlinesDefault === 'boolean') setAtomUnderlinesVisible(patch.editorAtomUnderlinesDefault)
    if (typeof patch.editorFocusModeDefault === 'boolean') {
      setEditorFocusMode(patch.editorFocusModeDefault)
      setEditorFocusModeVisual(patch.editorFocusModeDefault)
    }
    if (typeof patch.editorAuthenticWriterDefault === 'boolean') setEditorAuthenticWriterMode(patch.editorAuthenticWriterDefault)
    if (typeof patch.editorShowMarginalia === 'boolean') setEditorCityMarginaliaOpacity(patch.editorShowMarginalia ? 1 : 0)
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
    const options = { ownerAccountId: authSession.accountId, permission, note: noteToShare }
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
    const options = { ownerAccountId: authSession.accountId, permission: 'edit' as const, note }
    const share = selectedCommunityFriend
      ? await sharingService.sendNoteToFriend(note.id, selectedCommunityFriend, options)
      : await sharingService.sendNoteToGroup(note.id, selectedCommunityGroup as FriendGroup, options)
    const session = await collaborationService.createSession({
      localNoteId: note.id,
      shareId: share.id,
      ownerAccountId: authSession.accountId,
      title: note.title || 'Untitled collaboration',
    })
    const shareWithSession = await sharingService.attachCollaborationSession(share.id, session.id) ?? share
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
    setSharedNoteExports((current) => [shareWithSession, ...current])
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
      temperature: userSettings.aiTemperature,
      maxTokens: userSettings.aiMaxTokens,
      signal,
    })
  }

  const buildAIContext = (taskType: AITaskType, selection?: EditorRange) => {
    const appParts = [`Current view: ${activeView}`]
    if (selectedNote && userSettings.aiIncludeNoteTitle) appParts.push(`Note title: ${selectedNote.title}`)
    if (selectedProject) appParts.push(`Project: ${selectedProject.name}`)
    if (selectedNote) appParts.push(`Template: ${selectedNote.templateId}`)
    const items: AIContextDraftItem[] = [{
      id: 'app',
      label: 'App context',
      sensitivity: 'low',
      enabledByPolicy: true,
      content: `App context:\n${appParts.join('\n')}`,
    }]
    const projectMemory = parseProjectMemory(selectedProject?.description ?? '')
    if (projectMemory.summary.trim()) {
      items.push({ id: 'project-summary', label: 'Project summary', sensitivity: 'medium', enabledByPolicy: true, content: `Project summary:\n${projectMemory.summary.trim()}` })
    }
    if (projectMemory.instructions.trim()) {
      items.push({ id: 'project-instructions', label: 'Project instructions', sensitivity: 'medium', enabledByPolicy: true, content: `Project instructions:\n${projectMemory.instructions.trim()}` })
    }
    if (taskUsesWritingStyle(taskType) && projectMemory.writingStyle.trim()) {
      items.push({ id: 'project-writing-style', label: 'Project writing style', sensitivity: 'medium', enabledByPolicy: true, content: `Project writing style:\n${projectMemory.writingStyle.trim()}` })
    }
    if (taskType === 'mark_writing') {
      const criteria = projectMemory.markingCriteria.trim() || aiMarkingCriteria.trim() || DEFAULT_MARKING_CRITERIA
      items.push({ id: 'marking-criteria', label: 'Marking criteria', sensitivity: 'medium', enabledByPolicy: true, content: `${projectMemory.markingCriteria.trim() ? 'Project marking criteria' : 'Default marking criteria'}:\n${criteria}` })
    }
    if (selectedProject) {
      const styleSamples = notes
        .filter((note) => note.projectId === selectedProject.id && note.id !== selectedNote?.id)
        .sort(sortByUpdated)
        .slice(0, 3)
        .map((note) => `${note.title}: ${collectNotePreviewLines(note.content, 3).join(' ') || collectText(note.content).slice(0, 260)}`)
        .filter((sample) => sample.trim().length > 0)
      if (styleSamples.length) {
        items.push({ id: 'style-samples', label: 'Writing style samples', sensitivity: 'high', enabledByPolicy: taskUsesWritingStyle(taskType), content: `Writing style signals from this project:\n${styleSamples.join('\n')}` })
      }
    }
    if (editor) {
      const { from, to } = selection ?? editor.state.selection
      const selectedText = selection ? editor.state.doc.textBetween(from, to, ' ').trim() : ''
      if (selectedText) items.push({ id: 'selected-text', label: 'Selected text', sensitivity: 'high', enabledByPolicy: userSettings.aiIncludeSelectedText, content: `Selected text:\n${selectedText}` })
      const nearbyStart = Math.max(0, from - 900)
      const nearbyEnd = Math.min(editor.state.doc.content.size, to + 900)
      const nearby = editor.state.doc.textBetween(nearbyStart, nearbyEnd, '\n').trim()
      if (nearby && nearby !== selectedText) items.push({ id: 'nearby-context', label: 'Nearby editor context', sensitivity: 'high', enabledByPolicy: userSettings.aiIncludeNoteExcerpt, content: `Nearby editor context:\n${nearby}` })
    }
    if (selectedNote) {
      const outline = collectNotePreviewLines(selectedNote.content, 8).join('\n')
      if (outline) items.push({ id: 'note-outline', label: 'Compact note outline', sensitivity: 'high', enabledByPolicy: userSettings.aiIncludeNoteExcerpt, content: `Compact note outline:\n${outline}` })
      const excerptLimit = taskType === 'summarize_note' || taskType === 'answer_with_context' || taskType === 'atom_task' || taskType === 'ai_atomise' || taskType === 'mark_writing' || taskType === 'update_project_instructions' ? 4200 : 1600
      const excerpt = collectText(selectedNote.content).slice(0, excerptLimit)
      if (excerpt) items.push({ id: 'note-excerpt', label: 'Note excerpt', sensitivity: 'high', enabledByPolicy: userSettings.aiIncludeNoteExcerpt, content: `${excerptLimit > 1600 ? 'Bounded note excerpt' : 'Short note excerpt'}:\n${excerpt}` })
    }
    const activeRange = selection ?? (editor ? { from: editor.state.selection.from, to: editor.state.selection.to } : undefined)
    const highlighted = activeRange ? highlightedFormatBlock(activeRange) : null
    const highlightedType = highlighted ? formatBlockTypeForBlock(highlighted.block) : null
    if (highlighted && highlightedType === 'table') {
      const tableNode = blockContentNodes(highlighted.block.content).find((node) => node.type === 'table')
      if (tableNode) {
        const table = tableDataFromNode(tableNode)
        items.push({ id: 'highlighted-table', label: 'Highlighted table block', sensitivity: 'high', enabledByPolicy: true, content: `Highlighted table block JSON:\n${JSON.stringify({ blockId: highlighted.block.id, columns: table.columns, rows: table.rows })}` })
      }
    }
    if (highlighted && highlightedType === 'quote') {
      const quoteNode = blockContentNodes(highlighted.block.content).find((node) => node.type === 'lociQuote' || node.type === 'blockquote')
      if (quoteNode) {
        items.push({ id: 'highlighted-quote', label: 'Highlighted quote block', sensitivity: 'high', enabledByPolicy: true, content: `Highlighted quote block JSON:\n${JSON.stringify({ blockId: highlighted.block.id, ...quoteDataFromNode(quoteNode) })}` })
      }
    }
    if (highlighted && (highlightedType === 'checklist' || highlightedType === 'bulletList' || highlightedType === 'numberedList')) {
      const listNode = blockContentNodes(highlighted.block.content).find((node) => node.type === 'taskList' || node.type === 'bulletList' || node.type === 'orderedList')
      if (listNode) items.push({ id: 'highlighted-list', label: 'Highlighted list block', sensitivity: 'high', enabledByPolicy: true, content: `Highlighted list block JSON:\n${JSON.stringify({ blockId: highlighted.block.id, ...listDataFromNode(listNode) })}` })
    }
    if (highlighted && highlightedType === 'code') {
      const codeNode = blockContentNodes(highlighted.block.content).find((node) => node.type === 'codeBlock')
      if (codeNode) items.push({ id: 'highlighted-code', label: 'Highlighted code block', sensitivity: 'high', enabledByPolicy: true, content: `Highlighted code block:\n${codeDataFromNode(codeNode)}` })
    }
    if (highlighted && highlightedType === 'latex') {
      const latexNode = blockContentNodes(highlighted.block.content).find((node) => node.type === 'lociLatex')
      if (latexNode) items.push({ id: 'highlighted-latex', label: 'Highlighted LaTeX block', sensitivity: 'high', enabledByPolicy: true, content: `Highlighted LaTeX block JSON:\n${JSON.stringify({ blockId: highlighted.block.id, latex: latexDataFromNode(latexNode) })}` })
    }
    return buildAIContextFromPolicy(items, 'directByok')
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
    const aiContext = buildAIContext(taskType, selection)
    const context = aiContext.text
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
        temperature: userSettings.aiTemperature,
        maxTokens: userSettings.aiMaxTokens,
        contextManifest: aiContext.manifest,
        signal: controller.signal,
      })
      const { responseText, usage } = result
      const insertableResponse = cleanAIDraftFormatting(sanitizeAIInsertText(responseText))
      const activeRange = selection ?? (editor ? { from: editor.state.selection.from, to: editor.state.selection.to } : undefined)
      const highlighted = activeRange ? highlightedFormatBlock(activeRange) : null
      const highlightedType = highlighted ? formatBlockTypeForBlock(highlighted.block) : null
      const blockPayload: AIBlockPayload | undefined =
        taskType === 'table_block'
          ? {
              kind: 'table',
              data: parseAITablePayload(responseText),
              targetBlockId: highlightedType === 'table' ? highlighted?.block.id : undefined,
            }
          : taskType === 'quote_block'
            ? {
                kind: 'quote',
                data: parseAIQuotePayload(responseText),
                targetBlockId: highlightedType === 'quote' ? highlighted?.block.id : undefined,
              }
            : taskType === 'list_block'
              ? {
                  kind: 'list',
                  data: parseAIListPayload(responseText),
                  targetBlockId: highlightedType === 'checklist' || highlightedType === 'bulletList' || highlightedType === 'numberedList' ? highlighted?.block.id : undefined,
                }
              : taskType === 'code_block'
                ? {
                    kind: 'code',
                    data: parseAICodePayload(responseText),
                    targetBlockId: highlightedType === 'code' ? highlighted?.block.id : undefined,
                  }
                : taskType === 'latex_block'
                  ? {
                      kind: 'latex',
                      data: parseAILatexPayload(responseText),
                      targetBlockId: highlightedType === 'latex' ? highlighted?.block.id : undefined,
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
      const isEditorCloseShortcut =
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        activeView === 'editor' &&
        Boolean(selectedNoteIdRef.current) &&
        !appDialog &&
        !atomDialog &&
        !noteHistoryOpen &&
        !profileModalOpen &&
        !searchOpen &&
        !settingsModalOpen &&
        !templateProjectId
      if (isEditorCloseShortcut && event.key.toLowerCase() === 'w' && !event.repeat) {
        event.preventDefault()
        closeSidebarNote(selectedNoteIdRef.current)
        return
      }
      if (isEditorCloseShortcut && event.key.toLowerCase() === 'q' && !event.repeat) {
        const currentNote = notesRef.current.find((note) => note.id === selectedNoteIdRef.current)
        if (currentNote) {
          event.preventDefault()
          closeSidebarProject(projectSectionIdForNote(currentNote))
        }
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
  }, [activeEditorPanel, activeView, aiPromptFocused, appDialog, atomDialog, clearAIContextRange, closeAppDialog, closeSearch, closeSidebarNote, closeSidebarProject, imageCropEditing, localProfile, noteHistoryOpen, profileModalOpen, projectSectionIdForNote, searchOpen, settingsModalOpen, switchToPreviousOpenedNote, templateProjectId])

  
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
          showNotification({ message: 'Note restored from history.', tone: 'success' })
        },
      })
    },
    [editor, persistNote, showNotification],
  )

  const openTemplateChooser = (projectOverrideId?: string) => {
    setActiveEditorPanel(null)
    if (!RELEASE_TEMPLATE_CHOOSER_ENABLED) {
      void createNoteFromTemplate('blank', projectOverrideId)
      return
    }
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
    showNotification({ message: 'New note created.', tone: 'success' })
  }

  const persistTemplateData = (templateData: NoteTemplateData) => {
    void persistNote({ templateData, content: templateDataToContent(templateData) })
  }

  const persistBlocks = (blocks: LociBlock[]) => {
    if (!selectedNote) return
    const content = contentFromBlocks(blocks)
    lastLocalEditorContentRef.current = { noteId: selectedNote.id, contentKey: editorContentKey(content) }
    const templateData = updatePrimaryTemplateContent(selectedNote, content)
    void persistNote({ blocks, templateData, content: templateDataToContent(templateData) })
    if (editor) {
      const before = debugEditorState(editor)
      preserveEditorScroll(() => {
        suppressEditorPersistRef.current = true
        editor.commands.setContent(content, { emitUpdate: false })
        suppressEditorPersistRef.current = false
      })
      debugEditorLog('setContent', {
        reason: 'persist-blocks',
        before,
        after: debugEditorState(editor),
        contentBlocks: content.content?.length ?? 0,
        noteId: selectedNote.id,
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
      const touchesBlock = range.from === range.to
        ? range.from >= blockFrom && range.from <= blockTo
        : range.from < blockTo && range.to > blockFrom
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

  const {
    queueFloatingToolbarRemeasure,
    scheduleFloatingToolbarPosition,
    updateFloatingToolbarPosition,
  } = useFloatingEditorToolbarLayout({
    activeView,
    appFullscreen,
    appImmersiveFullscreen,
    appShellRef,
    fullscreenExitStaging,
    selectedNoteId,
    sidebarRevealAnimating,
    toolbarRef: floatingEditorWrapRef,
  })

  const { markActiveEditorBlock } = useFocusModePlugin({
    editor,
    isFocusMode: editorFocusMode && activeView === 'editor',
    scrollContainerRef: documentScrollRef,
  })

  useEffect(() => {
    const isTracking = editorFocusMode && activeView === 'editor'
    if (isTracking && editorFocusModeStartedAtRef.current === null) {
      editorFocusModeStartedAtRef.current = Date.now()
      return
    }
    if (!isTracking && editorFocusModeStartedAtRef.current !== null) {
      const startedAt = editorFocusModeStartedAtRef.current
      editorFocusModeStartedAtRef.current = null
      recordFocusModeSession(Date.now() - startedAt)
    }
  }, [activeView, editorFocusMode, recordFocusModeSession])

  useEffect(() => () => {
    if (editorFocusModeStartedAtRef.current === null) return
    const startedAt = editorFocusModeStartedAtRef.current
    editorFocusModeStartedAtRef.current = null
    recordFocusModeSession(Date.now() - startedAt)
  }, [recordFocusModeSession])

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
    return () => {
      editor.off('selectionUpdate', scheduleFormatSideControls)
      editor.off('selectionUpdate', markActiveEditorBlock)
      editor.off('transaction', scheduleFormatSideControls)
      editor.off('transaction', scheduleBlockControls)
      editor.off('transaction', markActiveEditorBlock)
      window.removeEventListener('resize', scheduleEditorResizeMeasurements)
      documentScrollRef.current?.removeEventListener('scroll', scheduleFormatSideControls)
      documentScrollRef.current?.removeEventListener('scroll', scheduleBlockControls)
      if (editorResizeFrameRef.current) {
        cancelAnimationFrame(editorResizeFrameRef.current)
        editorResizeFrameRef.current = null
      }
    }
  }, [editor, markActiveEditorBlock, measureBlockControls, scheduleBlockControls, scheduleEditorResizeMeasurements, scheduleFormatSideControls, syncFormatSideControls])

  useEffect(() => {
    markActiveEditorBlock()
    scheduleEditorResizeMeasurements()
    queueFloatingToolbarRemeasure(180)
  }, [editorFocusMode, markActiveEditorBlock, queueFloatingToolbarRemeasure, scheduleEditorResizeMeasurements])

  const insertBlock = (blockId: string, type: LociBlockType, placement: 'before' | 'after' = 'after') => {
    if (!selectedBlocks.length) return
    const newBlock = createLociBlock(blankContentForBlockType(type), type)
    const nextBlocks = insertBlockRelative(selectedBlocks, blockId, newBlock, placement)
    persistBlocks(nextBlocks)
    setBlockPicker({ open: false, blockId: '', placement: 'after', query: '' })
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
    const previousBlocks = selectedBlocks
    const content = aiGeneratedContent(
      payload.kind === 'table'
        ? tableBlockDocFromData(payload.data.columns, payload.data.rows)
        : payload.kind === 'quote'
          ? quoteBlockDocFromData(payload.data.quote, payload.data.author)
          : payload.kind === 'list'
            ? listBlockDocFromData(payload.data.listType, payload.data.items)
            : payload.kind === 'code'
              ? codeBlockDocFromData(payload.data.code)
              : latexBlockDoc(payload.data.latex),
    )
    const type: LociBlockType =
      payload.kind === 'table'
        ? 'table'
        : payload.kind === 'quote'
          ? 'quote'
          : payload.kind === 'list'
            ? payload.data.listType
            : payload.kind === 'code'
              ? 'code'
              : 'latex'
    const flatBlocks = selectedBlocksRef.current
    const targetIndex = payload.targetBlockId ? flatBlocks.findIndex((block) => block.id === payload.targetBlockId) : -1
    const targetBlock = targetIndex >= 0 ? flatBlocks[targetIndex] : null
    const targetFormatType = targetBlock ? formatBlockTypeForBlock(targetBlock) : null
    const canUpdateTarget = targetBlock && (
      targetBlock.type === type ||
      targetFormatType === type ||
      (payload.kind === 'list' && (targetFormatType === 'checklist' || targetFormatType === 'bulletList' || targetFormatType === 'numberedList'))
    )
    const nextBlocks = canUpdateTarget && targetBlock
      ? updateBlockById(selectedBlocks, targetBlock.id, (block) => ({
        ...block,
        type,
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
    showNotification({
      message: 'AI block inserted.',
      tone: 'success',
      actions: [{
        label: 'Undo',
        intent: 'primary',
        onClick: () => {
          persistBlocks(previousBlocks)
          showNotification({ message: 'AI block undone.', tone: 'success' })
        },
      }],
    })
  }

  const activeBlockIndex = (currentEditor = editor) => {
    const fallbackIndex = Math.max(0, selectedBlocksRef.current.length - 1)
    if (!currentEditor || currentEditor.isDestroyed) return fallbackIndex
    const index = currentEditor.state.selection.$from.index(0)
    return Math.max(0, Math.min(Math.max(0, currentEditor.state.doc.childCount - 1), index))
  }

  const runTableCommand = (command: 'addRow' | 'removeRow' | 'addColumn' | 'removeColumn' | 'toggleHeader' | 'alignLeft' | 'alignCenter' | 'alignRight' | 'resetSize' | 'mergeCells' | 'splitCell') => {
    if (!editor) return
    const chain = editor.chain().focus()
    if (command === 'addRow') chain.addRowAfter().run()
    if (command === 'removeRow') chain.deleteRow().run()
    if (command === 'addColumn') chain.addColumnAfter().run()
    if (command === 'removeColumn') chain.deleteColumn().run()
    if (command === 'toggleHeader') chain.toggleHeaderRow().run()
    if (command === 'alignLeft') chain.setCellAttribute('align', 'left').run()
    if (command === 'alignCenter') chain.setCellAttribute('align', 'center').run()
    if (command === 'alignRight') chain.setCellAttribute('align', 'right').run()
    if (command === 'resetSize') chain.setCellAttribute('colwidth', null).run()
    if (command === 'mergeCells') chain.mergeCells().run()
    if (command === 'splitCell') chain.splitCell().run()
    requestAnimationFrame(syncFormatSideControls)
  }

  const addLineToActiveListFromControls = () => {
    if (!addRowToActiveList()) showNotice('Click inside a list first.')
    requestAnimationFrame(syncFormatSideControls)
  }

  const copyActiveCodeBlock = () => {
    if (!editor) return
    const { $from } = editor.state.selection
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      const node = $from.node(depth)
      if (node.type.name === 'codeBlock') {
        void copyToClipboard(node.textContent)
        showNotice('Code copied.')
        return
      }
    }
  }

  const activeLatexSource = () => {
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const activeLatex = activeElement?.closest<HTMLElement>('.loci-latex')
    if (activeLatex?.dataset.latex !== undefined) return activeLatex.dataset.latex
    if (!editor) return ''
    const { $from } = editor.state.selection
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      const node = $from.node(depth)
      if (node.type.name === 'lociLatex') return String(node.attrs.latex ?? '')
    }
    return ''
  }

  const copyActiveLatex = () => {
    const source = activeLatexSource()
    if (!source) return
    void copyToClipboard(source)
    showNotice('Equation copied.')
  }

  const toggleActiveLatexEditor = () => {
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const activeLatex = activeElement?.closest<HTMLElement>('.loci-latex') ?? document.querySelector<HTMLElement>('.loci-latex.ProseMirror-selectednode')
    if (!activeLatex) return
    activeLatex.classList.toggle('is-editing')
    if (activeLatex.classList.contains('is-editing')) activeLatex.querySelector<HTMLTextAreaElement>('.loci-latex-source')?.focus()
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
      <FormatSideControls
        key={activeFormatBlockId || formatSideControls.blockId}
        type={formatSideControls.type}
        top={formatSideControls.top}
        left={formatSideControls.left}
        imageCropEditing={imageCropEditing}
        onTableCommand={runTableCommand}
        onAddListLine={addLineToActiveListFromControls}
        onCopyCode={copyActiveCodeBlock}
        onEditLatex={toggleActiveLatexEditor}
        onCopyLatex={copyActiveLatex}
        onToggleQuoteAuthor={toggleQuoteAuthor}
        onFitImage={() => updateImageAttributes({ width: 100, cropMode: 'contain', aspect: 'auto', offsetX: 50, offsetY: 50, zoom: 100 })}
        onToggleCrop={() => {
          if (imageCropEditing) {
            setImageCropEditing(false)
            return
          }
          const attrs = currentImageAttrs()
          updateImageAttributes({ cropMode: 'cover', aspect: attrs.aspect === 'auto' ? 'wide' : attrs.aspect, zoom: Math.max(120, attrs.zoom) })
          setImageCropEditing(true)
        }}
        onCycleAspect={cycleImageAspect}
        onZoomOut={() => zoomImage(-10)}
        onZoomIn={() => zoomImage(10)}
        onAlignImage={(align) => updateImageAttributes({ align })}
      />
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
    const positionStyle = authorshipMenuPosition(event.clientX, event.clientY)
    setAuthorshipMenu({
      from,
      to,
      ...positionStyle,
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
        const destinationProjectId = note.projectId !== UNASSIGNED_PROJECT_ID && projects.some((project) => project.id === note.projectId)
          ? note.projectId
          : ''
        notesRef.current = remaining
        setNotes(remaining)
        if (selectedNoteIdRef.current === note.id) {
          setSelectedNoteId('')
        }
        setSelectedProjectId(destinationProjectId)
        setActiveView('projects')
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
          showNotification({ message: 'Note restored.', tone: 'success' })
        }
        showNotification({
          id: `delete-note-${note.id}`,
          message: 'Note deleted.',
          tone: 'warning',
          persist: true,
          actions: [{ label: 'Undo', onClick: restore, intent: 'primary' }],
        })
        const timer = setTimeout(() => {
          optimisticDeleteTimersRef.current.delete(note.id)
          dismissNotification(`delete-note-${note.id}`)
          void notesStore.deleteWithSnapshots(note.id).catch(() => {
            notesRef.current = previousNotes
            setNotes(previousNotes)
            showNotification({ message: 'Could not delete the note. It has been restored.', tone: 'error' })
          })
        }, OPTIMISTIC_UNDO_MS)
        optimisticDeleteTimersRef.current.set(note.id, timer)
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
    showNotification({ message: 'Note duplicated.', tone: 'success' })
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
        showNotification({
          message: `${atomIds.length} atom${atomIds.length === 1 ? '' : 's'} deleted.`,
          tone: 'success',
        })
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
    await flashcardSetsStore.save(next)
    setFlashcardSets((current) =>
      [next, ...current.filter((set) => set.id !== next.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    )
    setEditingFlashcardSetId(null)
    setAtomSubView('sets')
    showNotification({ message: existing ? 'Set updated.' : 'Set created.', tone: 'success' })
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
          setStudyingFlashcardSetId(null)
          setAtomSubView('sets')
        }
        showNotification({ message: 'Set deleted.', tone: 'success' })
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
    const shuffleStudy = userSettings.studyShuffleDefault
    const nextIds = shuffleStudy ? shuffleList(availableIds) : availableIds
    if (!nextIds.length) {
      showNotification({ message: 'This set has no available atoms to study.', tone: 'warning' })
      return
    }
    const now = nowIso()
    const updatedSet = { ...set, lastStudiedAt: now }
    await flashcardSetsStore.save(updatedSet)
    setFlashcardSets((current) => current.map((item) => (item.id === set.id ? updatedSet : item)))
    setStudyingFlashcardSetId(set.id)
    setStudyAtomIds(nextIds)
    setStudyIndex(0)
    setStudyFlipped(false)
    setStudyDirection(userSettings.studyDefaultDirection)
    setStudyShuffle(shuffleStudy)
    setStudyKnownAtomIds([])
    setStudyLearningAtomIds([])
    setAtomSubView('study')
  }

  const restoreDeletedProject = async ({
    project,
    projectNotes,
    projectSnapshots,
    deletedAtoms,
    previousSets,
  }: {
    project: Project
    projectNotes: Note[]
    projectSnapshots: NoteSnapshot[]
    deletedAtoms: Atom[]
    previousSets: FlashcardSet[]
  }) => {
    await projectsStore.save(project)
    if (projectNotes.length) await notesStore.saveMany(projectNotes)
    if (projectSnapshots.length) await db.noteSnapshots.bulkPut(projectSnapshots)
    if (deletedAtoms.length) await atomsStore.saveMany(deletedAtoms)
    if (previousSets.length) await flashcardSetsStore.saveMany(previousSets)
    setProjects((current) => [...current, project].sort((a, b) => a.name.localeCompare(b.name)))
    setNotes((current) => [...projectNotes, ...current].sort(sortByUpdated))
    setAtoms((current) => [...deletedAtoms, ...current.filter((atom) => !deletedAtoms.some((deleted) => deleted.id === atom.id))])
    if (previousSets.length) {
      setFlashcardSets((current) =>
        [...previousSets, ...current.filter((set) => !previousSets.some((previous) => previous.id === set.id))]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      )
    }
    setSelectedProjectId(project.id)
    setActiveView('projects')
    showNotification({ message: 'Project restored.', tone: 'success' })
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
        const projectSnapshots = snapshots.filter((snapshot) => projectNoteIds.has(snapshot.noteId))
        const previousSets = flashcardSets.filter((set) => set.atomIds.some((atomId) => atomIdsToDelete.includes(atomId)))
        const deletedAtoms = atoms.filter((atom) => atomIdsToDelete.includes(atom.id))

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
        showNotification({
          id: `delete-project-${projectId}`,
          message: 'Project deleted.',
          tone: 'warning',
          persist: true,
          actions: [{
            label: 'Undo',
            intent: 'primary',
            onClick: () => restoreDeletedProject({ project, projectNotes, projectSnapshots, deletedAtoms, previousSets }),
          }],
        })
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
        showNotification({ message: 'Project created.', tone: 'success' })
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
    showNotification({ message: 'Project duplicated.', tone: 'success' })
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
    showNotification({
      message: markCount > 1 ? `Atomised ${markCount} matches.` : existing ? 'Atom updated.' : 'Atom created.',
      tone: 'success',
    })
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

  const replaceSelectionWithAIResult = (result: AIResult) => {
    if (!editor || !result.selection) return
    const selection = result.selection
    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .deleteSelection()
      .insertContent(aiGeneratedContent(textToEditorContent(result.draftText)).content ?? [])
      .run()
    showNotification({
      message: 'AI rewrite inserted.',
      tone: 'success',
      actions: [{
        label: 'Undo',
        intent: 'primary',
        onClick: () => {
          editor.chain().focus().undo().run()
          showNotification({ message: 'AI rewrite undone.', tone: 'success' })
        },
      }],
    })
  }

  const insertAIResultDraft = (result: AIResult) => {
    if (!editor) return
    insertDraftText(editor, result.draftText)
    showNotification({
      message: 'AI draft inserted.',
      tone: 'success',
      actions: [{
        label: 'Undo',
        intent: 'primary',
        onClick: () => {
          editor.chain().focus().undo().run()
          showNotification({ message: 'AI insert undone.', tone: 'success' })
        },
      }],
    })
  }

  const applyHighlightToSelection = (color = userSettings.highlighterColor || DEFAULT_HIGHLIGHTER_COLOR) => {
    if (!editor || editor.state.selection.empty) return false
    editor.chain().focus().setHighlight({ color }).run()
    setHighlighterArmed(false)
    setHighlightPaletteOpen(false)
    lastPaintedHighlightRangeRef.current = ''
    return true
  }

  const toggleHighlighterMode = () => {
    if (!editor) return
    setHighlightPaletteOpen(false)
    if (applyHighlightToSelection()) return
    setHighlighterArmed((armed) => !armed)
    lastPaintedHighlightRangeRef.current = ''
    editor.chain().focus().run()
  }

  const openHighlightPalette = () => {
    setHighlightPaletteOpen(true)
  }

  const toggleHighlight = (color = userSettings.highlighterColor || DEFAULT_HIGHLIGHTER_COLOR) => {
    if (!editor) return
    if (applyHighlightToSelection(color)) return
    setHighlighterArmed((armed) => !armed)
    setHighlightPaletteOpen(false)
    lastPaintedHighlightRangeRef.current = ''
    editor.chain().focus().run()
  }

  const selectHighlighterColor = (color: string) => {
    updateUserSettings({ highlighterColor: color })
    setHighlightPaletteOpen(false)
    setHighlighterArmed(false)
    lastPaintedHighlightRangeRef.current = ''
    if (editor) {
      editor.chain().focus().run()
      return
    }
  }

  const exportCurrentNotePdf = async () => {
    try {
      await exportNotePdf(selectedNote, selectedProject)
      showNotification({ message: 'PDF exported.', tone: 'success' })
    } catch (error) {
      console.error('Could not export PDF', error)
      showNotification({ message: 'Could not export PDF.', tone: 'error' })
    }
  }

  const exportCurrentNoteDocx = async () => {
    try {
      await exportNoteDocx(selectedNote, selectedProject, atoms)
      showNotification({ message: 'DOCX exported.', tone: 'success' })
    } catch (error) {
      console.error('Could not export DOCX', error)
      showNotification({ message: 'Could not export DOCX.', tone: 'error' })
    }
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
      icon: CheckSquare,
      description: 'Turn lines into tappable tasks.',
      group: 'Structure',
      enabled: true,
      action: () => applyListFormat('checklist'),
    },
    {
      id: 'bullet-list',
      label: 'Bullet list',
      icon: List,
      description: 'Turn lines into dot points.',
      group: 'Structure',
      enabled: true,
      action: () => applyListFormat('bulletList'),
    },
    {
      id: 'numbered-list',
      label: 'Numbered list',
      icon: ListOrdered,
      description: 'Turn lines into ordered steps.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
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
      id: 'code',
      label: 'Code',
      icon: Code2,
      description: 'Insert a formatted code block.',
      group: 'Structure',
      enabled: true,
      action: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'latex',
      label: 'LaTeX',
      icon: Radical,
      description: 'Insert an equation block.',
      group: 'Structure',
      enabled: true,
      action: () => {
        const blocks = selectedBlocksRef.current
        const targetBlockId = blocks[activeBlockIndex()]?.id
        if (targetBlockId) insertBlock(targetBlockId, 'latex', 'after')
        else editor?.chain().focus().insertContent(latexBlockDoc().content?.[0] ?? { type: 'lociLatex', attrs: { latex: '' } }).run()
      },
    },
    {
      id: 'divider',
      label: 'Divider',
      icon: Minus,
      description: 'Separate sections with a rule.',
      group: 'Structure',
      enabled: true,
      action: () => {
        const blocks = selectedBlocksRef.current
        const targetBlockId = blocks[activeBlockIndex()]?.id
        if (targetBlockId) insertBlock(targetBlockId, 'divider', 'after')
        else editor?.chain().focus().setHorizontalRule().run()
      },
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
    setFullscreenExitStaging(false)
  }

  const beginLayoutTransition = (durationMs = LAYOUT_TRANSITION_MS) => {
    if (layoutTransitionTimeoutRef.current) clearTimeout(layoutTransitionTimeoutRef.current)
    setLayoutTransitioning(true)
    layoutTransitionTimeoutRef.current = setTimeout(() => {
      layoutTransitionTimeoutRef.current = null
      setLayoutTransitioning(false)
    }, durationMs)
  }

  const resetImmersiveTopExitArm = () => {
    immersiveTopExitArmedAtRef.current = 0
    immersiveTopExitLastWheelAtRef.current = 0
  }

  const toggleAppFullscreen = () => {
    endSidebarRevealAnimation()
    resetImmersiveTopExitArm()
    beginLayoutTransition()
    setAppFullscreen((active) => {
      const next = !active
      if (!next) setAppImmersiveFullscreen(false)
      return next
    })
    queueFloatingToolbarRemeasure(220)
  }

  const switchActiveView = (view: View) => {
    if (view !== activeView) beginLayoutTransition(240)
    setActiveView(view)
  }

  const stageExitToSidebarScreen = () => {
    if (fullscreenExitStaging || sidebarRevealAnimating) return
    clearSidebarRevealTimers()
    resetImmersiveTopExitArm()
    beginLayoutTransition(TRUE_FULLSCREEN_EXIT_STAGE_MS + SIDEBAR_REVEAL_STAGE_MS + 80)
    setFullscreenExitStaging(true)
    setAppImmersiveFullscreen(false)
    queueFloatingToolbarRemeasure(220)
    sidebarRevealTimeoutRef.current = setTimeout(() => {
      sidebarRevealTimeoutRef.current = null
      setSidebarRevealAnimating(true)
      setAppFullscreen(false)
      queueFloatingToolbarRemeasure(220)
      sidebarRevealCleanupTimeoutRef.current = setTimeout(() => {
        sidebarRevealCleanupTimeoutRef.current = null
        setSidebarRevealAnimating(false)
        setFullscreenExitStaging(false)
        beginLayoutTransition(120)
      }, SIDEBAR_REVEAL_STAGE_MS)
    }, TRUE_FULLSCREEN_EXIT_STAGE_MS)
  }

  const handleAppShellWheel = (event: WheelEvent<HTMLElement>) => {
    const now = window.performance.now()
    if (fullscreenExitStaging || sidebarRevealAnimating) {
      event.preventDefault()
      return
    }
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

    if (appFullscreen && appImmersiveFullscreen && verticalIntent && event.deltaY > 6) {
      resetImmersiveTopExitArm()
    }

    if (appFullscreen && appImmersiveFullscreen && verticalIntent && event.deltaY < -6) {
      const activeScrollable = resolveActiveScrollable()
      const atTop = !activeScrollable || activeScrollable.scrollTop <= 1
      if (!atTop) {
        resetImmersiveTopExitArm()
        return
      }

      event.preventDefault()
      const armedAt = immersiveTopExitArmedAtRef.current
      const armedRecently = armedAt > 0 && now - armedAt <= IMMERSIVE_TOP_EXIT_WINDOW_MS
      const sameWheelGesture = immersiveTopExitLastWheelAtRef.current > 0 && now - immersiveTopExitLastWheelAtRef.current < IMMERSIVE_TOP_EXIT_QUIET_MS
      immersiveTopExitLastWheelAtRef.current = now
      if (!armedRecently) {
        immersiveTopExitArmedAtRef.current = now
        sidebarFlickAtRef.current = now
        return
      }
      if (sameWheelGesture) {
        sidebarFlickAtRef.current = now
        return
      }

      resetImmersiveTopExitArm()
      sidebarFlickAtRef.current = now
      beginLayoutTransition(260)
      setAppImmersiveFullscreen(false)
      queueFloatingToolbarRemeasure(220)
      return
    }

    if (appFullscreen && !appImmersiveFullscreen && verticalIntent && Math.abs(event.deltaY) > 6) {
      resetImmersiveTopExitArm()
      sidebarFlickAtRef.current = now
      event.preventDefault()
      beginLayoutTransition(260)
      setAppImmersiveFullscreen(true)
      queueFloatingToolbarRemeasure(220)
      return
    }

    const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.35
    if (!horizontalIntent || Math.abs(event.deltaX) < SIDEBAR_FLICK_THRESHOLD) return

    const nextFullscreen = event.deltaX > 0 ? true : false
    if (nextFullscreen === appFullscreen) return

    sidebarFlickAtRef.current = now
    resetImmersiveTopExitArm()

    event.preventDefault()
    if (!nextFullscreen && appFullscreen) {
      if (!appImmersiveFullscreen) {
        endSidebarRevealAnimation()
        beginLayoutTransition()
        setAppFullscreen(false)
        queueFloatingToolbarRemeasure(220)
        return
      }
      stageExitToSidebarScreen()
      return
    }

    endSidebarRevealAnimation()
    beginLayoutTransition()
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
  const themeOptions = [
    { value: 'loci', label: 'Loci' },
    { value: 'light', label: 'Light · coming soon', disabled: true },
    { value: 'dark', label: 'Dark · coming soon', disabled: true },
    { value: 'system', label: 'System · coming soon', disabled: true },
  ] satisfies Array<{ value: UserSettings['theme']; label: string; disabled?: boolean }>
  const studyWorkspaceOptions = [
    { value: 'atoms', label: 'Atoms' },
    { value: 'sets', label: 'Sets' },
  ] satisfies Array<{ value: 'atoms' | 'sets'; label: string }>
  const studyDirectionOptions = [
    { value: 'term', label: 'Term first' },
    { value: 'definition', label: 'Definition first' },
  ] satisfies Array<{ value: StudyDirection; label: string }>
  const timeoutOptions = [
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '60 seconds' },
    { value: 120000, label: '120 seconds' },
  ]
  const renderSettingsDropdown = <Value extends string | number,>({
    id,
    value,
    options,
    onChange,
    ariaLabel,
  }: {
    id: string
    value: Value
    options: Array<{ value: Value; label: string; disabled?: boolean }>
    onChange: (value: Value) => void
    ariaLabel: string
  }) => {
    const selectedOption = options.find((option) => option.value === value) ?? options[0]
    const isOpen = openSettingsDropdown === id
    return (
      <div className="settings-dropdown">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          onClick={() => setOpenSettingsDropdown((current) => (current === id ? '' : id))}
        >
          <span>{selectedOption.label}</span>
          <ChevronDown size={15} aria-hidden />
        </button>
        {isOpen && (
          <div className="settings-dropdown-menu" role="listbox" aria-label={ariaLabel}>
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? 'is-active' : ''}
                disabled={option.disabled}
                key={String(option.value)}
                onClick={() => {
                  if (option.disabled) return
                  onChange(option.value)
                  setOpenSettingsDropdown('')
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  const settingsSections = [
    { id: 'general', label: 'General', description: 'Profile, appearance, and shortcuts', icon: Settings, available: true },
    { id: 'editor', label: 'Editor', description: 'Writing defaults and note ambience', icon: FileText, available: true },
    { id: 'study', label: 'Study', description: 'Atoms and set review defaults', icon: Brain, available: true },
    { id: 'ai', label: 'AI', description: 'Providers, context, and diagnostics', icon: Sparkles, available: true },
    { id: 'system', label: 'System', description: 'Updates, data, and diagnostics', icon: Info, available: true },
    { id: 'community', label: 'Community', description: 'Sharing, sync, and social defaults', icon: Users, available: RELEASE_COMMUNITY_ENABLED },
  ].filter((section) => section.available)
  const activeSettingsMeta = settingsSections.find((section) => section.id === activeSettingsSection) ?? settingsSections[0]
  const ActiveSettingsIcon = activeSettingsMeta.icon
  const themeLabel = userSettings.theme === 'loci'
    ? 'Loci'
    : userSettings.theme === 'system'
      ? 'System'
      : userSettings.theme === 'dark'
        ? 'Dark'
        : 'Light'
  const authorshipPopover = authorshipMenu
    ? createPortal(
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
        </div>,
        document.body,
      )
    : null

  return (
    <main className="app-stage">
      {notifications.length > 0 && (
        <div className="toast-notice-stack" aria-live="polite" aria-label="Notifications">
          {notifications.map((notification) => (
            <div key={notification.id} className={`toast-notice toast-notice--${notification.tone ?? 'info'}`} role="status">
              <div className="toast-notice-body">
                <span className="toast-notice-content">{notification.message}</span>
                {notification.actions?.length ? (
                  <div className="toast-notice-actions">
                    {notification.actions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        className={`toast-notice-action toast-notice-action--${action.intent ?? 'neutral'}`}
                        onClick={() => {
                          void Promise.resolve(action.onClick()).finally(() => dismissNotification(notification.id))
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" className="toast-notice-dismiss" aria-label="Dismiss notification" onClick={() => dismissNotification(notification.id)}>
                <XIcon size={14} aria-hidden />
              </button>
            </div>
          ))}
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
        className={`app-shell ${profileLoaded ? '' : 'is-profile-loading'} ${postOnboardingReveal ? 'is-post-onboarding-reveal' : ''} ${appFullscreen ? 'is-fullscreen' : ''} ${appImmersiveFullscreen ? 'is-immersive-fullscreen' : ''} ${fullscreenExitStaging ? 'is-exiting-immersive' : ''} ${sidebarRevealAnimating ? 'is-revealing-sidebar' : ''} ${layoutTransitioning ? 'is-layout-transitioning' : ''} ${userSettings.compactMode ? 'is-compact-mode' : ''} ${userSettings.reduceMotion ? 'is-reduce-motion' : ''}`}
        aria-label="Loci Notes"
        onWheel={handleAppShellWheel}
        ref={appShellRef}
      >
        <Sidebar
          activeView={activeView}
          activeNoteId={selectedNote?.id}
          atomSubView={atomSubView}
          collapsedSectionIds={collapsedSidebarProjectIds}
          draggedNoteIds={draggedNoteIds}
          dragOverProjectId={dragOverProjectId}
          profileAvatarColor={profileAvatarColor}
          profileDisplayName={profileDisplayName}
          profileHandleLabel={profileHandleLabel}
          profileInitials={profileInitials}
          projectQuickSections={projectQuickSections}
          onAssignNoteToProjectDrop={assignNoteToProjectDrop}
          onDragEnterProject={setDragOverProjectId}
          onDragLeaveProject={(projectId) => setDragOverProjectId((current) => (current === projectId ? '' : current))}
          onDragOverProject={handleNoteDropTargetDragOver}
          onHideSidebarNote={hideSidebarNote}
          onToggleSidebarSection={(sectionId) => {
            setCollapsedSidebarProjectIds((current) =>
              current.includes(sectionId)
                ? current.filter((id) => id !== sectionId)
                : [...current, sectionId],
            )
          }}
          onNewNote={() => openTemplateChooser()}
          onOpenNote={openProjectQuickNote}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
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
          onSetActiveView={switchActiveView}
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
              beginLayoutTransition()
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
                        if (homeTip.cta?.action === 'openAtoms') {
                          setAtomSubView('atoms')
                          setActiveView('atoms')
                        }
                        if (homeTip.cta?.action === 'openSets') {
                          setAtomSubView('sets')
                          setActiveView('atoms')
                        }
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
                      smoothCaretFocusMode={editorFocusMode && activeView === 'editor'}
                      smoothCaretScrollContainerRef={documentScrollRef}
                      shellRef={(node) => { blockEditorShellRef.current = node }}
                      className={`template-rich-section ${highlighterArmed ? 'is-highlighter-armed' : ''}`}
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
                            <button className="template-icon-button" type="button" aria-label="Remove task" onClick={() => removePlannerTask(task.id)}><XIcon size={14} /></button>
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
                            <button className="template-icon-button" type="button" aria-label="Remove schedule block" onClick={() => removePlannerSchedule(item.id)}><XIcon size={14} /></button>
                          </div>
                        ))}
                      </div>
                      <button className="template-soft-action" type="button" onClick={addPlannerSchedule}>Add schedule block</button>
                    </section>
                    <LociEditor
                      editor={editor}
                      isFocusMode={editorFocusModeVisual}
                      smoothCaretFocusMode={editorFocusMode && activeView === 'editor'}
                      smoothCaretScrollContainerRef={documentScrollRef}
                      shellRef={(node) => { blockEditorShellRef.current = node }}
                      className={`template-rich-section ${highlighterArmed ? 'is-highlighter-armed' : ''}`}
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
                            smoothCaretFocusMode={editorFocusMode && activeView === 'editor'}
                            smoothCaretScrollContainerRef={documentScrollRef}
                            shellRef={(node) => { blockEditorShellRef.current = node }}
                            className={highlighterArmed ? 'is-highlighter-armed' : ''}
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
                    smoothCaretFocusMode={editorFocusMode && activeView === 'editor'}
                    smoothCaretScrollContainerRef={documentScrollRef}
                    shellRef={(node) => { blockEditorShellRef.current = node }}
                    className={highlighterArmed ? 'is-highlighter-armed' : ''}
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
                <ModalBackdrop containerRef={documentScrollRef} onClose={() => setBlockPicker({ open: false, blockId: '', placement: 'after', query: '' })}>
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
                </ModalBackdrop>
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
              highlighterColors={HIGHLIGHTER_PALETTE}
              onToggleAtomUnderlines={toggleEditorAtomUnderlines}
              onToggleFocusMode={toggleEditorFocusMode}
              onToggleAuthenticWriterMode={toggleEditorAuthenticWriterMode}
              onOpenNoteHistory={() => void openNoteHistory()}
              onExportPdf={() => void exportCurrentNotePdf()}
              onExportDocx={() => void exportCurrentNoteDocx()}
              onDeleteNote={() => void deleteNote()}
              onAtomise={atomiseSelection}
              onToggleHighlight={toggleHighlighterMode}
              onOpenHighlightPalette={openHighlightPalette}
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
            {authorshipPopover}
          </section>
        )}

        {activeView === 'editor' && selectedNote && activeEditorPanel === 'format' && (
          <ModalBackdrop containerRef={documentScrollRef} className="format-modal-backdrop" onClose={() => setActiveEditorPanel(null)}>
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
                  type="text"
                  role="searchbox"
                  value={formatDialogQuery}
                  onChange={(event) => setFormatDialogQuery(event.target.value)}
                  placeholder="Search formats..."
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
            </section>
          </ModalBackdrop>
        )}

        {activeView === 'projects' && (
          <section className="main-pane compact-pane scroll-region-stable">
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
                  action={<button type="button" className="project-inline-action" onClick={createProject}><Plus size={17} /> Add project</button>}
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
                          setOpenSidebarProjectIds((current) => (current.includes(project.id) ? current : [project.id, ...current]))
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
                        const NoteTypeIcon = noteTemplateIcons[note.templateId ?? 'blank']
                        const notePreview = noteIndexes.notePreviewLinesById.get(note.id)?.find(Boolean) ?? ''
                        const isMenuOpen = openLooseNoteMenuId === note.id
                        return (
                          <div
                            className={`project-loose-note-row ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''} ${isMenuOpen ? 'is-menu-open' : ''}`}
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
                            <span className="project-loose-note-body">
                              <span className="project-loose-note-icon" aria-hidden>
                                <NoteTypeIcon size={16} />
                              </span>
                              <span className="project-row-main">
                                <span className="project-loose-note-titleline">
                                  {editingLooseNoteId === note.id ? (
                                    <input
                                      className="note-title-rename-input project-loose-note-title-input"
                                      value={editingLooseNoteTitle}
                                      onBlur={() => commitLooseNoteRename(note)}
                                      onChange={(event) => setEditingLooseNoteTitle(event.target.value)}
                                      onClick={(event) => event.stopPropagation()}
                                      onDoubleClick={(event) => event.stopPropagation()}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault()
                                          event.stopPropagation()
                                          commitLooseNoteRename(note)
                                        }
                                        if (event.key === 'Escape') {
                                          event.preventDefault()
                                          event.stopPropagation()
                                          setEditingLooseNoteTitle(note.title || 'Untitled Note')
                                          setEditingLooseNoteId('')
                                        }
                                      }}
                                      aria-label="Rename note"
                                      autoFocus
                                    />
                                  ) : (
                                    <strong title={noteTitle}>{noteTitle}</strong>
                                  )}
                                  <small>{formatDay(note.updatedAt)}</small>
                                </span>
                                <span className="project-loose-note-preview" title={notePreview}>
                                  {notePreview || 'No preview yet'}
                                </span>
                              </span>
                            </span>
                            <span className="project-loose-note-menu">
                              <button
                                type="button"
                                className="project-loose-note-menu-trigger"
                                aria-label={`More options for ${noteTitle}`}
                                aria-expanded={isMenuOpen}
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
                              {isMenuOpen && (
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
                                    onClick={() => startLooseNoteRename(note)}
                                  >
                                    Rename note
                                  </button>
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

        {settingsModalOpen && (
          <div className="settings-modal-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsModalOpen(false)
          }}>
            <section
              className="settings-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button className="settings-modal-close" type="button" aria-label="Close settings" onClick={() => setSettingsModalOpen(false)}>
                <XIcon size={16} aria-hidden />
              </button>
            <div className="settings-hub">
              <aside className="settings-section-rail" aria-label="Settings sections">
                <h2 id="settings-modal-title">Settings</h2>
                {settingsSections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      type="button"
                      key={section.id}
                      className={activeSettingsMeta.id === section.id ? 'is-active' : ''}
                      aria-pressed={activeSettingsMeta.id === section.id}
                      onClick={() => setActiveSettingsSection(section.id)}
                    >
                      <Icon size={17} aria-hidden />
                      <span>
                        <strong>{section.label}</strong>
                        <small>{section.description}</small>
                      </span>
                    </button>
                  )
                })}
              </aside>

              <div className="settings-content-panel">
                <header className="settings-section-header">
                  <span className="settings-section-icon"><ActiveSettingsIcon size={18} aria-hidden /></span>
                  <div>
                    <h2>{activeSettingsMeta.label}</h2>
                  </div>
                </header>

                {activeSettingsMeta.id === 'general' && (
                  <div className="settings-section-stack">
                    <section className="settings-card profile-settings-card">
                      <div className="settings-card-heading">
                        <Settings size={18} />
                        <div>
                          <h3>Profile</h3>
                          <p>How your local workspace identifies you.</p>
                        </div>
                      </div>
                      <div className="profile-settings-grid">
                        <div className="profile-settings-preview">
                          <div className="avatar profile-preview-avatar" style={{ background: profileDraft.avatarColor || DEFAULT_PROFILE_COLOR, color: avatarTextColor(profileDraft.avatarColor || DEFAULT_PROFILE_COLOR) }}>{normalizeInitials(profileDraft.initials || initialsFromName(profileDraft.displayName) || 'LN')}</div>
                          <strong>{profileDraft.displayName.trim() || 'Your name'}</strong>
                          <span>{profileDraft.handle ? `@${profileDraft.handle}` : 'Local profile'}</span>
                        </div>
                        <div className="profile-settings-fields">
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
                          <div className="profile-picture-placeholder">
                            <strong>Profile picture</strong>
                            <span>Reserved for image avatars once account sync is ready.</span>
                          </div>
                        </div>
                      </div>
                      <div className="profile-settings-actions">
                        <button type="button" onClick={resetProfileDraftFromSaved}>Reset</button>
                        <button type="button" className="primary" onClick={() => void saveLocalProfile()} disabled={!profileDraft.displayName.trim()}>
                          Save profile
                        </button>
                      </div>
                    </section>

                    <section className="settings-card settings-account-card settings-section-group">
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

                    <section className="settings-card settings-section-group survey-settings-card">
                      <div className="settings-card-heading">
                        <CheckSquare size={18} />
                        <div>
                          <h3>User input</h3>
                          <p>Short product prompts from the Loci team. Responses are tied to your signed-in account, not your notes.</p>
                        </div>
                      </div>
                      {surveyPromptReady && activeSurveyPrompt ? (
                        <div className="survey-prompt-panel">
                          <div className="survey-prompt-copy">
                            <strong>{activeSurveyPrompt.title}</strong>
                            {activeSurveyPrompt.body && <p>{activeSurveyPrompt.body}</p>}
                          </div>
                          {activeSurveyPrompt.kind === 'single-choice' ? (
                            <div className="survey-option-list" role="radiogroup" aria-label={activeSurveyPrompt.title}>
                              {activeSurveyPrompt.options.map((option) => (
                                <label key={option} className="survey-option">
                                  <input
                                    type="radio"
                                    name={`survey-${activeSurveyPrompt.id}`}
                                    value={option}
                                    checked={surveyAnswer === option}
                                    onChange={(event) => setSurveyAnswer(event.target.value)}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <label className="survey-text-answer">
                              <span>Your answer</span>
                              <textarea value={surveyAnswer} onChange={(event) => setSurveyAnswer(event.target.value)} />
                            </label>
                          )}
                          <label className="survey-text-answer">
                            <span>Optional context</span>
                            <textarea value={surveyComment} onChange={(event) => setSurveyComment(event.target.value)} />
                          </label>
                          <div className="survey-actions">
                            <button type="button" onClick={() => void dismissSurveyPrompt()} disabled={surveySubmitting}>
                              Don&apos;t show again
                            </button>
                            <button type="button" className="primary" onClick={() => void submitSurveyPrompt()} disabled={surveySubmitting || !surveyAnswer.trim()}>
                              {surveySubmitting ? 'Sending...' : 'Send response'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="settings-data-list">
                          <span><strong>{surveyLoading ? 'Checking' : authSession.status === 'signed-in' ? 'None' : 'Signed out'}</strong> Active prompt</span>
                          <span><strong>Admin only</strong> User counts stay in PocketBase</span>
                        </div>
                      )}
                    </section>

                    <section className="settings-card settings-section-group">
                      <div className="settings-card-heading">
                        <Settings size={18} />
                        <div>
                          <h3>Appearance</h3>
                          <p>Loci keeps the interface warm and quiet. More theme options are prepared for later.</p>
                        </div>
                      </div>
                      <label className="settings-row">
                        <span>
                          <strong>Theme</strong>
                          <small>Current selection: {themeLabel}</small>
                        </span>
                        {renderSettingsDropdown({
                          id: 'theme',
                          value: userSettings.theme,
                          options: themeOptions,
                          ariaLabel: 'Theme',
                          onChange: (theme) => updateUserSettings({ theme }),
                        })}
                      </label>
                      <label className="settings-toggle-row">
                        <span>
                          <strong>Compact mode</strong>
                          <small>Reserved for tighter spacing across dense screens.</small>
                        </span>
                        <input type="checkbox" checked={userSettings.compactMode} onChange={(event) => updateUserSettings({ compactMode: event.target.checked })} />
                      </label>
                      <label className="settings-toggle-row">
                        <span>
                          <strong>Reduce motion</strong>
                          <small>Keep transitions quieter when motion gets distracting.</small>
                        </span>
                        <input type="checkbox" checked={userSettings.reduceMotion} onChange={(event) => updateUserSettings({ reduceMotion: event.target.checked })} />
                      </label>
                    </section>

                    <section className="settings-card settings-section-group">
                      <div className="settings-card-heading">
                        <Keyboard size={18} />
                        <div>
                          <h3>Shortcuts</h3>
                          <p>Fast movement without extra chrome. Rebinding can be added once shortcut commands are centralized.</p>
                        </div>
                      </div>
                      <div className="settings-shortcuts">
                        <span><kbd>Ctrl</kbd> + <kbd>K</kbd> Search</span>
                        <span><kbd>Cmd</kbd> + <kbd>K</kbd> Search</span>
                        <span><kbd>Ctrl</kbd> + <kbd>Page Up/Down</kbd> Switch project documents</span>
                        <span><kbd>Ctrl</kbd> + <kbd>W</kbd> Close current note</span>
                        <span><kbd>Ctrl</kbd> + <kbd>Q</kbd> Close current sidebar project</span>
                        <span><kbd>Ctrl</kbd> + <kbd>\</kbd> Clear formatting</span>
                        <span><kbd>X</kbd> Hide a hovered sidebar note</span>
                      </div>
                    </section>
                  </div>
                )}

                {activeSettingsMeta.id === 'editor' && (
                  <div className="settings-section-stack">
                    <section className="settings-card settings-section-group">
                      <div className="settings-card-heading">
                        <FileText size={18} />
                        <div>
                          <h3>Writing defaults</h3>
                          <p>Choose the editor state new sessions should open with.</p>
                        </div>
                      </div>
                      <label className="settings-toggle-row">
                        <span>
                          <strong>Atom underlines</strong>
                          <small>Show linked atoms inline while writing.</small>
                        </span>
                        <input type="checkbox" checked={userSettings.editorAtomUnderlinesDefault} onChange={(event) => updateEditorDefault({ editorAtomUnderlinesDefault: event.target.checked })} />
                      </label>
                      <label className="settings-toggle-row">
                        <span>
                          <strong>Focus mode</strong>
                          <small>Open notes in the quieter focused reading width by default.</small>
                        </span>
                        <input type="checkbox" checked={userSettings.editorFocusModeDefault} onChange={(event) => updateEditorDefault({ editorFocusModeDefault: event.target.checked })} />
                      </label>
                      <label className="settings-toggle-row">
                        <span>
                          <strong>Authentic Writer</strong>
                          <small>Keep authorship styling visible when reviewing text.</small>
                        </span>
                        <input type="checkbox" checked={userSettings.editorAuthenticWriterDefault} onChange={(event) => updateEditorDefault({ editorAuthenticWriterDefault: event.target.checked })} />
                      </label>
                    </section>

                    <section className="settings-card settings-section-group">
                      <div className="settings-card-heading">
                        <Highlighter size={18} />
                        <div>
                          <h3>Editor appearance</h3>
                          <p>Small visual choices that shape the note surface.</p>
                        </div>
                      </div>
                      <label className="settings-toggle-row">
                        <span>
                          <strong>Marginalia</strong>
                          <small>Show the quiet Loci artwork beside editor pages.</small>
                        </span>
                        <input type="checkbox" checked={userSettings.editorShowMarginalia} onChange={(event) => updateEditorDefault({ editorShowMarginalia: event.target.checked })} />
                      </label>
                      <div className="settings-row">
                        <span>
                          <strong>Default highlighter</strong>
                          <small>Used by the floating editor highlighter.</small>
                        </span>
                        <div className="settings-swatch-row" aria-label="Default highlighter colour">
                          {HIGHLIGHTER_PALETTE.map(({ color, label }) => (
                            <button
                              type="button"
                              key={color}
                              className={color === userSettings.highlighterColor ? 'is-active' : ''}
                              style={{ background: color }}
                              aria-label={`Use ${label.toLowerCase()} highlighter colour`}
                              title={label}
                              onClick={() => updateUserSettings({ highlighterColor: color })}
                            />
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeSettingsMeta.id === 'study' && (
                  <div className="settings-section-stack">
                    <section className="settings-card settings-section-group">
                      <div className="settings-card-heading">
                        <Brain size={18} />
                        <div>
                          <h3>Atoms and sets</h3>
                          <p>Keep this light for now while Study grows into a fuller review system.</p>
                        </div>
                      </div>
                      <label className="settings-row">
                        <span>
                          <strong>Preferred study workspace</strong>
                          <small>Where the Atoms screen opens by default.</small>
                        </span>
                        {renderSettingsDropdown({
                          id: 'study-workspace',
                          value: userSettings.preferredAtomSubView ?? 'atoms',
                          options: studyWorkspaceOptions,
                          ariaLabel: 'Preferred study workspace',
                          onChange: (preferredAtomSubView) => updateUserSettings({ preferredAtomSubView }),
                        })}
                      </label>
                      <label className="settings-row">
                        <span>
                          <strong>Review direction</strong>
                          <small>Default side shown first when starting a set.</small>
                        </span>
                        {renderSettingsDropdown({
                          id: 'study-direction',
                          value: userSettings.studyDefaultDirection,
                          options: studyDirectionOptions,
                          ariaLabel: 'Review direction',
                          onChange: (studyDefaultDirection) => updateUserSettings({ studyDefaultDirection }),
                        })}
                      </label>
                      <label className="settings-toggle-row">
                        <span>
                          <strong>Shuffle sets</strong>
                          <small>Start study sessions in a mixed order.</small>
                        </span>
                        <input type="checkbox" checked={userSettings.studyShuffleDefault} onChange={(event) => updateUserSettings({ studyShuffleDefault: event.target.checked })} />
                      </label>
                    </section>

                    <section className="settings-card settings-section-group settings-placeholder-card">
                      <div className="settings-card-heading">
                        <Layers3 size={18} />
                        <div>
                          <h3>Future study notes</h3>
                          <p>Reserved for spaced repetition, mastery states, set folders, and richer atom generation controls.</p>
                        </div>
                      </div>
                      <div className="settings-pill-list">
                        <span>Spaced repetition</span>
                        <span>Mastery tracking</span>
                        <span>Set organization</span>
                        <span>Atom generation rules</span>
                      </div>
                    </section>
                  </div>
                )}

                {activeSettingsMeta.id === 'ai' && (
                  <div className="settings-section-stack">
                    <section className="settings-card settings-section-group settings-ai-card">
                      <div className="settings-card-heading">
                        <Sparkles size={18} />
                        <div>
                          <h3>AI providers</h3>
                          <p>Bring your own API key for now. Subscription billing can replace this surface later.</p>
                        </div>
                      </div>
                      <div className="settings-warning">
                        <Shield size={16} />
                        <span>Local BYOK is convenient for testing, but browser-stored keys are not as secure as a server gateway. Direct provider calls can also be blocked by CORS.</span>
                      </div>
                      <div className="settings-field-grid">
                        <label>
                          <span>Default provider</span>
                          {renderSettingsDropdown({
                            id: 'ai-provider',
                            value: userSettings.defaultAIProvider,
                            options: aiProviders.map((provider) => ({ value: provider.id, label: provider.name })),
                            ariaLabel: 'Default AI provider',
                            onChange: (defaultAIProvider) => updateUserSettings({ defaultAIProvider }),
                          })}
                        </label>
                        <label>
                          <span>Request timeout</span>
                          {renderSettingsDropdown({
                            id: 'ai-timeout',
                            value: userSettings.aiTimeoutMs ?? DEFAULT_AI_TIMEOUT_MS,
                            options: timeoutOptions,
                            ariaLabel: 'Request timeout',
                            onChange: (aiTimeoutMs) => updateUserSettings({ aiTimeoutMs }),
                          })}
                        </label>
                      </div>
                      <div className="settings-check-grid">
                        <label><input type="checkbox" checked={userSettings.aiIncludeNoteTitle} onChange={(event) => updateUserSettings({ aiIncludeNoteTitle: event.target.checked })} /> Include note title</label>
                        <label><input type="checkbox" checked={userSettings.aiIncludeSelectedText} onChange={(event) => updateUserSettings({ aiIncludeSelectedText: event.target.checked })} /> Include selected text</label>
                        <label><input type="checkbox" checked={userSettings.aiIncludeNoteExcerpt} onChange={(event) => updateUserSettings({ aiIncludeNoteExcerpt: event.target.checked })} /> Include note excerpt</label>
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
                                  <input type="checkbox" checked={config.enabled} onChange={(event) => updateAIProvider(provider.id, { enabled: event.target.checked })} />
                                </label>
                              </header>
                              <details>
                                <summary>Connection details</summary>
                                <label>
                                  <span>API key</span>
                                  <input type="password" value={config.apiKey} placeholder="Paste API key" onChange={(event) => updateAIProvider(provider.id, { apiKey: event.target.value })} />
                                </label>
                                <label>
                                  <span>Model</span>
                                  <input value={config.model} placeholder={provider.defaultModel} onChange={(event) => updateAIProvider(provider.id, { model: event.target.value })} />
                                </label>
                                {!provider.baseUrlLocked && (
                                  <label>
                                    <span>Base URL</span>
                                    <input value={config.baseUrl ?? provider.baseUrl} onChange={(event) => updateAIProvider(provider.id, { baseUrl: event.target.value })} />
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

                    <section className="settings-card settings-section-group">
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
                  </div>
                )}

                {activeSettingsMeta.id === 'system' && (
                  <div className="settings-section-stack">
                    <section className="settings-card settings-section-group">
                      <div className="settings-card-heading">
                        <Info size={18} />
                        <div>
                          <h3>Data and diagnostics</h3>
                          <p>Everything in this release is local-first.</p>
                        </div>
                      </div>
                      <div className="settings-data-list">
                        <span><strong>{notes.length}</strong> notes</span>
                        <span><strong>{projects.length}</strong> projects</span>
                        <span><strong>{atoms.length}</strong> atoms</span>
                        <span><strong>{flashcardSets.length}</strong> sets</span>
                        <span><strong>{dashboardStats.dailyStreak}</strong> day streak</span>
                        <span><strong>{localLoadIssues.length}</strong> load issues</span>
                      </div>
                      {localLoadIssues.length > 0 && (
                        <div className="settings-warning">
                          <Info size={16} />
                          <span>{localLoadIssues[0]}</span>
                        </div>
                      )}
                    </section>

                    <section className="settings-card settings-section-group">
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
                              : updateState.status === 'downloading'
                                ? 'Downloading'
                                : updateState.status === 'installing'
                                  ? 'Installing'
                                  : updateState.status === 'ready'
                                    ? 'Relaunch required'
                                    : updateState.status === 'error'
                                      ? updateState.errorCategory === 'signature'
                                        ? 'Invalid update signature'
                                        : updateState.errorCategory === 'manifest'
                                          ? 'Update manifest failed'
                                          : updateState.errorCategory === 'network'
                                            ? 'Update network failed'
                                            : 'Update failed'
                                      : 'Desktop updater'}
                        </strong>
                        <span>{updateState.message}</span>
                        {typeof updateState.downloadedBytes === 'number' && (
                          <span>
                            {Math.round(updateState.downloadedBytes / 1024 / 1024)} MB downloaded
                            {updateState.contentLength ? ` of ${Math.round(updateState.contentLength / 1024 / 1024)} MB` : ''}
                          </span>
                        )}
                      </div>
                      <div className="settings-update-actions">
                        <button type="button" className="settings-update-button" disabled={updateState.status === 'checking' || updateState.status === 'downloading' || updateState.status === 'installing'} onClick={() => void checkForUpdates(true)}>
                          {updateState.status === 'checking' ? 'Checking...' : 'Check for updates'}
                        </button>
                        {(updateState.canInstall || updateState.status === 'available') && (
                          <button type="button" className="settings-update-button" disabled={updateState.status === 'checking' || updateState.status === 'downloading' || updateState.status === 'installing'} onClick={() => void installAvailableUpdate()}>
                            {updateState.status === 'downloading'
                              ? 'Downloading...'
                              : updateState.status === 'installing'
                                ? 'Installing...'
                                : 'Install update'}
                          </button>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {activeSettingsMeta.id === 'community' && RELEASE_COMMUNITY_ENABLED && (
                  <div className="settings-section-stack">
                    <section className="settings-card settings-section-group settings-placeholder-card">
                      <div className="settings-card-heading">
                        <Users size={18} />
                        <div>
                          <h3>Community</h3>
                          <p>Reserved for pinned recipients, privacy, sync preferences, and notification controls.</p>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
            </section>
          </div>
        )}
      </section>

      {aiResult && (
        <AIResultDialog
          result={aiResult}
          selectedProjectName={selectedProject?.name}
          aiInstructionUpdating={aiInstructionUpdating}
          containerRef={activeView === 'editor' ? documentScrollRef : undefined}
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
              replaceSelectionWithAIResult(aiResult)
              closeAIResult()
              return
            }
            insertAIResultDraft(aiResult)
            closeAIResult()
          }}
          onDraftProjectInstructions={() => void draftProjectInstructionsFromAIResult()}
          onSaveProjectInstructions={(draft) => {
            if (!selectedProject) return
            void updateProjectDescription(selectedProject.id, draft)
            setAiResult((current) => (current ? { ...current, projectInstructionDraft: undefined } : current))
            showNotification({ message: 'Project instructions saved.', tone: 'success' })
          }}
          onCopy={() => {
            void copyToClipboard(aiResult.draftText)
            showNotification({ message: 'AI draft copied.', tone: 'success' })
          }}
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
                        <button type="button" className="note-history-secondary" onClick={() => {
                          void copyToClipboard(snap.title)
                          showNotification({ message: 'Snapshot title copied.', tone: 'success' })
                        }}>
                          Copy title
                        </button>
                        <button type="button" className="note-history-secondary" onClick={() => {
                          void copyToClipboard(bodyText)
                          showNotification({ message: 'Snapshot body copied.', tone: 'success' })
                        }}>
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
        <ModalBackdrop containerRef={documentScrollRef} className="atom-dialog-backdrop" onClose={() => setAtomDialog(null)}>
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
        </ModalBackdrop>
      )}

      {profileLoaded && !localProfile && (
        <OnboardingScreen
          profileDraft={profileDraft}
          onDraftChange={setProfileDraft}
          onSubmit={() => void saveLocalProfile()}
        />
      )}

      {profileLoaded && localProfile && profileModalOpen && (
        <div
          className="modal-backdrop profile-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProfileModalOpen(false)
          }}
        >
          <section className="profile-dialog profile-progress-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="profile-dialog-close" type="button" aria-label="Close profile" onClick={() => setProfileModalOpen(false)}>
              <XIcon size={16} aria-hidden />
            </button>
            <header className="profile-progress-hero">
              <div className="avatar profile-preview-avatar" style={{ background: profileAvatarColor, color: avatarTextColor(profileAvatarColor) }}>{profileInitials}</div>
              <div>
                <h2 id="profile-dialog-title">{profileGreeting}</h2>
                <p>A quick check-in for your Loci trail.</p>
              </div>
            </header>
            <section className="profile-encouragement-card" aria-label="Profile encouragement">
              <span>Today from Loci</span>
              <p>{profileProgressMessage}</p>
            </section>
            <div className="profile-stats-grid profile-progress-stats">
              <span><strong><AnimatedStatNumber value={profileStats.totalNotes} /></strong>Notes written</span>
              <span><strong><AnimatedStatNumber value={profileStats.totalAtoms} /></strong>Atoms created</span>
              <span><strong><AnimatedStatNumber value={profileStats.dailyStreak} /></strong>Day streak</span>
              <span><strong><AnimatedStatNumber value={focusModeHours} decimals={focusModeHours < 10 ? 1 : 0} /></strong>Hours in focus</span>
              <span><strong><AnimatedStatNumber value={profileStats.wordsWrittenThisWeek} /></strong>Words this week</span>
              <span><strong><AnimatedStatNumber value={profileStats.totalProjects} /></strong>Projects made</span>
              <span className="profile-stat-wide profile-word-count-stat"><strong><AnimatedStatNumber value={profileStats.totalWords} /></strong>Words and counting</span>
            </div>
            <section className="profile-next-action">
              <div>
                <strong>{profileNextAction.label}</strong>
                <p>{profileNextAction.body}</p>
              </div>
              <button type="button" onClick={runProfileNextAction}>{profileNextAction.label}</button>
            </section>
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
