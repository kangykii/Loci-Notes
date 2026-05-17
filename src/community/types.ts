export type CommunityTarget =
  | { kind: 'friend'; id: string }
  | { kind: 'group'; id: string }

export type GroupDialogDraft = {
  name: string
  memberAccountIds: string[]
}
