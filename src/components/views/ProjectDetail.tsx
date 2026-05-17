import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch, DragEvent, SetStateAction } from 'react'
import { ArrowLeft, ChevronDown, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { Note, Project } from '../../db'
import { collectText } from '../../editor/blocks'
import {
  PROJECT_MEMORY_FIELD_META,
  PROJECT_MEMORY_HEADINGS,
  parseProjectMemory,
  updateProjectMemorySection,
} from '../../projects/projectMemory'
import { PageHeader } from '../layout/PageHeader'

type AtomCard = {
  atom: {
    id: string
    phrase: string
    definition: string
    knownCount: number
    reviewCount: number
  }
  projectIds: string[]
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
  const resizeFrameRef = useRef<number | null>(null)

  const syncHeight = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const minPx = 68
    el.style.height = `${Math.max(minPx, el.scrollHeight)}px`
  }, [])

  const scheduleSyncHeight = useCallback(() => {
    if (resizeFrameRef.current) return
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = null
      syncHeight()
    })
  }, [syncHeight])

  useLayoutEffect(() => {
    syncHeight()
  }, [value, syncHeight])

  useEffect(() => {
    window.addEventListener('resize', scheduleSyncHeight)
    return () => {
      window.removeEventListener('resize', scheduleSyncHeight)
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
    }
  }, [scheduleSyncHeight])

  return (
    <textarea
      ref={ref}
      className="project-memory-field scroll-hover"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
    />
  )
}

export function ProjectDetail({
  project,
  notes,
  atomCards,
  draggedNoteIds,
  selectedNoteIds,
  onNoteDragStart,
  onNoteDragEnd,
  onNoteSelect,
  deleteNote,
  openNote,
  newNote,
  renameNote,
  deleteProject,
  updateDescription,
  updateName,
  back,
  formatDay,
}: {
  project: Project
  notes: Note[]
  atomCards: AtomCard[]
  draggedNoteIds: string[]
  selectedNoteIds: string[]
  onNoteDragStart: (event: DragEvent<HTMLElement>, noteId: string) => void
  onNoteDragEnd: () => void
  onNoteSelect: Dispatch<SetStateAction<string[]>>
  deleteNote: (note: Note) => void
  openNote: (noteId: string) => void
  newNote: () => void
  renameNote: (noteId: string, title: string) => void
  deleteProject: () => void
  updateDescription: (description: string) => void
  updateName: (name: string) => void
  back: () => void
  formatDay: (value: string) => string
}) {
  const projectNotes = notes.filter((note) => note.projectId === project.id)
  const projectAtoms = atomCards.filter((card) => card.projectIds.includes(project.id))
  const projectMemory = parseProjectMemory(project.description ?? '')
  const [projectDescriptionOpen, setProjectDescriptionOpen] = useState(false)
  const [projectTitleEditing, setProjectTitleEditing] = useState(false)
  const [projectTitleDraft, setProjectTitleDraft] = useState(project.name)
  const [editingNoteId, setEditingNoteId] = useState('')
  const [editingNoteTitle, setEditingNoteTitle] = useState('')
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

  const startNoteRename = (note: Note) => {
    setEditingNoteId(note.id)
    setEditingNoteTitle(note.title || 'Untitled Note')
  }

  const commitNoteRename = (note: Note) => {
    const nextTitle = editingNoteTitle.replace(/\s*\r?\n\s*/g, ' ').trim() || 'Untitled Note'
    setEditingNoteTitle(nextTitle)
    setEditingNoteId('')
    if (nextTitle !== note.title) renameNote(note.id, nextTitle)
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
            <details className="project-header-menu">
              <summary aria-label="More project actions" title="More project actions">
                <MoreHorizontal size={18} aria-hidden />
              </summary>
              <button type="button" onClick={deleteProject} aria-label={`Delete ${project.name}`}>
                <Trash2 size={15} aria-hidden /> Delete project
              </button>
            </details>
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
                  {editingNoteId === note.id ? (
                    <input
                      className="note-title-rename-input project-note-title-input"
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
                    <strong
                      className="project-note-title-editable"
                      title="Double-click to rename"
                      onDoubleClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        startNoteRename(note)
                      }}
                    >
                      {note.title || 'Untitled Note'}
                    </strong>
                  )}
                  <span className="file-row-date">{formatDay(note.updatedAt)}</span>
                  <p>{collectText(note.content) || 'Empty note'}</p>
                  <button
                    type="button"
                    className="note-row-delete"
                    aria-label={`Delete ${note.title || 'Untitled Note'}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
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
