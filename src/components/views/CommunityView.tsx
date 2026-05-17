import { useEffect, useMemo, useState } from 'react'
import { Check, FileText, MoreHorizontal, Plus, Search, Send, Users, X } from 'lucide-react'
import type { FriendGroup, Friendship, Note, SharedNoteExport } from '../../db'
import type { CommunityTarget } from '../../community/types'
import { collectNotePreviewLines } from '../../editor/blocks'
import { buildCommunityRecipients, communityRecipientId } from '../../services/communityRecipientService'
import type { FriendSearchResult } from '../../services/friendService'
import { PageHeader } from '../layout/PageHeader'

type CommunityViewProps = {
  searchQuery: string
  searchResults: FriendSearchResult[]
  canAddRecipients: boolean
  communityTarget: CommunityTarget | null
  pinnedRecipientIds: string[]
  friendships: Friendship[]
  friendGroups: FriendGroup[]
  selectedFriend?: Friendship
  selectedGroup?: FriendGroup
  selectedNote?: Note
  selectedShares: SharedNoteExport[]
  notes: Note[]
  onSearchQueryChange: (value: string) => void
  onSearch: () => void
  onAddSearchResult: (result: FriendSearchResult) => void
  onCreateGroup: () => void
  onSelectTarget: (target: CommunityTarget) => void
  onTogglePinnedTarget: (target: CommunityTarget) => void
  onAcceptFriend: (friendshipId: string) => void
  onRejectFriend: (friendshipId: string) => void
  onRemoveFriend: (friendshipId: string) => void
  onSendNote: (permission: SharedNoteExport['permission'], noteId?: string) => void
  onCreateCollaboration: (noteId: string) => void
  formatDay: (value: string) => string
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const initials = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`
  return initials.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()
}

export function CommunityView({
  searchQuery,
  searchResults,
  canAddRecipients,
  communityTarget,
  pinnedRecipientIds,
  friendships,
  friendGroups,
  selectedFriend,
  selectedGroup,
  selectedNote,
  selectedShares,
  notes,
  onSearchQueryChange,
  onSearch,
  onAddSearchResult,
  onCreateGroup,
  onSelectTarget,
  onTogglePinnedTarget,
  onAcceptFriend,
  onRejectFriend,
  onRemoveFriend,
  onSendNote,
  onCreateCollaboration,
  formatDay,
}: CommunityViewProps) {
  const [composerQuery, setComposerQuery] = useState('')
  const [stagedNoteId, setStagedNoteId] = useState<string | null>(null)
  const communityRecipients = buildCommunityRecipients(friendships, friendGroups, pinnedRecipientIds)
  const composerResults = useMemo(() => {
    const query = composerQuery.trim().toLowerCase()
    if (!query) return []
    return notes
      .filter((note) => {
        const preview = collectNotePreviewLines(note.content, 1).join(' ').toLowerCase()
        return note.title.toLowerCase().includes(query) || preview.includes(query)
      })
      .slice(0, 5)
  }, [composerQuery, notes])
  const stagedNote = useMemo(
    () => (stagedNoteId ? notes.find((note) => note.id === stagedNoteId) ?? null : null),
    [notes, stagedNoteId],
  )
  useEffect(() => {
    if (stagedNoteId && !notes.some((note) => note.id === stagedNoteId)) {
      setStagedNoteId(null)
    }
  }, [notes, stagedNoteId])
  const hasRecipient = Boolean(selectedFriend || selectedGroup)
  const canSendStagedNote = hasRecipient && Boolean(stagedNote)
  const sendNoteTitle = canSendStagedNote ? 'Send drafted note' : 'Pick a note from search (Enter or click), then send'

  return (
    <section className="main-pane community-pane">
      <PageHeader
        title="Community"
        action={(
          <div className="community-header-actions">
            <button type="button" aria-label="Create group" title="Create group" onClick={onCreateGroup}>
              <Plus size={17} aria-hidden /> Create group
            </button>
          </div>
        )}
      />
      <div className="community-messenger">
        <aside className="community-rail">
          <div className="community-search-wrap">
            <div className="community-rail-search">
              <Search size={16} aria-hidden />
              <input
                value={searchQuery}
                placeholder="Find @user tag"
                onChange={(event) => onSearchQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onSearch()
                }}
              />
            </div>

            {searchResults.length > 0 && (
              <div className="community-search-results">
                <span>Search results</span>
                {searchResults.map((result) => (
                  <article className="community-recipient-row" key={result.accountId}>
                    <div className="community-mini-avatar">{initialsFromName(result.displayName) || '?'}</div>
                    <div>
                      <strong>{result.displayName}</strong>
                      <span>{result.handle ? `@${result.handle}` : 'No handle'}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!canAddRecipients}
                      onClick={() => onAddSearchResult(result)}
                    >
                      Add
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="community-rail-section">
            {communityRecipients.length ? communityRecipients.map((recipient) => {
              const target = { kind: recipient.kind, id: recipient.id }
              const pinned = pinnedRecipientIds.includes(communityRecipientId(recipient.kind, recipient.id))
              const pending = recipient.kind === 'friend' && recipient.status !== 'accepted'
              return (
                <button
                  type="button"
                  className={`community-recipient-row ${communityTarget?.kind === recipient.kind && communityTarget.id === recipient.id ? 'is-active' : ''} ${pinned ? 'is-pinned' : ''}`}
                  key={`${recipient.kind}_${recipient.id}`}
                  title="Double-click to pin or unpin"
                  onClick={() => onSelectTarget(target)}
                  onDoubleClick={() => onTogglePinnedTarget(target)}
                >
                  <div className="community-mini-avatar">{recipient.initials}</div>
                  <div>
                    <strong>{recipient.title}</strong>
                    {recipient.subtitle && <span>{recipient.subtitle}</span>}
                  </div>
                  {pending && (
                    <span className="community-pending-actions" aria-label="Pending request actions">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Accept request"
                        onClick={(event) => {
                          event.stopPropagation()
                          onAcceptFriend(recipient.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            onAcceptFriend(recipient.id)
                          }
                        }}
                      >
                        <Check size={13} aria-hidden />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Reject request"
                        onClick={(event) => {
                          event.stopPropagation()
                          onRejectFriend(recipient.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            onRejectFriend(recipient.id)
                          }
                        }}
                      >
                        <X size={13} aria-hidden />
                      </span>
                    </span>
                  )}
                  {pinned && (
                    <svg className="community-pin-mark" viewBox="0 0 24 24" aria-label="Pinned">
                      <path d="M9 4h6" />
                      <path d="M10 4v6l-3 4h10l-3-4V4" />
                      <path d="M12 14v6" />
                    </svg>
                  )}
                </button>
              )
            }) : (
              <p className="community-empty">No recipients yet.</p>
            )}
          </div>
        </aside>

        <section className="community-send-panel">
          {selectedFriend || selectedGroup ? (
            <>
              <header className="community-send-header">
                <div className={`community-large-avatar ${selectedGroup ? 'is-group' : ''}`}>
                  {selectedFriend ? initialsFromName(selectedFriend.friendDisplayName) || '?' : <Users size={24} aria-hidden />}
                </div>
                <div>
                  <h2>{selectedFriend?.friendDisplayName ?? selectedGroup?.name}</h2>
                  <p>{selectedFriend ? selectedFriend.friendHandle ? `@${selectedFriend.friendHandle}` : selectedFriend.status === 'accepted' ? 'Connected' : 'Pending request' : selectedGroup ? `${selectedGroup.memberAccountIds.length} members` : ''}</p>
                </div>
                {selectedFriend && (
                  <details className="community-header-menu">
                    <summary aria-label="More actions">
                      <MoreHorizontal size={18} aria-hidden />
                    </summary>
                    <button type="button" onClick={() => onRemoveFriend(selectedFriend.id)}>
                      Remove user
                    </button>
                  </details>
                )}
              </header>

              <div className="community-chat-thread">
                <div className="community-chat-day">Today</div>
                <article className="community-message-bubble is-action">
                  {selectedNote ? (
                    <>
                      <strong>{selectedNote.title || 'Untitled Note'}</strong>
                      <p>{collectNotePreviewLines(selectedNote.content, 2).join(' ') || 'No preview text yet.'}</p>
                    </>
                  ) : (
                    <p>No open note.</p>
                  )}
                </article>

                {selectedShares.length ? selectedShares.slice(0, 8).map((share) => {
                  const sharedNote = notes.find((note) => note.id === share.localNoteId)
                  return (
                    <article className="community-message-bubble is-sent" key={share.id}>
                      <strong>{sharedNote?.title || 'Untitled Note'}</strong>
                      <small>{share.status} · {formatDay(share.updatedAt)}</small>
                    </article>
                  )
                }) : (
                  <p className="community-empty community-chat-empty">Search below, pick a note into the bar, then send to start.</p>
                )}
              </div>

              <div className="community-chat-composer" aria-label="Restricted note actions">
                {stagedNote && (
                  <div className="community-composer-draft-bar">
                    <FileText size={16} aria-hidden className="community-composer-draft-icon" />
                    <div className="community-composer-draft-text">
                      <strong>{stagedNote.title || 'Untitled Note'}</strong>
                      <small>{collectNotePreviewLines(stagedNote.content, 1).join(' ') || 'No preview text yet.'}</small>
                    </div>
                    <button
                      type="button"
                      className="community-composer-draft-clear"
                      aria-label="Remove drafted note"
                      title="Remove drafted note"
                      onClick={() => setStagedNoteId(null)}
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </div>
                )}
                {composerResults.length > 0 && (
                  <div className="community-note-picker">
                    {composerResults.map((note) => (
                      <button type="button" key={note.id} onClick={() => {
                        setStagedNoteId(note.id)
                        setComposerQuery('')
                      }}>
                        <FileText size={15} aria-hidden />
                        <span>
                          <strong>{note.title || 'Untitled Note'}</strong>
                          <small>{collectNotePreviewLines(note.content, 1).join(' ') || 'No preview text yet.'}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <details className="community-composer-menu">
                  <summary aria-label="More note actions">
                    <Plus size={18} aria-hidden />
                  </summary>
                  <button
                    type="button"
                    onClick={() => {
                      if (!stagedNote) return
                      onSendNote('edit', stagedNote.id)
                      setStagedNoteId(null)
                    }}
                    disabled={!canSendStagedNote}
                  >
                    Send editable note
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!stagedNote) return
                      onCreateCollaboration(stagedNote.id)
                      setStagedNoteId(null)
                    }}
                    disabled={!canSendStagedNote}
                  >
                    Edit together
                  </button>
                </details>
                <div className="community-composer-search">
                  <Search size={16} aria-hidden />
                  <input
                    value={composerQuery}
                    placeholder={stagedNote ? 'Search to pick a different note…' : 'Search notes, Enter to draft'}
                    onChange={(event) => setComposerQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || !hasRecipient) return
                      if (composerResults.length > 0) {
                        event.preventDefault()
                        setStagedNoteId(composerResults[0].id)
                        setComposerQuery('')
                        return
                      }
                      if (stagedNote) {
                        event.preventDefault()
                        onSendNote('view', stagedNote.id)
                        setStagedNoteId(null)
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="community-composer-send"
                  onClick={() => {
                    if (!stagedNote) return
                    onSendNote('view', stagedNote.id)
                    setStagedNoteId(null)
                  }}
                  aria-label={sendNoteTitle}
                  title={sendNoteTitle}
                  disabled={!canSendStagedNote}
                >
                  <Send size={17} aria-hidden />
                </button>
              </div>
            </>
          ) : (
            <div className="community-no-target">
              <Users size={34} aria-hidden />
              <h2>Select a recipient</h2>
              <p>Choose a recipient, then search for a note to send.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
