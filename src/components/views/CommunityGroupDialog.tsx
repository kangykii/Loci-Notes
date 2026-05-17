import type { Friendship } from '../../db'
import type { GroupDialogDraft } from '../../community/types'

type CommunityGroupDialogProps = {
  draft: GroupDialogDraft
  acceptedFriendships: Friendship[]
  onNameChange: (name: string) => void
  onToggleMember: (accountId: string) => void
  onClose: () => void
  onSave: () => void
}

export function CommunityGroupDialog({
  draft,
  acceptedFriendships,
  onNameChange,
  onToggleMember,
  onClose,
  onSave,
}: CommunityGroupDialogProps) {
  return (
    <div
      className="modal-backdrop group-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
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
            onSave()
          }}
        >
          <h2 id="group-dialog-title">Create group</h2>
          <p>Name the group and choose the accepted friends to include.</p>
          <label>
            Group name
            <input
              value={draft.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Study circle"
              autoFocus
            />
          </label>
          <div className="group-member-list" aria-label="Group members">
            {acceptedFriendships.length ? acceptedFriendships.map((friendship) => (
              <label className="group-member-row" key={friendship.id}>
                <input
                  type="checkbox"
                  checked={draft.memberAccountIds.includes(friendship.friendAccountId)}
                  onChange={() => onToggleMember(friendship.friendAccountId)}
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
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={!draft.name.trim()}>
              Create group
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
