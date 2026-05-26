import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import type { AITaskType } from './aiTasks'
import type { AIStructuredOutput } from './aiTypes'
import { isRecord } from '../utils/isRecord'

type ValidationResult = { ok: true } | { ok: false; error: string }

const modeSchema = z.enum(['create', 'update'])
const stringArraySchema = z.array(z.string())
const stringTableSchema = z.array(z.array(z.string()))
const atomIdsSchema = z.array(z.string())

const placeholderArtifactSchema = z.object({
  version: z.number(),
  kind: z.literal('placeholder'),
  title: z.string(),
  body: z.string(),
})

const htmlArtifactSchema = z.object({
  version: z.number(),
  kind: z.literal('html'),
  title: z.string(),
  html: z.string(),
})

const aiBlockAttrsSchema = z.object({
  prompt: z.string(),
  sourceKind: z.enum(['placeholder', 'html']),
  source: z.string(),
  artifact: z.union([placeholderArtifactSchema, htmlArtifactSchema]).nullable(),
})

const paragraphOperationSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
})

const headingOperationSchema = z.object({
  type: z.literal('heading'),
  text: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})

const listOperationSchema = z.object({
  type: z.literal('list'),
  listType: z.enum(['checklist', 'bulletList', 'numberedList']),
  items: stringArraySchema,
})

const tableOperationSchema = z.object({
  type: z.literal('table'),
  columns: stringArraySchema,
  rows: stringTableSchema,
})

const quoteOperationSchema = z.object({
  type: z.literal('quote'),
  quote: z.string(),
  author: z.string().nullable(),
})

const codeOperationSchema = z.object({
  type: z.literal('code'),
  code: z.string(),
})

const latexOperationSchema = z.object({
  type: z.literal('latex'),
  latex: z.string(),
})

const aiBlockOperationSchema = z.object({
  type: z.literal('aiBlock'),
  attrs: aiBlockAttrsSchema,
})

const documentOperationSchema = z.union([
  paragraphOperationSchema,
  headingOperationSchema,
  listOperationSchema,
  tableOperationSchema,
  quoteOperationSchema,
  codeOperationSchema,
  latexOperationSchema,
  aiBlockOperationSchema,
])

const quizQuestionSchema = z.union([
  z.object({
    type: z.literal('true-false'),
    prompt: z.string(),
    answer: z.boolean(),
    explanation: z.string(),
    atomIds: atomIdsSchema,
  }),
  z.object({
    type: z.literal('multiple-choice'),
    prompt: z.string(),
    choices: stringArraySchema,
    answer: z.string(),
    explanation: z.string(),
    atomIds: atomIdsSchema,
  }),
  z.object({
    type: z.literal('matching'),
    prompt: z.string(),
    pairs: z.array(z.object({
      left: z.string(),
      right: z.string(),
    })),
    atomIds: atomIdsSchema,
  }),
  z.object({
    type: z.literal('short-answer'),
    prompt: z.string(),
    expectedAnswer: z.string(),
    rubric: z.string(),
    atomIds: atomIdsSchema,
  }),
])

const structuredTaskZodOutputs = {
  table_block: {
    name: 'loci_table_block',
    zodSchema: z.object({
      mode: modeSchema,
      columns: stringArraySchema,
      rows: stringTableSchema,
    }),
  },
  quote_block: {
    name: 'loci_quote_block',
    zodSchema: z.object({
      mode: modeSchema,
      quote: z.string(),
      author: z.string().nullable(),
    }),
  },
  list_block: {
    name: 'loci_list_block',
    zodSchema: z.object({
      mode: modeSchema,
      listType: z.enum(['checklist', 'bulletList', 'numberedList']),
      items: stringArraySchema,
    }),
  },
  latex_block: {
    name: 'loci_latex_block',
    zodSchema: z.object({
      mode: modeSchema,
      latex: z.string(),
    }),
  },
  compose_blocks: {
    name: 'loci_document_patch',
    zodSchema: z.object({
      intent: z.literal('insert'),
      operations: z.array(documentOperationSchema),
    }),
  },
  flashcard_quiz: {
    name: 'loci_flashcard_quiz',
    zodSchema: z.object({
      questions: z.array(quizQuestionSchema),
    }),
  },
  flashcard_short_answer_mark: {
    name: 'loci_short_answer_mark',
    zodSchema: z.object({
      score: z.number(),
      correct: z.boolean(),
      feedback: z.string(),
    }),
  },
} satisfies Partial<Record<AITaskType, { name: string; zodSchema: z.ZodType }>>

