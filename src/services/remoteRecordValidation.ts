import type {
  AccountProfile,
  CollaborationEvent,
  CollaborationParticipant,
  CollaborationSession,
  CommunityActivity,
  CommunityPresetReply,
  CommunityReaction,
  CommunityWidget,
  FriendGroup,
  Friendship,
  RemoteAsset,
  RemoteContentItem,
  SharedNoteExport,
  SharedNoteSnapshot,
} from '../db'
import { sanitizeTrustedDownloadUrl } from '../utils/urlValidation'

type SyncEntity =
  | AccountProfile
  | Friendship
  | FriendGroup
  | RemoteAsset
  | SharedNoteExport
  | SharedNoteSnapshot
  | CollaborationSession
  | CollaborationParticipant
  | CollaborationEvent
  | CommunityActivity
  | CommunityWidget
  | CommunityReaction
  | CommunityPresetReply
  | RemoteContentItem

type ValidationResult = {
  ok: true
  value: SyncEntity
} | {
  ok: false
  reason: string
}

const MAX_STRING_LENGTH = 20_000
const MAX_JSON_LENGTH = 100_000
const FRIENDSHIP_STATUSES = new Set(['pending-outgoing', 'pending-incoming', 'accepted', 'blocked'])
const REMOTE_ASSET_KINDS = new Set(['profile-avatar', 'banner-image', 'note-share-asset'])
const SHARE_PERMISSIONS = new Set(['view', 'comment', 'edit'])
const SHARE_STATUSES = new Set(['draft', 'published', 'revoked', 'deleted'])
const COLLABORATION_SESSION_STATUSES = new Set(['draft', 'active', 'paused', 'closed'])
const COLLABORATION_ROLES = new Set(['owner', 'editor', 'viewer'])
const COLLABORATION_EVENT_KINDS = new Set(['presence', 'content-op', 'comment', 'system'])
const RECIPIENT_KINDS = new Set(['friend', 'group'])
const ACTIVITY_KINDS = new Set(['note-shared', 'edit-session-created', 'comment-added', 'review-requested', 'reaction', 'preset-reply', 'system'])
const OBJECT_TYPES = new Set(['note', 'atom', 'flashcardSet', 'project', 'session', 'comment', 'reaction'])
const WIDGET_KINDS = new Set(['study-timer', 'ranking', 'flashcard-challenge', 'group-goal'])
const WIDGET_STATUSES = new Set(['draft', 'active', 'paused', 'completed', 'archived'])
const REACTION_KINDS = new Set(['seen', 'helpful', 'done', 'question'])
const PRESET_REPLY_KINDS = new Set(['reviewing', 'looks-good', 'send-again', 'done'])
const REMOTE_CONTENT_PLACEMENTS = new Set(['landing', 'app-banner', 'settings', 'dev-notification'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function hasString(record: Record<string, unknown>, key: string) {
  return isString(record[key]) && record[key].trim().length > 0 && record[key].length <= MAX_STRING_LENGTH
}

function hasOptionalString(record: Record<string, unknown>, key: string) {
  return record[key] === undefined || (isString(record[key]) && record[key].length <= MAX_STRING_LENGTH)
}

function hasStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return Array.isArray(value) && value.every((item) => isString(item) && item.length <= MAX_STRING_LENGTH)
}

function hasJsonPayload(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (value === undefined) return true
  try {
    return JSON.stringify(value).length <= MAX_JSON_LENGTH
  } catch {
    return false
  }
}

function hasEnum(record: Record<string, unknown>, key: string, values: Set<string>) {
  const value = record[key]
  return isString(value) && values.has(value)
}

function hasOptionalTrustedDownloadUrl(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return value === undefined || (isString(value) && sanitizeTrustedDownloadUrl(value) !== null)
}

function validateByCollection(collection: string, record: Record<string, unknown>) {
  switch (collection) {
    case 'account_profiles':
      return hasString(record, 'accountId') && hasString(record, 'displayName') && hasString(record, 'updatedAt')
    case 'friend_requests':
      return hasString(record, 'id') && hasString(record, 'accountId') && hasString(record, 'friendAccountId') && hasEnum(record, 'status', FRIENDSHIP_STATUSES) && hasString(record, 'updatedAt')
    case 'friend_groups':
      return hasString(record, 'id') && hasString(record, 'name') && hasStringArray(record, 'memberAccountIds') && hasString(record, 'updatedAt')
    case 'remote_assets':
      return hasString(record, 'id') && hasEnum(record, 'kind', REMOTE_ASSET_KINDS) && hasString(record, 'updatedAt') && hasOptionalString(record, 'remoteUrl')
    case 'shared_note_exports':
      return hasString(record, 'id') && hasString(record, 'localNoteId') && hasStringArray(record, 'recipientAccountIds') && hasEnum(record, 'permission', SHARE_PERMISSIONS) && hasEnum(record, 'status', SHARE_STATUSES) && hasString(record, 'snapshotId') && hasString(record, 'updatedAt')
    case 'shared_note_snapshots':
      return hasString(record, 'id') && hasString(record, 'shareId') && hasString(record, 'title') && hasJsonPayload(record, 'content') && hasString(record, 'contentHash') && hasString(record, 'createdAt') && hasString(record, 'updatedAt')
    case 'collaboration_sessions':
      return hasString(record, 'id') && hasString(record, 'localNoteId') && hasString(record, 'title') && hasEnum(record, 'status', COLLABORATION_SESSION_STATUSES) && hasString(record, 'updatedAt')
    case 'collaboration_participants':
      return hasString(record, 'id') && hasString(record, 'sessionId') && hasString(record, 'accountId') && hasString(record, 'displayName') && hasEnum(record, 'role', COLLABORATION_ROLES) && hasString(record, 'joinedAt')
    case 'collaboration_events':
      return hasString(record, 'id') && hasString(record, 'sessionId') && hasString(record, 'clientId') && hasString(record, 'opId') && hasEnum(record, 'kind', COLLABORATION_EVENT_KINDS) && hasJsonPayload(record, 'payload') && hasString(record, 'createdAt')
    case 'community_activities':
      return hasString(record, 'id') && hasEnum(record, 'recipientKind', RECIPIENT_KINDS) && hasString(record, 'recipientId') && hasEnum(record, 'kind', ACTIVITY_KINDS) && hasEnum(record, 'objectType', OBJECT_TYPES) && hasJsonPayload(record, 'payload') && hasString(record, 'createdAt') && hasString(record, 'updatedAt')
    case 'community_widgets':
      return hasString(record, 'id') && hasEnum(record, 'kind', WIDGET_KINDS) && hasEnum(record, 'recipientKind', RECIPIENT_KINDS) && hasString(record, 'recipientId') && hasEnum(record, 'status', WIDGET_STATUSES) && hasJsonPayload(record, 'payload') && hasString(record, 'createdAt') && hasString(record, 'updatedAt')
    case 'community_reactions':
      return hasString(record, 'id') && hasString(record, 'activityId') && hasEnum(record, 'kind', REACTION_KINDS) && hasString(record, 'createdAt')
    case 'community_preset_replies':
      return hasString(record, 'id') && hasString(record, 'activityId') && hasEnum(record, 'kind', PRESET_REPLY_KINDS) && hasString(record, 'createdAt')
    case 'remote_content_items':
      return hasString(record, 'id') && hasEnum(record, 'placement', REMOTE_CONTENT_PLACEMENTS) && hasString(record, 'title') && hasString(record, 'cachedAt') && hasString(record, 'updatedAt') && hasOptionalTrustedDownloadUrl(record, 'href')
    default:
      return false
  }
}

export function validateRemoteSyncRecord(collection: string, value: unknown): ValidationResult {
  if (!isRecord(value)) return { ok: false, reason: `${collection} record is not an object.` }
  if (!hasString(value, 'id')) return { ok: false, reason: `${collection} record is missing a valid id.` }
  if (!validateByCollection(collection, value)) return { ok: false, reason: `${collection} record failed schema validation.` }
  return { ok: true, value: value as SyncEntity }
}
