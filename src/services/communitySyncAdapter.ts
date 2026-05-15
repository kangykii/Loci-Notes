import type { CommunityActivity, CommunitySyncQueueItem, CommunityWidget } from '../db'

export type CommunitySyncPushResult = {
  remoteId?: string
  status: 'synced' | 'failed'
  error?: string
}

export type CommunitySyncAdapter = {
  pushActivity: (activity: CommunityActivity, queueItem: CommunitySyncQueueItem) => Promise<CommunitySyncPushResult>
  pushWidget: (widget: CommunityWidget, queueItem: CommunitySyncQueueItem) => Promise<CommunitySyncPushResult>
}

export const localOnlyCommunitySyncAdapter: CommunitySyncAdapter = {
  async pushActivity() {
    return { status: 'synced' }
  },

  async pushWidget() {
    return { status: 'synced' }
  },
}
