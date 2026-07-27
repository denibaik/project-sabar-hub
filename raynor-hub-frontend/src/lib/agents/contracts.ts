export type AgentRuntimeStatus = "idle" | "running" | "degraded" | "error"
export type AgentLogLevel = "info" | "success" | "warning" | "error"

export interface AgentLog {
  id: string
  timestamp: string
  level: AgentLogLevel
  event: string
  message: string
  executionId?: string
  metadata?: Record<string, unknown>
}

export interface AgentExecutionContext<TPayload = Record<string, unknown>> {
  executionId: string
  task: string
  payload: TPayload
  requestedAt?: string
  correlationId?: string
}

export interface AgentExecutionResult<TData = Record<string, unknown>> {
  executionId: string
  agentId: string
  success: boolean
  status: "completed" | "failed" | "requires_review"
  data: TData
  startedAt: string
  completedAt: string
  executionTime: number
  logs: AgentLog[]
  error?: string
}

export interface EnterpriseAgent<TPayload = Record<string, unknown>, TResult = Record<string, unknown>> {
  readonly id: string
  readonly name: string
  status: AgentRuntimeStatus
  health: number
  currentTask: string | null
  lastExecution: string | null
  executionTime: number
  logs: AgentLog[]
  execute(context: AgentExecutionContext<TPayload>): Promise<AgentExecutionResult<TResult>>
}
