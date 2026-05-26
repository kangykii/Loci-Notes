import type { AIProviderId } from './aiTypes'
import type { CachedFlashcardQuiz, FlashcardQuizQuestion } from '../db'
import type { AIBlockAttrs } from '../editor/aiBlocks'
import { createAIBlockAttrs, validateAIBlockAttrs } from '../editor/aiBlocks'
import { isRecord } from '../utils/isRecord'

export type AITaskType =
  | 'ai_atomise'
  | 'edit_selection'
  | 'generate_insert'
  | 'table_block'
  | 'quote_block'
  | 'list_block'
  | 'code_block'
  | 'latex_block'
  | 'compose_blocks'
  | 'answer_with_context'
  | 'summarize_note'
  | 'critique_writing'
  | 'update_project_instructions'
  | 'app_help'
  | 'flashcard_hint'
  | 'flashcard_quiz'
  | 'flashcard_short_answer_mark'
  | 'general'

export type AICommandId = 'rewrite' | 'continue' | 'summarise' | 'atomise' | 'critique' | 'custom'

/** @deprecated Renamed to critique; kept for persisted UI state and old links. */
export type LegacyAICommandId = AICommandId | 'mark'

export function normalizeAICommandId(command: string | undefined): AICommandId {
  if (command === 'mark') return 'critique'
  if (command === 'rewrite' || command === 'continue' || command === 'summarise' || command === 'atomise' || command === 'critique' || command === 'custom') {
    return command
  }
  return 'custom'
}

export type AITablePayload = {
  mode: 'create' | 'update'
  columns: string[]
  rows: string[][]
}

export type AIQuotePayload = {
  mode: 'create' | 'update'
  quote: string
  author?: string
}

export type AIListPayload = {
  mode: 'create' | 'update'
  listType: 'checklist' | 'bulletList' | 'numberedList'
  items: string[]
}

export type AICodePayload = {
  mode: 'create' | 'update'
  code: string
}

export type AILatexPayload = {
  mode: 'create' | 'update'
  latex: string
}

export type AIBlockPayload =
  | { kind: 'table'; data: AITablePayload; targetBlockId?: string }
  | { kind: 'quote'; data: AIQuotePayload; targetBlockId?: string }
  | { kind: 'list'; data: AIListPayload; targetBlockId?: string }
  | { kind: 'code'; data: AICodePayload; targetBlockId?: string }
  | { kind: 'latex'; data: AILatexPayload; targetBlockId?: string }

export type AIDocumentPatch = {
  intent: 'insert'
  operations: AIDocumentOperation[]
}

export type AIDocumentOperation =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: 1 | 2 | 3 }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'quote'; quote: string; author?: string }
  | { type: 'list'; listType: 'checklist' | 'bulletList' | 'numberedList'; items: string[] }
  | { type: 'code'; code: string }
  | { type: 'latex'; latex: string }
  | { type: 'aiBlock'; attrs: AIBlockAttrs }

export type FlashcardShortAnswerMark = {
  score: number
  correct: boolean
  feedback: string
}

export type AIResult = {
  prompt: string
  taskType: AITaskType
  response: string
  insertableResponse: string
  draftText: string
  actionLabel: string
  canInsertDocument: boolean
  canReplaceDocument: boolean
  canCreateAtoms: boolean
  blockPayload?: AIBlockPayload
  documentPatch?: AIDocumentPatch
  parseError?: string
  provider: AIProviderId
  selection?: { from: number; to: number }
  /** Plain text of the selection when `edit_selection` ran; used for before/after review. */
  selectionOriginalText?: string
  projectInstructionDraft?: string
  canUpdateProjectInstructions?: boolean
}

export const AI_SYSTEM_INSTRUCTION = [
  "You are Loci Notes' task assistant.",
  'Help the user complete writing and knowledge-management tasks inside the app.',
  'Use provided note, project, and editor context whenever possible.',
  'Keep a neutral tone and prefer precise edits and concise output.',
  'For ordinary conversational answers, prefer normal Markdown with concise headings, bullets, tables, and code fences when useful.',
  'When a task contract asks for strict JSON, raw code, LaTeX, atom lines, or clean insertable editor text, follow that task contract instead of Markdown.',
  'Do not include greetings, sign-offs, "hope this helps", or meta commentary.',
  'Do not invent facts outside the provided context.',
].join('\n')