function structuredOutputFromZod({ name, zodSchema }: { name: string; zodSchema: z.ZodType }): AIStructuredOutput {
  const textFormat = zodTextFormat(zodSchema, name)
  return {
    name,
    schema: textFormat.schema,
    zodSchema,
  }
}

export const structuredTaskOutputs = Object.fromEntries(
  Object.entries(structuredTaskZodOutputs).map(([taskType, output]) => [taskType, structuredOutputFromZod(output)]),
) as Partial<Record<AITaskType, AIStructuredOutput>>

export function structuredOutputForTask(taskType: AITaskType): AIStructuredOutput | undefined {
  return structuredTaskOutputs[taskType]
}

export function structuredTaskNames() {
  return Object.keys(structuredTaskOutputs)
}

export function validateStructuredTaskValue(taskType: AITaskType, value: unknown): ValidationResult {
  const structuredOutput = structuredOutputForTask(taskType)
  if (!structuredOutput) return { ok: true }
  if (taskType === 'compose_blocks') {
    if (!isRecord(value)) return { ok: false, error: 'Structured response must be a JSON object.' }
    return validateComposePatch(value)
  }
  const parsed = structuredOutput.zodSchema.safeParse(value)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Structured response failed validation.' }
  const data = parsed.data as Record<string, unknown>
  if (taskType === 'table_block') return validateStringArray(data.columns, 'columns') || validateTableRows(data.rows) || { ok: true }
  if (taskType === 'quote_block') return typeof data.quote === 'string' && data.quote.trim() ? { ok: true } : { ok: false, error: 'Quote response needs quote text.' }
  if (taskType === 'list_block') return validateListBlock(data)
  if (taskType === 'latex_block') return typeof data.latex === 'string' && data.latex.trim() ? { ok: true } : { ok: false, error: 'LaTeX response needs latex source.' }
  if (taskType === 'flashcard_quiz') return Array.isArray(data.questions) && data.questions.length ? { ok: true } : { ok: false, error: 'Quiz response needs questions.' }
  if (taskType === 'flashcard_short_answer_mark') return { ok: true }
  return { ok: true }
}

export function findOptionalPropertiesInStructuredSchema(schema: unknown, path = 'schema'): string[] {
  if (!isRecord(schema)) return []
  const findings: string[] = []
  const properties = isRecord(schema.properties) ? schema.properties : null
  if (properties) {
    const required = Array.isArray(schema.required) ? new Set(schema.required.filter((item): item is string => typeof item === 'string')) : new Set<string>()
    for (const key of Object.keys(properties)) {
      if (!required.has(key)) findings.push(`${path}.${key}`)
    }
  }
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'properties' && isRecord(value)) {
      for (const [propertyName, propertySchema] of Object.entries(value)) {
        findings.push(...findOptionalPropertiesInStructuredSchema(propertySchema, `${path}.${propertyName}`))
      }
      continue
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        findings.push(...findOptionalPropertiesInStructuredSchema(item, `${path}.${key}[${index}]`))
      })
      continue
    }
    findings.push(...findOptionalPropertiesInStructuredSchema(value, `${path}.${key}`))
  }
  return findings
}

function validateStringArray(value: unknown, label: string): ValidationResult | null {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return null
  return { ok: false, error: `${label} must be an array of strings.` }
}

function validateTableRows(value: unknown): ValidationResult | null {
  if (Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))) return null
  return { ok: false, error: 'rows must be a string table.' }
}

function validateListBlock(value: Record<string, unknown>): ValidationResult {
  const listTypes = ['checklist', 'bulletList', 'numberedList']
  if (!listTypes.includes(String(value.listType))) return { ok: false, error: 'List response needs a valid listType.' }
  return validateStringArray(value.items, 'items') ?? { ok: true }
}

function validateComposePatch(value: Record<string, unknown>): ValidationResult {
  if (value.intent !== 'insert') return { ok: false, error: 'Document patch intent must be insert.' }
  if (!Array.isArray(value.operations) || !value.operations.length) return { ok: false, error: 'Document patch needs operations.' }
  const supported = new Set(['paragraph', 'heading', 'list', 'table', 'quote', 'code', 'latex', 'aiBlock'])
  for (const operation of value.operations) {
    if (!isRecord(operation) || !supported.has(String(operation.type))) return { ok: false, error: 'Document patch includes an unsupported operation.' }
    if (operation.type === 'aiBlock') {
      const attrs = isRecord(operation.attrs) ? operation.attrs : {}
      if (!attrs.artifact && !(attrs.sourceKind === 'html' && typeof attrs.source === 'string' && attrs.source.trim())) {
        return { ok: false, error: 'AI-Block operation needs artifact or html source.' }
      }
    }
  }
  return { ok: true }
}
