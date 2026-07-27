import type { DeliveryStatus, EntityId, ISODateString } from "@/lib/types/status"

export interface Delivery {
  id: EntityId
  orderId: EntityId
  botId?: EntityId
  status: DeliveryStatus
  attemptCount: number
  deliveryReference?: string
  failureReason?: string
  queuedAt: ISODateString
  startedAt?: ISODateString
  completedAt?: ISODateString
  updatedAt: ISODateString
}