export const AI_TASK_CONTRACTS: Record<AITaskType, string> = {
  ai_atomise: 'Task: ai_atomise. Return atom candidates as one per line in the format "Phrase - definition". Prefer durable concepts, key terms, named methods, and definitions that help future review.',
  edit_selection: 'Task: edit_selection. Return only the replacement text for the selected passage. Preserve meaning unless the user explicitly asks to change it.',
  generate_insert: 'Task: generate_insert. Return only clean document text that can be inserted at the cursor.',
  table_block: 'Task: table_block. Return strict JSON only, no markdown. Shape: {"mode":"create"|"update","columns":["Column"],"rows":[["Cell"]]}. Use update only when highlighted table context is provided; otherwise use create. Reorganize, clean, add, or edit data according to the user request.',
  quote_block: 'Task: quote_block. Return strict JSON only, no markdown. Shape: {"mode":"create"|"update","quote":"Quote text","author":"Optional author"}. Use update only when highlighted quote context is provided. Do not invent an author; omit author if unknown.',
  list_block: 'Task: list_block. Return strict JSON only, no markdown. Shape: {"mode":"create"|"update","listType":"checklist"|"bulletList"|"numberedList","items":["Item"]}. Use update when highlighted or active list context is provided. Keep each item as plain text without bullets, numbers, or checkbox markers.',
  code_block: 'Task: code_block. Return raw code only. Do not use markdown fences, explanations, headings, or JSON. Use the highlighted code context when provided and return the complete desired code block.',
  latex_block: 'Task: latex_block. Return strict JSON only, no markdown. Shape: {"mode":"create"|"update","latex":"LaTeX equation source"}. Use update when highlighted or active LaTeX context is provided. If selected text is plain-language math, convert it into valid LaTeX equation source inside the latex field.',
  compose_blocks: 'Task: compose_blocks. Return strict JSON only, no markdown. Shape: {"intent":"insert","operations":[...]}. Operations may be {"type":"heading","text":"Title","level":2}, {"type":"paragraph","text":"Plain text"}, {"type":"list","listType":"checklist"|"bulletList"|"numberedList","items":["Item"]}, {"type":"table","columns":["Column"],"rows":[["Cell"]]}, {"type":"quote","quote":"Text","author":"Optional"}, {"type":"code","code":"source"}, {"type":"latex","latex":"equation"}, or {"type":"aiBlock","attrs":{"prompt":"original request","sourceKind":"html","source":"short source label or duplicate html source","artifact":{"version":1,"kind":"html","title":"Short title","html":"complete self-contained HTML/CSS/JS body markup"}}}. Use AI-Blocks for interactive artifacts, tools, simulations, dashboards, calculators, terminals, models, widgets, or anything that should behave like a mini-document. You may return multiple operations to create a mixed document stack. Keep generated HTML self-contained, visually calm, and compatible with Loci. Do not include markdown fences.',
  answer_with_context: 'Task: answer_with_context. Answer briefly using note/project context. Prefer normal Markdown unless the user asks for a different format. Mention the context used in plain language when useful. Do not format as insertable prose by default.',
  summarize_note: 'Task: summarize_note. Return plain text with short section headings and dash bullets. Do not use Markdown syntax.',
  critique_writing: 'Task: critique_writing. Critique the writing against the supplied criteria. Return concise plain-text sections: Overall, Strengths, Improvements, Suggested edit. Be constructive and specific. If no clear criteria are supplied, use the default criteria from context and say that default criteria were used. Do not use Markdown syntax.',
  update_project_instructions: 'Task: update_project_instructions. Draft a concise replacement project description with exactly these plain-text section labels: Summary, Instructions, Writing style, Critique criteria. Use current project memory as the base, integrate reusable guidance from the latest AI draft, and avoid copying note-specific content.',
  app_help: 'Task: app_help. Answer as product guidance for Loci Notes. Prefer normal Markdown unless the user asks for a different format. Do not write document text unless asked.',
  flashcard_hint: 'Task: flashcard_hint. Return one concise study hint for the supplied flashcard. Do not reveal the answer directly. Use plain text only, maximum 24 words.',
  flashcard_quiz: 'Task: flashcard_quiz. Return strict JSON only, no markdown. Shape: {"questions":[{"type":"true-false","prompt":"Statement","answer":true,"explanation":"Why","atomIds":["atom_id"]},{"type":"multiple-choice","prompt":"Question","choices":["A","B","C","D"],"answer":"Exact choice","explanation":"Why","atomIds":["atom_id"]},{"type":"matching","prompt":"Match the pairs","pairs":[{"left":"Term","right":"Definition"}],"atomIds":["atom_id"]},{"type":"short-answer","prompt":"Question","expectedAnswer":"Ideal answer","rubric":"Self-check rubric","atomIds":["atom_id"]}]}. Use the supplied atom IDs exactly. Follow the requested answer direction, selected question formats, and maximum question count from the user content. Do not exceed the requested question count. Change wording and ordering each time.',
  flashcard_short_answer_mark: 'Task: flashcard_short_answer_mark. Return strict JSON only, no markdown. Shape: {"score":0-1,"correct":true|false,"feedback":"One concise explanation"}. Mark the student answer against the expected answer and rubric. Be fair with wording differences.',
  general: 'Task: general. Answer briefly in normal Markdown unless the user asks for a different format. Ask for missing context only when necessary.',
}

