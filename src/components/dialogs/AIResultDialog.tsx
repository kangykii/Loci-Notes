import { useMemo, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'
import { ModalBackdrop } from './ModalBackdrop'
import {
  CRITIQUE_WRITING_FEEDBACK_SECTIONS,
  aiDraftLabel,
  aiResultTitle,
  parseAIResultPreview,
  parseCritiqueWritingFeedback,
  serializeCritiqueWritingFeedback,
} from '../../ai/aiTasks'
import type { AIBlockPayload, AIResult, AIDocumentOperation, CritiqueWritingFeedbackKey } from '../../ai/aiTasks'
import type { AIDocumentPatch } from '../../ai/aiTasks'

function CritiqueWritingFeedbackFields({
  draftText,
  onChange,
}: {
  draftText: string
  onChange: (next: string) => void
}) {
  const sections = parseCritiqueWritingFeedback(draftText)
  const patch = (key: CritiqueWritingFeedbackKey, value: string) => {
    onChange(serializeCritiqueWritingFeedback({ ...sections, [key]: value }))
  }

  return (
    <div className="ai-critique-feedback-cards" role="group" aria-label="Editable critique sections">
      {CRITIQUE_WRITING_FEEDBACK_SECTIONS.map(({ key, label }) => (
        <div key={key} className="ai-critique-feedback-card">
          <span className="ai-critique-feedback-card-title">{label}</span>
          <textarea
            className="ai-critique-feedback-card-input"
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

export function AIBlockFormattedPreview({ payload }: { payload: AIBlockPayload }) {
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

  if (payload.kind === 'list') {
    const ordered = payload.data.listType === 'numberedList'
    const checklist = payload.data.listType === 'checklist'
    const ListTag = ordered ? 'ol' : 'ul'
    return (
      <div className="ai-block-preview">
        <ListTag className="ai-block-preview-list">
          {payload.data.items.map((item, index) => (
            <li key={`${item}-${index}`}>
              {checklist && <span aria-hidden className="ai-block-preview-check" />}
              {item}
            </li>
          ))}
        </ListTag>
      </div>
    )
  }

  if (payload.kind === 'code') {
    return (
      <div className="ai-block-preview">
        <pre className="ai-block-preview-code"><code>{payload.data.code}</code></pre>
      </div>
    )
  }

  if (payload.kind === 'latex') {
    return (
      <div className="ai-block-preview">
        <figure className="ai-block-preview-latex">
          <code>{payload.data.latex}</code>
        </figure>
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

function DocumentOperationPreview({ operation }: { operation: AIDocumentOperation }) {
  if (operation.type === 'table') {
    return <AIBlockFormattedPreview payload={{ kind: 'table', data: { mode: 'create', columns: operation.columns, rows: operation.rows } }} />
  }
  if (operation.type === 'list') {
    return <AIBlockFormattedPreview payload={{ kind: 'list', data: { mode: 'create', listType: operation.listType, items: operation.items } }} />
  }
  if (operation.type === 'quote') {
    return <AIBlockFormattedPreview payload={{ kind: 'quote', data: { mode: 'create', quote: operation.quote, author: operation.author } }} />
  }
  if (operation.type === 'code') {
    return <AIBlockFormattedPreview payload={{ kind: 'code', data: { mode: 'create', code: operation.code } }} />
  }
  if (operation.type === 'latex') {
    return <AIBlockFormattedPreview payload={{ kind: 'latex', data: { mode: 'create', latex: operation.latex } }} />
  }
  if (operation.type === 'aiBlock') {
    const html = operation.attrs.artifact?.kind === 'html' ? operation.attrs.artifact.html : ''
    return (
      <div className="ai-block-preview">
        <p><strong>{operation.attrs.artifact?.title ?? 'AI-Block'}</strong> ({operation.attrs.sourceKind})</p>
        {html ? <pre className="ai-block-preview-code ai-block-preview-html-snippet">{html.slice(0, 400)}{html.length > 400 ? '…' : ''}</pre> : null}
      </div>
    )
  }
  if (operation.type === 'heading') {
    const Tag = operation.level === 1 ? 'h1' : operation.level === 3 ? 'h3' : 'h2'
    return <div className="ai-block-preview"><Tag className="ai-draft-preview-p">{operation.text}</Tag></div>
  }
  return <p className="ai-draft-preview-p">{operation.text}</p>
}

function AIDocumentPatchPreview({ patch }: { patch: AIDocumentPatch }) {
  const aiBlocks = patch.operations.filter((operation) => operation.type === 'aiBlock')
  return (
    <div className="ai-block-preview ai-document-patch-preview">
      <p><strong>{patch.operations.length}</strong> block{patch.operations.length === 1 ? '' : 's'} in this patch.</p>
      <div className="ai-document-patch-preview-stack">
        {patch.operations.map((operation, index) => (
          <div key={`${operation.type}-${index}`} className="ai-document-patch-preview-item">
            <span className="ai-document-patch-preview-label">{operation.type}</span>
            <DocumentOperationPreview operation={operation} />
          </div>
        ))}
      </div>
      {!!aiBlocks.length && <p>{aiBlocks.length} sandboxed artifact{aiBlocks.length === 1 ? '' : 's'} included.</p>}
    </div>
  )
}

function AIResultFormattedPreview({ result }: { result: AIResult }) {
  const parsed = useMemo(
    () => parseAIResultPreview(result.taskType, result.draftText),
    [result.draftText, result.taskType],
  )

  if (parsed.previewError) {
    return <p className="ai-draft-preview-empty">{parsed.previewError}</p>
  }
  if (parsed.blockPayload) {
    return <AIBlockFormattedPreview payload={parsed.blockPayload} />
  }
  if (parsed.documentPatch) {
    return <AIDocumentPatchPreview patch={parsed.documentPatch} />
  }
  return <AiDraftFormattedPreview text={result.draftText} />
}

export function AIResultDialog({
  result,
  selectedProjectName,
  aiInstructionUpdating,
  anchorRef,
  containerRef,
  onClose,
  onDraftChange,
  onInsert,
  onReplace,
  onCreateAtoms,
  onDraftProjectInstructions,
  onSaveProjectInstructions,
  onCopy,
}: {
  result: AIResult
  selectedProjectName?: string
  aiInstructionUpdating: boolean
  anchorRef?: RefObject<HTMLElement | null>
  containerRef?: RefObject<HTMLElement | null>
  onClose: () => void
  onDraftChange: (patch: Partial<Pick<AIResult, 'draftText' | 'projectInstructionDraft'>>) => void
  onInsert: () => void
  onReplace: () => void
  onCreateAtoms?: () => void
  onDraftProjectInstructions: () => void
  onSaveProjectInstructions: (draft: string) => void
  onCopy: () => void
}) {
  const showRewriteCompare = result.taskType === 'edit_selection' && result.selectionOriginalText !== undefined

  return (
    <ModalBackdrop anchorRef={anchorRef} containerRef={containerRef} className="ai-result-backdrop" onClose={onClose}>
      <section
        className={`ai-result-dialog${showRewriteCompare ? ' ai-result-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-result-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="ai-result-close" type="button" onClick={onClose} aria-label="Close AI result">
          <X size={18} />
        </button>
        <div className="ai-result-dialog-scroll scroll-hover">
          <h2 id="ai-result-title">{aiResultTitle(result)}</h2>
          {result.parseError && (
            <details className="ai-result-warning">
              <summary>Structured response failed validation</summary>
              <p>Edit the draft, then apply it again.</p>
              <pre>{result.parseError}</pre>
            </details>
          )}
          {result.taskType === 'critique_writing' ? (
            <CritiqueWritingFeedbackFields
              draftText={result.draftText}
              onChange={(next) => onDraftChange({ draftText: next })}
            />
          ) : showRewriteCompare ? (
            <div className="ai-rewrite-compare" aria-label="Original selection and replacement">
              <div className="ai-rewrite-compare-pane">
                <span className="ai-rewrite-compare-heading">Original selection</span>
                <div className="ai-rewrite-compare-readonly">{result.selectionOriginalText?.trim() || '—'}</div>
              </div>
              <div className="ai-rewrite-compare-pane">
                <label className="ai-draft-editor ai-rewrite-compare-draft">
                  <textarea
                    value={result.draftText}
                    onChange={(event) => onDraftChange({ draftText: event.target.value })}
                    aria-label={aiDraftLabel(result.taskType)}
                    autoFocus
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="ai-draft-editor">
              <textarea
                value={result.draftText}
                onChange={(event) => onDraftChange({ draftText: event.target.value })}
                aria-label={aiDraftLabel(result.taskType)}
                autoFocus
              />
            </label>
          )}
          {result.taskType !== 'ai_atomise' && (
            <details className="ai-draft-preview-details" open>
              <summary>Formatted preview</summary>
              <div className="ai-draft-preview-panel">
                <AIResultFormattedPreview result={result} />
              </div>
            </details>
          )}
          {result.projectInstructionDraft !== undefined && (
            <label className="ai-draft-editor ai-project-instruction-draft">
              <textarea
                value={result.projectInstructionDraft}
                onChange={(event) => onDraftChange({ projectInstructionDraft: event.target.value })}
                aria-label="Project instructions update"
              />
            </label>
          )}
        </div>
        <footer>
          {result.canInsertDocument && (
            <button type="button" className="primary" onClick={onInsert}>
              Insert
            </button>
          )}
          {result.canInsertDocument && (
            <button
              type="button"
              onClick={onReplace}
              disabled={!result.canReplaceDocument}
              title={result.canReplaceDocument ? 'Replace the selection or active block' : 'Select text or a block to replace'}
            >
              Replace
            </button>
          )}
          {result.canCreateAtoms && onCreateAtoms && (
            <button type="button" onClick={onCreateAtoms}>
              Create atoms
            </button>
          )}
          {result.canUpdateProjectInstructions && selectedProjectName && result.projectInstructionDraft === undefined && (
            <button type="button" onClick={onDraftProjectInstructions} disabled={aiInstructionUpdating}>
              {aiInstructionUpdating ? 'Drafting...' : 'Update project instructions'}
            </button>
          )}
          {selectedProjectName && result.projectInstructionDraft !== undefined && (
            <button
              type="button"
              onClick={() => {
                const draft = result.projectInstructionDraft?.trim()
                if (!draft) return
                onSaveProjectInstructions(draft)
              }}
            >
              Save project instructions
            </button>
          )}
          <button type="button" onClick={onCopy}>Copy</button>
        </footer>
      </section>
    </ModalBackdrop>
  )
}
