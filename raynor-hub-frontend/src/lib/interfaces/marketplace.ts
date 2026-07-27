import type { ConnectionStatus, EntityId, ISODateString, MarketplaceSyncStatus } from "@/lib/types/status"

export interface Marketplace {
  id: EntityId
  name: "Itemku" | "G2G" | "U7Buy" | "VCGamers" | "Eldorado"
  slug: string
  logoUrl?: string
  connectionStatus: ConnectionStatus
  syncStatus: MarketplaceSyncStatus
  ordersToday: number
  revenueToday: number
  currency: "IDR" | "USD"
  lastSyncedAt: ISODateString | null
  enabled: boolean
}