export const DEFAULT_CRITIQUE_CRITERIA = [
  'Clarity: the writing is easy to follow and uses precise language.',
  'Structure: ideas are ordered logically with clear transitions.',
  'Evidence: claims are supported by relevant examples, facts, or reasoning.',
  'Depth: the writing explains significance rather than only listing points.',
  'Tone: the writing fits the project context and intended reader.',
].join('\n')

/** @deprecated Use DEFAULT_CRITIQUE_CRITERIA */
export const DEFAULT_MARKING_CRITERIA = DEFAULT_CRITIQUE_CRITERIA

export function sanitizeAIInsertText(text: string) {
  return text
    .replace(/^\s*(sure|certainly|of course|absolutely|here(?:'|’)s|here is)[,.!:\-\s]+/i, '')
    .replace(/\n{0,2}\s*(hope this helps|i hope this helps|let me know if you need anything else|happy to help)[.!]*\s*$/i, '')
    .trim()
}

export function cleanAIDraftFormatting(text: string) {
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

export function taskFromAICommand(command: AICommandId | 'mark', hasSelection: boolean): AITaskType | undefined {
  switch (normalizeAICommandId(command)) {
    case 'rewrite':
      return hasSelection ? 'edit_selection' : 'generate_insert'
    case 'continue':
      return 'generate_insert'
    case 'summarise':
      return 'summarize_note'
    case 'atomise':
      return 'ai_atomise'
    case 'critique':
      return 'critique_writing'
    case 'custom':
      return undefined
  }
}

export function defaultPromptForCommand(command: AICommandId | 'mark', hasSelection: boolean) {
  switch (normalizeAICommandId(command)) {
    case 'rewrite':
      return hasSelection ? 'Improve the selected writing.' : 'Draft a clearer version for the current note.'
    case 'continue':
      return 'Continue the current note in the same style.'
    case 'summarise':
      return hasSelection ? 'Summarise the selected writing.' : 'Summarise this note.'
    case 'atomise':
      return hasSelection ? 'Atomise the selected writing.' : 'Find atom candidates in this note.'
    case 'critique':
      return hasSelection ? 'Critique the selected writing.' : 'Critique this note.'
    case 'custom':
      return ''
  }
}

export function routeAITask(prompt: string, hasSelection: boolean, command?: AICommandId): AITaskType {
  const explicitTask = command ? taskFromAICommand(command, hasSelection) : undefined
  if (explicitTask) return explicitTask

  const q = prompt.toLowerCase().trim()
  if (/\b(build|make|create|generate|design|compose)\b.*\b(interactive|artifact|widget|tool|tracker|dashboard|calculator|model|simulation|terminal|mini[- ]?app|budget|planner|gantt|presentation|flashcard deck|habit)\b/.test(q)) return 'compose_blocks'
  if (/\b(interactive|artifact|widget|dashboard|tracker|calculator|simulation|terminal|mini[- ]?app)\b/.test(q)) return 'compose_blocks'
  if (/\b(table|tabulate|spreadsheet|columns?|rows?|grid|organise .*data|organize .*data)\b/.test(q)) return 'table_block'
  if (/\b(quote|qoute|blockquote|pull quote|pull qoute|cite this|citation|add author|shorten quote|shorten qoute|polish quote|polish qoute)\b/.test(q)) return 'quote_block'
  if (/\b(checklist|check list|numbered list|ordered list|bullet list|dot points?|list items?|todo list|to-do list)\b/.test(q)) return 'list_block'
  if (/\b(code|function|snippet|program|script|typescript|javascript|python|rust|sql|debug this code|fix this code)\b/.test(q)) return 'code_block'
  if (/\b(latex|equation|formula|maths?|mathematical|solve for|derive)\b/.test(q)) return 'latex_block'
  if (/\b(atomi[sz]e|make atoms?|create atoms?|extract atoms?|key terms?|define terms?|glossary|concept cards?)\b/.test(q)) return 'ai_atomise'
  if (/\b(summar(?:y|ize|ise)|recap|outline|flashcards?|study guide|key points?|explain this note|what is this note saying|tl;?dr)\b/.test(q)) return 'summarize_note'
  if (/\b(critique|critiquing|grade|mark|marking|rubric|criteria|assess|evaluate|feedback|review my writing|score)\b/.test(q)) return 'critique_writing'
  if (hasSelection && /\b(rewrite|revise|fix|clean up|sharpen|make sharper|concise|shorten|expand|improve|polish|edit|grammar|tone|clarify|simplify|make academic|make formal|make casual)\b/.test(q)) return 'edit_selection'
  if (/\b(write|draft|compose|add|insert|continue|extend|intro|introduction|paragraph|section|conclusion|next part|turn this into)\b/.test(q)) return 'generate_insert'
  if (/\b(how do i|how to|where is|settings?|export|pdf|docx|how to create|how to delete|shortcut|sidebar|project|note history)\b/.test(q)) return 'app_help'
  if (/\b(what|why|how|explain|compare|does|is this|means?|meaning|difference between|relationship between)\b/.test(q)) return 'answer_with_context'
  return hasSelection ? 'edit_selection' : 'general'
}

const NON_DOCUMENT_TASKS = new Set<AITaskType>([
  'flashcard_hint',
  'flashcard_quiz',
  'flashcard_short_answer_mark',
  'update_project_instructions',
])

export function aiDocumentActionFlags(taskType: AITaskType, hasReplaceTarget: boolean) {
  const appliesToDocument = !NON_DOCUMENT_TASKS.has(taskType)
  return {
    actionLabel: 'Insert',
    canCreateAtoms: taskType === 'ai_atomise',
    canInsertDocument: appliesToDocument,
    canReplaceDocument: appliesToDocument && hasReplaceTarget,
  }
}

export function aiResultTitle(result: AIResult) {
  const promptTitle = result.prompt.trim()
  if (promptTitle) return promptTitle
  if (result.taskType === 'critique_writing') return 'Writing critique'
  if (result.taskType === 'ai_atomise') return 'Atomise'
  return 'AI draft'
}

export function aiDraftLabel(taskType: AITaskType) {
  if (taskType === 'critique_writing') return 'Editable critique'
  if (taskType === 'ai_atomise') return 'Editable atom candidates'
  if (taskType === 'table_block' || taskType === 'quote_block' || taskType === 'list_block' || taskType === 'latex_block') return 'Editable block JSON'
  if (taskType === 'compose_blocks') return 'Editable document patch JSON'
  if (taskType === 'code_block') return 'Editable code block'
  if (taskType === 'update_project_instructions') return 'Editable project instructions'
  return 'Editable draft'
}

export function canResultUpdateProjectInstructions(taskType: AITaskType) {
  return taskType === 'critique_writing' || taskType === 'summarize_note' || taskType === 'generate_insert' || taskType === 'edit_selection'
}

export function taskUsesWritingStyle(taskType: AITaskType) {
  return taskType === 'edit_selection' || taskType === 'generate_insert' || taskType === 'compose_blocks' || taskType === 'summarize_note' || taskType === 'general'
}

export function taskResponseFormat(taskType: AITaskType) {
  return taskType === 'compose_blocks' ||
    taskType === 'table_block' ||
    taskType === 'quote_block' ||
    taskType === 'list_block' ||
    taskType === 'latex_block' ||
    taskType === 'flashcard_quiz' ||
    taskType === 'flashcard_short_answer_mark'
    ? 'json'
    : 'text'
}

export function parseAtomCandidates(text: string) {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .map((line) => {
      const [phrase, ...definitionParts] = line.split(/\s+[—-]\s+|:\s+/)
      return { phrase: phrase?.trim() ?? '', definition: definitionParts.join(' - ').trim() }
    })
    .filter((item) => item.phrase && item.definition)
}

export function parseAIJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    const jsonSlice = findFirstJsonSlice(trimmed)
    if (!jsonSlice) throw new Error('AI did not return JSON.')
    return JSON.parse(jsonSlice) as unknown
  }
}

function findFirstJsonSlice(text: string) {
  for (let start = 0; start < text.length; start += 1) {
    const first = text[start]
    if (first !== '{' && first !== '[') continue
    const stack = [first]
    let inString = false
    let escaped = false
    for (let index = start + 1; index < text.length; index += 1) {
      const char = text[index]
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }
      if (char === '"') {
        inString = true
        continue
      }
      if (char === '{' || char === '[') {
        stack.push(char)
        continue
      }
      if (char !== '}' && char !== ']') continue
      const expected = stack[stack.length - 1] === '{' ? '}' : ']'
      if (char !== expected) break
      stack.pop()
      if (!stack.length) return text.slice(start, index + 1)
    }
  }
  return ''
}

function textField(value: unknown, fallback = '', max = 4000) {
  return (typeof value === 'string' ? value.trim() : fallback).slice(0, max)
}

function textArray(value: unknown, maxItems = 24, maxText = 800) {
  return Array.isArray(value)
    ? value.map((item) => textField(item, '', maxText)).filter(Boolean).slice(0, maxItems)
    : []
}

export function parseAIDocumentPatch(text: string): AIDocumentPatch {
  const value = parseAIJson(text)
  if (!isRecord(value)) throw new Error('Document patch must be an object.')
  const rawOperations = Array.isArray(value.operations) ? value.operations : []
  const operations: AIDocumentOperation[] = []

  for (const rawOperation of rawOperations.slice(0, 12)) {
    if (!isRecord(rawOperation)) continue
    const type = rawOperation.type

    if (type === 'paragraph') {
      const body = textField(rawOperation.text ?? rawOperation.body ?? rawOperation.content, '', 3000)
      if (body) operations.push({ type, text: body })
    }

    if (type === 'heading') {
      const body = textField(rawOperation.text ?? rawOperation.title, '', 240)
      const rawLevel = Number(rawOperation.level)
      const level: 1 | 2 | 3 = rawLevel === 1 || rawLevel === 3 ? rawLevel : 2
      if (body) operations.push({ type, text: body, level })
    }

    if (type === 'list') {
      const listTypeSource = String(rawOperation.listType ?? rawOperation.kind ?? '').trim()
      const listType: 'checklist' | 'bulletList' | 'numberedList' =
        /check|task|todo/i.test(listTypeSource)
          ? 'checklist'
          : /number|ordered/i.test(listTypeSource)
            ? 'numberedList'
            : 'bulletList'
      const items = textArray(rawOperation.items, 40)
      if (items.length) operations.push({ type, listType, items })
    }

    if (type === 'table') {
      const columns = textArray(rawOperation.columns, 12, 120)
      const rows = Array.isArray(rawOperation.rows)
        ? rawOperation.rows.slice(0, 40).map((row) => Array.isArray(row)
          ? row.map((cell) => textField(cell, '', 500)).slice(0, columns.length || 12)
          : columns.map((column) => isRecord(row) ? textField(row[column], '', 500) : ''))
        : []
      if (columns.length) operations.push({ type, columns, rows })
    }

    if (type === 'quote') {
      const quote = textField(rawOperation.quote ?? rawOperation.text, '', 3000)
      const author = textField(rawOperation.author, '', 240)
      if (quote) operations.push({ type, quote, author: author || undefined })
    }

    if (type === 'code') {
      const code = textField(rawOperation.code ?? rawOperation.source, '', 12000)
      if (code) operations.push({ type, code })
    }

    if (type === 'latex') {
      const latex = textField(rawOperation.latex ?? rawOperation.source, '', 2000)
      if (latex) operations.push({ type, latex })
    }

    if (type === 'aiBlock') {
      const attrsInput = isRecord(rawOperation.attrs) ? rawOperation.attrs : rawOperation
      const attrs = createAIBlockAttrs({
        ...attrsInput,
        prompt: textField(attrsInput.prompt ?? value.prompt, '', 4000),
      })
      const validation = validateAIBlockAttrs(attrs)
      if (validation.ok) operations.push({ type, attrs: validation.attrs })
    }
  }

  if (!operations.length) throw new Error('Document patch needs at least one valid operation.')
  return { intent: 'insert', operations }
}

export function parseAITablePayload(text: string): AITablePayload {
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

export function parseAIQuotePayload(text: string): AIQuotePayload {
  const value = parseAIJson(text) as Partial<AIQuotePayload> & { text?: string; body?: string; content?: string; citation?: string }
  const quoteSource = value.quote ?? value.text ?? value.body ?? value.content
  const quote = typeof quoteSource === 'string' ? quoteSource.trim() : ''
  if (!quote) throw new Error('Quote JSON needs quote text.')
  const authorSource = value.author ?? value.citation
  const author = typeof authorSource === 'string' && authorSource.trim() ? authorSource.trim() : undefined
  return { mode: value.mode === 'update' ? 'update' : 'create', quote, author }
}

function normalizeAtomIds(value: unknown, allowedAtomIds: Set<string>) {
  if (!Array.isArray(value)) return []
  return value.map(String).filter((id) => allowedAtomIds.has(id))
}

export function parseFlashcardQuizPayload(text: string, allowedAtomIds: string[], generatedAt: string): CachedFlashcardQuiz {
  const value = parseAIJson(text) as { questions?: Array<Record<string, unknown>> }
  const allowedAtomIdSet = new Set(allowedAtomIds)
  const questions: FlashcardQuizQuestion[] = []
  for (const item of Array.isArray(value.questions) ? value.questions : []) {
    const type = item.type
    const atomIds = normalizeAtomIds(item.atomIds, allowedAtomIdSet)
    if (type === 'multiple-choice') {
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      const choices = Array.isArray(item.choices)
        ? Array.from(new Set(item.choices.map(String).map((choice) => choice.trim()).filter(Boolean))).slice(0, 6)
        : []
      const answer = typeof item.answer === 'string' ? item.answer.trim() : ''
      if (prompt && choices.length >= 2 && answer && choices.includes(answer)) {
        questions.push({
          id: `quiz_q_${questions.length + 1}`,
          type,
          prompt,
          choices,
          answer,
          explanation: typeof item.explanation === 'string' && item.explanation.trim() ? item.explanation.trim() : undefined,
          atomIds,
        })
      }
    }
    if (type === 'true-false') {
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      const answer = typeof item.answer === 'boolean'
        ? item.answer
        : typeof item.answer === 'string'
          ? item.answer.trim().toLowerCase() === 'true'
          : null
      if (prompt && typeof answer === 'boolean') {
        questions.push({
          id: `quiz_q_${questions.length + 1}`,
          type,
          prompt,
          answer,
          explanation: typeof item.explanation === 'string' && item.explanation.trim() ? item.explanation.trim() : undefined,
          atomIds,
        })
      }
    }
    if (type === 'matching') {
      const prompt = typeof item.prompt === 'string' && item.prompt.trim() ? item.prompt.trim() : 'Match the pairs.'
      const pairs = Array.isArray(item.pairs)
        ? item.pairs.flatMap((pair) => {
          if (!pair || typeof pair !== 'object') return []
          const left = 'left' in pair && typeof pair.left === 'string' ? pair.left.trim() : ''
          const right = 'right' in pair && typeof pair.right === 'string' ? pair.right.trim() : ''
          return left && right ? [{ left, right }] : []
        }).slice(0, 6)
        : []
      if (pairs.length >= 2) {
        questions.push({
          id: `quiz_q_${questions.length + 1}`,
          type,
          prompt,
          pairs,
          atomIds,
        })
      }
    }
    if (type === 'short-answer') {
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
      const expectedAnswer = typeof item.expectedAnswer === 'string' ? item.expectedAnswer.trim() : ''
      const rubric = typeof item.rubric === 'string' ? item.rubric.trim() : ''
      if (prompt && expectedAnswer && rubric) {
        questions.push({
          id: `quiz_q_${questions.length + 1}`,
          type,
          prompt,
          expectedAnswer,
          rubric,
          atomIds,
        })
      }
    }
  }
  if (!questions.length) throw new Error('Quiz JSON needs at least one valid question.')
  return {
    id: `quiz_${generatedAt.replace(/[^a-z0-9]/gi, '')}`,
    generatedAt,
    questions,
  }
}

export function parseFlashcardShortAnswerMark(text: string): FlashcardShortAnswerMark {
  const value = parseAIJson(text) as Partial<FlashcardShortAnswerMark>
  const rawScore = typeof value.score === 'number' ? value.score : Number(value.score)
  const score = Number.isFinite(rawScore) ? Math.min(1, Math.max(0, rawScore)) : 0
  return {
    score,
    correct: typeof value.correct === 'boolean' ? value.correct : score >= 0.7,
    feedback: typeof value.feedback === 'string' && value.feedback.trim() ? value.feedback.trim() : 'Marked against the expected answer.',
  }
}

export function parseAIListPayload(text: string): AIListPayload {
  let value: Partial<AIListPayload> & { type?: string; list_type?: string }
  try {
    value = parseAIJson(text) as Partial<AIListPayload> & { type?: string; list_type?: string }
  } catch {
    const items = text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((item) => item.replace(/^\s*(?:[-*+]|\d+[.)]|\[[ xX]\])\s+/, '').trim())
      .filter(Boolean)
    if (!items.length) throw new Error('List response was empty.')
    return { mode: 'update', listType: /^\s*\d+[.)]/m.test(text) ? 'numberedList' : /\[[ xX]\]/.test(text) ? 'checklist' : 'bulletList', items }
  }
  const requestedType = String(value.listType ?? value.list_type ?? value.type ?? '').trim()
  const listType: AIListPayload['listType'] =
    requestedType === 'checklist' || /check|task|todo/i.test(requestedType)
      ? 'checklist'
      : requestedType === 'numberedList' || /number|ordered/i.test(requestedType)
        ? 'numberedList'
        : 'bulletList'
  const items = Array.isArray(value.items)
    ? value.items.map((item) => String(item ?? '').replace(/^\s*(?:[-*+]|\d+[.)]|\[[ xX]\])\s+/, '').trim()).filter(Boolean)
    : []
  if (!items.length) throw new Error('List JSON needs items.')
  return { mode: value.mode === 'update' ? 'update' : 'create', listType, items }
}

