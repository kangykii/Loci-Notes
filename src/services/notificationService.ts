import { remoteContentService } from './remoteContentService'
import type { RemoteContentItem } from '../db'

export type NotificationService = {
  listDeveloperNotifications: () => Promise<RemoteContentItem[]>
}

export const notificationService: NotificationService = {
  listDeveloperNotifications: () => remoteContentService.listByPlacement('dev-notification'),
}
