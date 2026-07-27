import type { EntityId, ISODateString, NotificationPriority, NotificationType } from "@/lib/types/status"

export interface Notification {
  id: EntityId
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  read: boolean
  actionUrl?: string
  resourceId?: EntityId
  createdAt: ISODateString
  readAt?: ISODateString
}
