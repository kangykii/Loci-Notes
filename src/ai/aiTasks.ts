import type { AIProviderId } from './aiTypes'

export type AITaskType =
  | 'ai_atomise'
  | 'edit_selection'
  | 'generate_insert'
  | 'table_block'
  | 'quote_block'
  | 'list_block'
  | 'code_block'
  | 'latex_block'
  | 'answer_with_context'
  | 'summarize_note'
  | 'mark_writing'
  | 'update_project_instructions'
  | 'app_help'
  | 'atom_task'
  | 'general'

export type AICommandId = 'rewrite' | 'continue' | 'summarise' | 'atomise' | 'mark' | 'custom'

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

export type AIResult = {
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

export const AI_SYSTEM_INSTRUCTION = [
  "You are Loci Notes' task assistant.",
  'Help the user complete writing and knowledge-management tasks inside the app.',
  'Use provided note, project, and editor context whenever possible.',
  'Keep a neutral tone and prefer precise edits and concise output.',
  'Use plain editor text. Do not use Markdown heading markers, bold markers, code fences, or table syntax.',
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
  answer_with_context: 'Task: answer_with_context. Answer briefly using note/project context. Mention the context used in plain language when useful. Do not format as insertable prose by default.',
  summarize_note: 'Task: summarize_note. Return plain text with short section headings and dash bullets. Do not use Markdown syntax.',
  mark_writing: 'Task: mark_writing. Mark the writing against the supplied marking criteria. Return concise plain-text sections: Overall, Strengths, Improvements, Suggested edit. If no clear criteria are supplied, use the default criteria from context and say that default criteria were used. Do not use Markdown syntax.',
  update_project_instructions: 'Task: update_project_instructions. Draft a concise replacement project description with exactly these plain-text section labels: Summary, Instructions, Writing style, Marking criteria. Use current project memory as the base, integrate reusable guidance from the latest AI draft, and avoid copying note-specific content.',
  app_help: 'Task: app_help. Answer as product guidance for Loci Notes. Do not write document text unless asked.',
  atom_task: 'Task: atom_task. Return atom candidates as one per line in the format "Phrase — definition". Keep definitions short and clear.',
  general: 'Task: general. Answer briefly. Ask for missing context only when necessary.',
}

export const DEFAULT_MARKING_CRITERIA = [
  'Clarity: the writing is easy to follow and uses precise language.',
  'Structure: ideas are ordered logically with clear transitions.',
  'Evidence: claims are supported by relevant examples, facts, or reasoning.',
  'Depth: the writing explains significance rather than only listing points.',
  'Tone: the writing fits the project context and intended reader.',
].join('\n')

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

export function taskFromAICommand(command: AICommandId, hasSelection: boolean): AITaskType | undefined {
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

export function defaultPromptForCommand(command: AICommandId, hasSelection: boolean) {
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

export function routeAITask(prompt: string, hasSelection: boolean, command?: AICommandId): AITaskType {
  const explicitTask = command ? taskFromAICommand(command, hasSelection) : undefined
  if (explicitTask) return explicitTask

  const q = prompt.toLowerCase().trim()
  if (/\b(table|tabulate|spreadsheet|columns?|rows?|grid|organise .*data|organize .*data)\b/.test(q)) return 'table_block'
  if (/\b(quote|qoute|blockquote|pull quote|pull qoute|cite this|citation|add author|shorten quote|shorten qoute|polish quote|polish qoute)\b/.test(q)) return 'quote_block'
  if (/\b(checklist|check list|numbered list|ordered list|bullet list|dot points?|list items?|todo list|to-do list)\b/.test(q)) return 'list_block'
  if (/\b(code|function|snippet|program|script|typescript|javascript|python|rust|sql|debug this code|fix this code)\b/.test(q)) return 'code_block'
  if (/\b(latex|equation|formula|maths?|mathematical|solve for|derive)\b/.test(q)) return 'latex_block'
  if (/\b(atomi[sz]e|make atoms?|create atoms?|extract atoms?|key terms?|define terms?|glossary|concept cards?)\b/.test(q)) return 'ai_atomise'
  if (/\b(mark|grade|rubric|criteria|assess|evaluate|feedback|review my writing|score|critique)\b/.test(q)) return 'mark_writing'
  if (/\b(how do i|how to|where is|settings?|export|pdf|docx|create|delete|shortcut|sidebar|project|note history)\b/.test(q)) return 'app_help'
  if (/\b(summar(?:y|ize|ise)|recap|outline|flashcards?|study guide|key points?|explain this note|what is this note saying|tl;?dr)\b/.test(q)) return 'summarize_note'
  if (hasSelection && /\b(rewrite|revise|fix|clean up|sharpen|make sharper|concise|shorten|expand|improve|polish|edit|grammar|tone|clarify|simplify|make academic|make formal|make casual)\b/.test(q)) return 'edit_selection'
  if (/\b(write|draft|compose|add|insert|continue|extend|intro|introduction|paragraph|section|conclusion|next part|turn this into)\b/.test(q)) return 'generate_insert'
  if (/\b(what|why|how|explain|compare|does|is this|means?|meaning|difference between|relationship between)\b/.test(q)) return 'answer_with_context'
  return hasSelection ? 'edit_selection' : 'general'
}

export function aiActionConfig(taskType: AITaskType, hasSelection: boolean) {
  return {
    actionLabel:
      taskType === 'edit_selection'
        ? 'Replace selection'
        : taskType === 'atom_task' || taskType === 'ai_atomise'
          ? 'Create atoms'
          : taskType === 'table_block' || taskType === 'quote_block'
            ? 'Apply block'
            : taskType === 'list_block' || taskType === 'code_block' || taskType === 'latex_block'
              ? 'Apply block'
            : taskType === 'mark_writing'
              ? 'Copy feedback'
              : taskType === 'answer_with_context' || taskType === 'app_help'
                ? 'Copy'
                : 'Insert',
    canReplaceSelection: taskType === 'edit_selection' && hasSelection,
    canInsert: taskType === 'generate_insert' || taskType === 'summarize_note' || taskType === 'general',
    canCreateAtoms: taskType === 'atom_task' || taskType === 'ai_atomise',
    canApplyBlock: taskType === 'table_block' || taskType === 'quote_block' || taskType === 'list_block' || taskType === 'code_block' || taskType === 'latex_block',
  }
}

export function aiResultTitle(result: AIResult) {
  const promptTitle = result.prompt.trim()
  if (promptTitle) return promptTitle
  if (result.taskType === 'mark_writing') return 'Marked writing'
  if (result.taskType === 'ai_atomise' || result.taskType === 'atom_task') return 'Atomise'
  return 'AI draft'
}

export function aiPrimaryActionLabel(result: AIResult) {
  if (result.canReplaceSelection) return 'Apply rewrite'
  if (result.canCreateAtoms) return 'Create atoms'
  if (result.canApplyBlock) return 'Apply block'
  if (result.taskType === 'mark_writing') return 'Add feedback to note'
  return 'Insert draft'
}

export function aiDraftLabel(taskType: AITaskType) {
  if (taskType === 'mark_writing') return 'Editable feedback'
  if (taskType === 'ai_atomise' || taskType === 'atom_task') return 'Editable atom candidates'
  if (taskType === 'table_block' || taskType === 'quote_block' || taskType === 'list_block' || taskType === 'latex_block') return 'Editable block JSON'
  if (taskType === 'code_block') return 'Editable code block'
  if (taskType === 'update_project_instructions') return 'Editable project instructions'
  return 'Editable draft'
}

export function canResultUpdateProjectInstructions(taskType: AITaskType) {
  return taskType === 'mark_writing' || taskType === 'summarize_note' || taskType === 'generate_insert' || taskType === 'edit_selection'
}

export function taskUsesWritingStyle(taskType: AITaskType) {
  return taskType === 'edit_selection' || taskType === 'generate_insert' || taskType === 'summarize_note' || taskType === 'general'
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
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('AI did not return JSON.')
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown
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

export const MARK_WRITING_FEEDBACK_SECTIONS = [
  { key: 'overall', label: 'Overall' },
  { key: 'strengths', label: 'Strengths' },
  { key: 'improvements', label: 'Improvements' },
  { key: 'suggestedEdit', label: 'Suggested edit' },
] as const

export type MarkWritingFeedbackKey = (typeof MARK_WRITING_FEEDBACK_SECTIONS)[number]['key']

export type MarkWritingFeedbackSections = Record<MarkWritingFeedbackKey, string>

export function markWritingSectionHeadingKey(line: string): MarkWritingFeedbackKey | null {
  const normalized = line.trim().replace(/:+\s*$/, '').toLowerCase()
  for (const { key, label } of MARK_WRITING_FEEDBACK_SECTIONS) {
    if (normalized === label.toLowerCase()) return key
  }
  return null
}

export function parseMarkWritingFeedback(text: string): MarkWritingFeedbackSections {
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

export function serializeMarkWritingFeedback(sections: MarkWritingFeedbackSections) {
  return MARK_WRITING_FEEDBACK_SECTIONS.map(({ key, label }) => ({ label, body: sections[key].trim() }))
    .filter(({ body }) => body.length > 0)
    .map(({ label, body }) => `${label}\n${body}`)
    .join('\n\n')
    .trim()
}
