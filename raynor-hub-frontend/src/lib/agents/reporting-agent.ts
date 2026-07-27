import { BaseAgent } from "./base-agent"
import type { AgentExecutionContext } from "./contracts"

export interface ReportingAgentPayload {
  period: { start: string; end: string }
  orders: Array<{ totalAmount: number; status: string }>
}

export interface ReportingAgentResult {
  reportId: string
  totalOrders: number
  completedOrders: number
  grossRevenue: number
  completionRate: number
}

export class ReportingAgent extends BaseAgent<ReportingAgentPayload, ReportingAgentResult> {
  readonly id = "agent-reporting"
  readonly name = "Reporting Agent"
  protected readonly simulatedExecutionTime = 480

  protected async perform(context: AgentExecutionContext<ReportingAgentPayload>): Promise<ReportingAgentResult> {
    const { period, orders } = context.payload
    if (Number.isNaN(Date.parse(period.start)) || Number.isNaN(Date.parse(period.end))) throw new Error("Reporting period is invalid")

    const completedOrders = orders.filter((order) => order.status === "completed").length
    const grossRevenue = orders.reduce((total, order) => total + order.totalAmount, 0)
    const completionRate = orders.length === 0 ? 0 : (completedOrders / orders.length) * 100
    this.addLog("success", "report.generated", `Generated report for ${orders.length} order(s)`, context.executionId)

    return {
      reportId: `report-${context.executionId}`,
      totalOrders: orders.length,
      completedOrders,
      grossRevenue,
      completionRate,
    }
  }
}
