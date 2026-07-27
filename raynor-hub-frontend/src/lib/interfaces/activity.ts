import type { ActivitySeverity, EntityId, ISODateString } from "@/lib/types/status"

export interface Activity {
  id: EntityId
  actorType: "agent" | "user" | "system" | "marketplace"
  actorId: EntityId
  actorName: string
  action: string
  description: string
  severity: ActivitySeverity
  resourceType: "order" | "inventory" | "delivery" | "customer" | "marketplace" | "report"
  resourceId?: EntityId
  metadata?: Record<string, string | number | boolean | null>
  createdAt: ISODateString
}
