# Loci Notes PocketBase Schema

PocketBase mirrors the canonical Dexie models. Dexie remains the local source of truth, and field names should match the local TypeScript models wherever PocketBase permits it. Local derived tables such as `noteMetas` and `noteBodies` are not remote source-of-truth collections.

## Local And Remote Identity

Core synced records must use PocketBase-generated record IDs. Do not send local starter IDs such as `note_loci_quick_start` as PocketBase record IDs because every user receives the same onboarding content.

Each core collection should include:
- `localId`: the local IndexedDB entity ID.
- `ownerAccountId`: the signed-in user or workspace owner.
- Optional unique index: `[ownerAccountId + localId]`.

The local Dexie table `remoteEntityMappings` stores sync identity:
- `entityType`: `project`, `note`, `atom`, or `flashcardSet`.
- `localId`: local IndexedDB ID.
- `remoteId`: PocketBase record ID.
- `ownerAccountId`: remote owner/workspace.
- `lastSyncedAt`: latest successful sync timestamp.

## Auth

### users
- Type: auth, extends PocketBase `_pb_users_auth_`.
- Required fields: email, password, name.
- Indexed fields: email, username, name.
- Access rules: users can read and update their own record; authenticated users can read public profile fields needed for friend search.

## Core Local Model Aliases

### compounds
- Maps to local `Project`.
- Type: base.
- Required fields: localId, ownerAccountId, name, color, createdAt.
- Optional fields: source, isStarter.
- Indexed fields: localId, ownerAccountId, name, `[ownerAccountId+localId]`.
- Access rules: owner can read/write; collaborators can read when attached to shared content.

### molecules
- Maps to local `Note`.
- Type: base.
- Required fields: localId, ownerAccountId, title, projectId, templateId, templateData, author, tags, content, createdAt, updatedAt.
- Optional fields: source, isStarter.
- Indexed fields: localId, ownerAccountId, projectId, templateId, updatedAt, tags, `[ownerAccountId+localId]`.
- Access rules: owner can read/write; shared recipients can read/write according to `shared_note_exports.permission`.

### atoms
- Maps to local `Atom`.
- Type: base.
- Required fields: localId, ownerAccountId, projectId, phrase, definition, tags, createdAt, updatedAt, reviewCount, knownCount.
- Optional fields: source, isStarter.
- Indexed fields: localId, ownerAccountId, projectId, phrase, updatedAt, tags, `[ownerAccountId+localId]`.
- Access rules: owner can read/write; shared note recipients can read referenced atoms.

### molecule_sections
- Maps to local `NoteBody.blocks` and `LociBlock`.
- Type: base.
- Required fields: id, noteId, type, content, createdAt, updatedAt.
- Indexed fields: id, noteId, type, updatedAt.
- Access rules: inherits access from the parent molecule/note.

### activity_log
- Maps to local `CommunityActivity`.
- Type: view or base.
- Required fields: id, recipientKind, recipientId, kind, objectType, syncStatus, createdAt, updatedAt.
- Indexed fields: id, recipientKind, recipientId, actorAccountId, kind, objectType, objectId, createdAt.
- Access rules: members of the target friend/group recipient can read; actors can create their own activity.

### user_preferences
- Maps to local `UserSettings`.
- Type: base.
- Required fields: id, defaultAIProvider, aiProviders, aiTemperature, aiMaxTokens, aiIncludeNoteTitle, aiIncludeSelectedText, aiIncludeNoteExcerpt, highlighterColor, reduceMotion, compactMode, pinnedCommunityRecipientIds, createdAt, updatedAt.
- Indexed fields: id, updatedAt.
- Access rules: authenticated user can read/write their own preferences only.

### daily_tasks
- Maps to planner template tasks in local `NoteTemplateData`.
- Type: base.
- Required fields: id, noteId, text, done.
- Indexed fields: id, noteId, done.
- Access rules: inherits access from the parent molecule/note.

### drafts
- Maps to local draft-style `SharedNoteExport` rows where `status = draft`.
- Type: base.
- Required fields: id, localNoteId, recipientAccountIds, permission, status, updatedAt.
- Indexed fields: id, localNoteId, ownerAccountId, status, updatedAt.
- Access rules: owner can read/write; recipients cannot read until published.

