import type { EntityId, InventoryStatus, ISODateString } from "@/lib/types/status"

export interface Inventory {
  id: EntityId
  productId: EntityId
  currentStock: number
  reservedStock: number
  availableStock: number
  reorderPoint: number
  assignedBotIds: EntityId[]
  status: InventoryStatus
  updatedAt: ISODateString
}
