import type { CustomerStatus, EntityId, ISODateString } from "@/lib/types/status"

export interface Customer {
  id: EntityId
  marketplaceId: EntityId
  externalCustomerId: string
  name: string
  email: string
  phone?: string
  country: string
  totalOrders: number
  lifetimeValue: number
  status: CustomerStatus
  createdAt: ISODateString
  updatedAt: ISODateString
}
