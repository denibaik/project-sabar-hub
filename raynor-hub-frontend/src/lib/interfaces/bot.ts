import type { EntityId, ISODateString } from "@/lib/types/status"

export type BotStatus = "online" | "idle" | "trading" | "offline" | "error" | "maintenance"

export interface RobloxBot {
  id: EntityId
  name: string
  username: string
  marketplaceId: EntityId
  status: BotStatus
  game: string
  pingMs: number
  serverStability: number
  inventoryCount: number
  currentOrderId?: EntityId
  successRate: number
  lastHeartbeatAt: ISODateString
  lastTradeAt?: ISODateString
}

export interface BotSelectionDecision {
  orderId: EntityId
  selectedBotId?: EntityId
  score: number
  reasons: string[]
  candidates: Array<{ botId: EntityId; score: number; eligible: boolean }>
  decidedAt: ISODateString
}