export function parseAICodePayload(text: string): AICodePayload {
  const code = text
    .trim()
    .replace(/^```[a-zA-Z0-9_-]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  if (!code) throw new Error('Code response was empty.')
  return { mode: 'update', code }
}

export function parseAILatexPayload(text: string): AILatexPayload {
  let value: Partial<AILatexPayload> & { equation?: string; source?: string }
  try {
    value = parseAIJson(text) as Partial<AILatexPayload> & { equation?: string; source?: string }
  } catch {
    const latex = text.trim().replace(/^```(?:latex|tex)?\s*/i, '').replace(/```\s*$/i, '').trim()
    if (!latex) throw new Error('LaTeX response was empty.')
    return { mode: 'update', latex }
  }
  const latexSource = value.latex ?? value.equation ?? value.source
  const latex = typeof latexSource === 'string' ? latexSource.trim() : ''
  if (!latex) throw new Error('LaTeX JSON needs latex source.')
  return { mode: value.mode === 'update' ? 'update' : 'create', latex }
}

export const CRITIQUE_WRITING_FEEDBACK_SECTIONS = [
  { key: 'overall', label: 'Overall' },
  { key: 'strengths', label: 'Strengths' },
  { key: 'improvements', label: 'Improvements' },
  { key: 'suggestedEdit', label: 'Suggested edit' },
] as const

export type CritiqueWritingFeedbackKey = (typeof CRITIQUE_WRITING_FEEDBACK_SECTIONS)[number]['key']

export type CritiqueWritingFeedbackSections = Record<CritiqueWritingFeedbackKey, string>

/** @deprecated Use CRITIQUE_WRITING_FEEDBACK_SECTIONS */
export const MARK_WRITING_FEEDBACK_SECTIONS = CRITIQUE_WRITING_FEEDBACK_SECTIONS

/** @deprecated Use CritiqueWritingFeedbackKey */
export type MarkWritingFeedbackKey = CritiqueWritingFeedbackKey

/** @deprecated Use CritiqueWritingFeedbackSections */
export type MarkWritingFeedbackSections = CritiqueWritingFeedbackSections

export function critiqueWritingSectionHeadingKey(line: string): CritiqueWritingFeedbackKey | null {
  const normalized = line.trim().replace(/:+\s*$/, '').toLowerCase()
  for (const { key, label } of CRITIQUE_WRITING_FEEDBACK_SECTIONS) {
    if (normalized === label.toLowerCase()) return key
  }
  return null
}

export function parseCritiqueWritingFeedback(text: string): CritiqueWritingFeedbackSections {
  const empty: CritiqueWritingFeedbackSections = {
    overall: '',
    strengths: '',
    improvements: '',
    suggestedEdit: '',
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let hasHeading = false
  for (const line of lines) {
    if (critiqueWritingSectionHeadingKey(line)) {
      hasHeading = true
      break
    }
  }
  if (!hasHeading) {
    return { ...empty, overall: text.trim() }
  }

  let current: CritiqueWritingFeedbackKey | null = null
  const buckets: Record<CritiqueWritingFeedbackKey, string[]> = {
    overall: [],
    strengths: [],
    improvements: [],
    suggestedEdit: [],
  }

  for (const line of lines) {
    const heading = critiqueWritingSectionHeadingKey(line)
    if (heading) {
      current = heading
      continue
    }
    if (current) buckets[current].push(line)
    else buckets.overall.push(line)
  }

  for (const { key } of CRITIQUE_WRITING_FEEDBACK_SECTIONS) {
    empty[key] = buckets[key].join('\n').trim()
  }
  return empty
}

export function serializeCritiqueWritingFeedback(sections: CritiqueWritingFeedbackSections) {
  return CRITIQUE_WRITING_FEEDBACK_SECTIONS.map(({ key, label }) => ({ label, body: sections[key].trim() }))
    .filter(({ body }) => body.length > 0)
    .map(({ label, body }) => `${label}\n${body}`)
    .join('\n\n')
    .trim()
}

/** @deprecated Use parseCritiqueWritingFeedback */
export const parseMarkWritingFeedback = parseCritiqueWritingFeedback

/** @deprecated Use serializeCritiqueWritingFeedback */
export const serializeMarkWritingFeedback = serializeCritiqueWritingFeedback

/** @deprecated Use critiqueWritingSectionHeadingKey */
export const markWritingSectionHeadingKey = critiqueWritingSectionHeadingKey

export type AIResultPreview = {
  blockPayload?: AIBlockPayload
  documentPatch?: AIDocumentPatch
  previewError?: string
}

export function parseAIBlockPayloadForTask(taskType: AITaskType, draftText: string): AIBlockPayload | undefined {
  if (taskType === 'table_block') return { kind: 'table', data: parseAITablePayload(draftText) }
  if (taskType === 'quote_block') return { kind: 'quote', data: parseAIQuotePayload(draftText) }
  if (taskType === 'list_block') return { kind: 'list', data: parseAIListPayload(draftText) }
  if (taskType === 'code_block') return { kind: 'code', data: parseAICodePayload(draftText) }
  if (taskType === 'latex_block') return { kind: 'latex', data: parseAILatexPayload(draftText) }
  return undefined
}

export function parseAIResultPreview(taskType: AITaskType, draftText: string): AIResultPreview {
  const trimmed = draftText.trim()
  if (!trimmed) return {}
  try {
    if (taskType === 'compose_blocks') {
      return { documentPatch: parseAIDocumentPatch(trimmed) }
    }
    if (taskType === 'table_block') {
      return { blockPayload: { kind: 'table', data: parseAITablePayload(trimmed) } }
    }
    if (taskType === 'quote_block') {
      return { blockPayload: { kind: 'quote', data: parseAIQuotePayload(trimmed) } }
    }
    if (taskType === 'list_block') {
      return { blockPayload: { kind: 'list', data: parseAIListPayload(trimmed) } }
    }
    if (taskType === 'code_block') {
      return { blockPayload: { kind: 'code', data: parseAICodePayload(trimmed) } }
    }
    if (taskType === 'latex_block') {
      return { blockPayload: { kind: 'latex', data: parseAILatexPayload(trimmed) } }
    }
  } catch (error) {
    return { previewError: error instanceof Error ? error.message : 'Preview could not parse the draft.' }
  }
  return {}
}
