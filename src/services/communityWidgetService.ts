import { createId, db, nowIso } from '../db'
import type {
  CommunityRecipientKind,
  CommunitySyncStatus,
  CommunityWidget,
  CommunityWidgetKind,
  CommunityWidgetStatus,
  JSONContent,
} from '../db'

export type CommunityWidgetDraft = {
  kind: CommunityWidgetKind
  ownerAccountId?: string
  recipientKind: CommunityRecipientKind
  recipientId: string
  status?: CommunityWidgetStatus
  payload?: JSONContent
  syncStatus?: CommunitySyncStatus
}

export type CommunityWidgetService = {
  listForRecipient: (recipientKind: CommunityRecipientKind, recipientId: string) => Promise<CommunityWidget[]>
  create: (draft: CommunityWidgetDraft) => Promise<CommunityWidget>
  updateStatus: (widgetId: string, status: CommunityWidgetStatus) => Promise<CommunityWidget | undefined>
}

export const communityWidgetService: CommunityWidgetService = {
  async listForRecipient(recipientKind, recipientId) {
    const widgets = await db.communityWidgets
      .where('[recipientKind+recipientId]')
      .equals([recipientKind, recipientId])
      .toArray()
    return widgets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async create(draft) {
    const now = nowIso()
    const widget: CommunityWidget = {
      id: createId('community_widget'),
      kind: draft.kind,
      ownerAccountId: draft.ownerAccountId,
      recipientKind: draft.recipientKind,
      recipientId: draft.recipientId,
      status: draft.status ?? 'draft',
      payload: draft.payload ?? {},
      syncStatus: draft.syncStatus ?? 'local',
      createdAt: now,
      updatedAt: now,
    }
    await db.communityWidgets.put(widget)
    return widget
  },

  async updateStatus(widgetId, status) {
    const widget = await db.communityWidgets.get(widgetId)
    if (!widget) return undefined
    const next: CommunityWidget = { ...widget, status, updatedAt: nowIso() }
    await db.communityWidgets.put(next)
    return next
  },
}
