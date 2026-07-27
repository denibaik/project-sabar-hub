import type { AgentStatus, EntityId, ISODateString } from "@/lib/types/status"

export interface Agent {
  id: EntityId
  name: string
  role: "supervisor" | "order" | "inventory" | "payment" | "support" | "reporting"
  description: string
  status: AgentStatus
  runningTasks: number
  completedTasksToday: number
  healthPercentage: number
  averageResponseTimeMs: number
  lastActivityAt: ISODateString
}
