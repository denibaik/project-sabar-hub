import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentLog,
  AgentLogLevel,
  AgentRuntimeStatus,
  EnterpriseAgent,
} from "./contracts"

export abstract class BaseAgent<TPayload = Record<string, unknown>, TResult = Record<string, unknown>>
  implements EnterpriseAgent<TPayload, TResult> {
  abstract readonly id: string
  abstract readonly name: string

  status: AgentRuntimeStatus = "idle"
  health = 100
  currentTask: string | null = null
  lastExecution: string | null = null
  executionTime = 0
  logs: AgentLog[] = []

  async execute(context: AgentExecutionContext<TPayload>): Promise<AgentExecutionResult<TResult>> {
    const startedAt = new Date().toISOString()
    const startedTimestamp = Date.now()
    const executionLogsStart = this.logs.length

    this.status = "running"
    this.currentTask = context.task
    this.addLog("info", "execution.started", `${this.name} started ${context.task}`, context.executionId, {
      correlationId: context.correlationId,
    })

    try {
      const data = await this.perform(context)
      const completedAt = new Date().toISOString()
      this.executionTime = Math.max(Date.now() - startedTimestamp, this.simulatedExecutionTime)
      this.lastExecution = completedAt
      this.status = "idle"
      this.health = Math.min(100, this.health + 0.2)
      this.addLog("success", "execution.completed", `${this.name} completed ${context.task}`, context.executionId, {
        executionTime: this.executionTime,
      })

      return {
        executionId: context.executionId,
        agentId: this.id,
        success: true,
        status: "completed",
        data,
        startedAt,
        completedAt,
        executionTime: this.executionTime,
        logs: this.logs.slice(executionLogsStart),
      }
    } catch (error) {
      const completedAt = new Date().toISOString()
      const message = error instanceof Error ? error.message : "Unknown agent execution error"
      this.executionTime = Math.max(Date.now() - startedTimestamp, this.simulatedExecutionTime)
      this.lastExecution = completedAt
      this.status = "error"
      this.health = Math.max(0, this.health - 5)
      this.addLog("error", "execution.failed", message, context.executionId)

      return {
        executionId: context.executionId,
        agentId: this.id,
        success: false,
        status: "failed",
        data: {} as TResult,
        startedAt,
        completedAt,
        executionTime: this.executionTime,
        logs: this.logs.slice(executionLogsStart),
        error: message,
      }
    } finally {
      this.currentTask = null
    }
  }

  protected abstract perform(context: AgentExecutionContext<TPayload>): Promise<TResult>
  protected abstract readonly simulatedExecutionTime: number

  protected addLog(
    level: AgentLogLevel,
    event: string,
    message: string,
    executionId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logs = [
      ...this.logs,
      {
        id: `${this.id}-log-${this.logs.length + 1}`,
        timestamp: new Date().toISOString(),
        level,
        event,
        message,
        executionId,
        metadata,
      },
    ].slice(-100)
  }
}
