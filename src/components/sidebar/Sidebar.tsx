import { memo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Home,
  Layers3,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Settings,
  Atom as AtomIcon,
  Users,
  X as XIcon,
} from 'lucide-react'

import { VirtualList } from '../virtual/VirtualList'
import type { Note } from '../../db'
import { RELEASE_COMMUNITY_ENABLED } from '../../config/releaseFlags'
import { avatarTextColor } from '../../lib/profileHelpers'
import { isSetWorkspace } from '../../lib/atomNav'
import type { AtomSubView, View } from '../../types/navigation'
import { UNASSIGNED_PROJECT_ID } from '../../workspace/constants'

export type SidebarQuickSection = {
  id: string
  title: string
  notes: Note[]
}

export type SidebarProps = {
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
  onOpenAtomNav: () => void
  onOpenProjectsRoot: () => void
  onRenameNote: (noteId: string, title: string) => void
  onSetActiveView: (view: View) => void
  fullscreenActive: boolean
  onToggleFullscreen: () => void
}

const PROJECT_QUICK_NAV_ROW_HEIGHT = 34
const PROJECT_QUICK_NAV_MAX_HEIGHT = 240

export const Sidebar = memo(function Sidebar({
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
  onOpenAtomNav,
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
        <button className={activeView === 'atoms' ? 'active' : ''} type="button" onClick={onOpenAtomNav}>
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