### sync_queue
- Maps to local `CommunitySyncQueueItem`.
- Type: internal/local-only; do not create as a remote collection.
- Required fields: id, entityType, entityId, operation, status, attempts, createdAt, updatedAt.
- Indexed fields: id, entityType, entityId, status, updatedAt.
- Access rules: not synced to PocketBase.

## Online And Community Collections

### account_profiles
- Maps to local `AccountProfile`.
- Type: base.
- Required fields: accountId, displayName, createdAt, updatedAt.
- Indexed fields: accountId, handle, tag, updatedAt.
- Access rules: authenticated users can read searchable profile fields; users can write only their own profile.

### friend_requests
- Maps to local `Friendship`.
- Type: base.
- Required fields: id, accountId, friendAccountId, friendDisplayName, status, requestedAt, updatedAt.
- Indexed fields: id, accountId, friendAccountId, status, updatedAt.
- Access rules: requester and recipient can read; requester can create/cancel; recipient can accept/decline.

### friend_groups
- Maps to local `FriendGroup`.
- Type: base.
- Required fields: id, name, memberAccountIds, createdAt, updatedAt.
- Indexed fields: id, ownerAccountId, name, memberAccountIds, updatedAt.
- Access rules: owner can write; owner and members can read.

### shared_note_exports
- Maps to local `SharedNoteExport`.
- Type: base.
- Required fields: id, localNoteId, recipientAccountIds, permission, status, updatedAt.
- Indexed fields: id, localNoteId, remoteShareId, ownerAccountId, recipientAccountIds, status, collaborationSessionId, updatedAt.
- Access rules: owner can create/update/revoke; recipients can read published shares.

### collaboration_sessions
- Maps to local `CollaborationSession`.
- Type: base.
- Required fields: id, localNoteId, title, status, createdAt, updatedAt.
- Indexed fields: id, localNoteId, shareId, ownerAccountId, status, updatedAt.
- Access rules: owner and participants can read; owner can update session status.

### collaboration_participants
- Maps to local `CollaborationParticipant`.
- Type: base.
- Required fields: id, sessionId, accountId, displayName, role, joinedAt.
- Indexed fields: id, sessionId, accountId, role, lastSeenAt.
- Access rules: session members can read; owner can manage roles; participant can update lastSeenAt.

### collaboration_events
- Maps to local `CollaborationEvent`.
- Type: base.
- Required fields: id, sessionId, clientId, kind, payload, syncStatus, createdAt.
- Indexed fields: id, sessionId, clientId, actorAccountId, kind, syncStatus, createdAt.
- Access rules: session members can read/create events; server validates membership.

### community_activities
- Maps to local `CommunityActivity`.
- Type: base.
- Required fields: id, recipientKind, recipientId, kind, objectType, syncStatus, createdAt, updatedAt.
- Indexed fields: id, recipientKind, recipientId, actorAccountId, kind, objectType, objectId, syncStatus, createdAt, updatedAt.
- Access rules: target friend/group members can read; authenticated actors can create activities for recipients they can access.

### community_widgets
- Maps to local `CommunityWidget`.
- Type: base.
- Required fields: id, kind, recipientKind, recipientId, status, payload, syncStatus, createdAt, updatedAt.
- Indexed fields: id, kind, recipientKind, recipientId, ownerAccountId, status, syncStatus, updatedAt.
- Access rules: owner can write; target friend/group members can read.

### community_reactions
- Maps to local `CommunityReaction`.
- Type: base.
- Required fields: id, activityId, kind, syncStatus, createdAt.
- Indexed fields: id, activityId, actorAccountId, kind, syncStatus, createdAt.
- Access rules: activity readers can read; authenticated users can create/update their own reaction.

### community_preset_replies
- Maps to local `CommunityPresetReply`.
- Type: base.
- Required fields: id, activityId, kind, syncStatus, createdAt.
- Indexed fields: id, activityId, actorAccountId, kind, syncStatus, createdAt.
- Access rules: activity readers can read; authenticated users can create their own reply.

### remote_assets
- Maps to local `RemoteAsset`.
- Type: base.
- Required fields: id, kind, updatedAt.
- Indexed fields: id, ownerAccountId, kind, updatedAt.
- Access rules: owner can write; users with access to the referenced shared content can read.

### remote_content_items
- Maps to local `RemoteContentItem`.
- Type: base.
- Required fields: id, placement, title, cachedAt, updatedAt.
- Indexed fields: id, placement, campaignId, startsAt, endsAt, updatedAt.
- Access rules: public or authenticated read depending on placement; admin-only write.
