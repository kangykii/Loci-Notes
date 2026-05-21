import type { ReactNode, RefObject } from 'react'
import { X } from 'lucide-react'
import { ModalBackdrop } from './ModalBackdrop'
import {
  MARK_WRITING_FEEDBACK_SECTIONS,
  aiDraftLabel,
  aiPrimaryActionLabel,
  aiResultTitle,
  parseMarkWritingFeedback,
  serializeMarkWritingFeedback,
} from '../../ai/aiTasks'
import type { AIBlockPayload, AIResult, MarkWritingFeedbackKey } from '../../ai/aiTasks'

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

export function AIResultDialog({
  result,
  selectedProjectName,
  aiInstructionUpdating,
  anchorRef,
  containerRef,
  onClose,
  onDraftChange,
  onPrimaryAction,
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
  onPrimaryAction: () => void
  onDraftProjectInstructions: () => void
  onSaveProjectInstructions: (draft: string) => void
  onCopy: () => void
}) {
  return (
    <ModalBackdrop anchorRef={anchorRef} containerRef={containerRef} className="ai-result-backdrop" onClose={onClose}>
      <section
        className={`ai-result-dialog${result.canReplaceSelection && result.selectionOriginalText !== undefined ? ' ai-result-dialog--wide' : ''}`}
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
          {result.taskType === 'mark_writing' ? (
            <MarkWritingFeedbackFields
              draftText={result.draftText}
              onChange={(next) => onDraftChange({ draftText: next })}
            />
          ) : result.canReplaceSelection && result.selectionOriginalText !== undefined ? (
            <div className="ai-rewrite-compare" aria-label="Original selection and replacement">
              <div className="ai-rewrite-compare-pane">
                <span className="ai-rewrite-compare-heading">Original selection</span>
                <div className="ai-rewrite-compare-readonly">{result.selectionOriginalText.trim() || '—'}</div>
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
          {result.taskType !== 'mark_writing' &&
            result.taskType !== 'ai_atomise' &&
            result.taskType !== 'atom_task' && (
              <details className="ai-draft-preview-details" open>
                <summary>Formatted preview</summary>
                <div className="ai-draft-preview-panel">
                  {result.blockPayload ? (
                    <AIBlockFormattedPreview payload={result.blockPayload} />
                  ) : (
                    <AiDraftFormattedPreview text={result.draftText} />
                  )}
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
          {(result.canCreateAtoms || result.canApplyBlock || result.canReplaceSelection || result.canInsert || result.taskType === 'answer_with_context' || result.taskType === 'app_help' || result.taskType === 'mark_writing') && (
            <button type="button" className="primary" onClick={onPrimaryAction}>
              {aiPrimaryActionLabel(result)}
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
