import { BaseAgent } from "./base-agent"
import type { AgentExecutionContext } from "./contracts"

export interface NotificationAgentPayload {
  recipientId: string
  channel: "email" | "whatsapp" | "in_app"
  template: "order_received" | "payment_confirmed" | "delivery_completed" | "manual_review"
  variables: Record<string, string | number>
}

export interface NotificationAgentResult {
  notificationId: string
  recipientId: string
  channel: NotificationAgentPayload["channel"]
  deliveryStatus: "simulated"
}

export class NotificationAgent extends BaseAgent<NotificationAgentPayload, NotificationAgentResult> {
  readonly id = "agent-notification"
  readonly name = "Notification Agent"
  protected readonly simulatedExecutionTime = 95

  protected async perform(context: AgentExecutionContext<NotificationAgentPayload>): Promise<NotificationAgentResult> {
    const { recipientId, channel, template } = context.payload
    if (!recipientId) throw new Error("Notification recipient is required")
    this.addLog("success", "notification.simulated", `${template} notification simulated through ${channel}`, context.executionId)

    return {
      notificationId: `notification-${context.executionId}`,
      recipientId,
      channel,
      deliveryStatus: "simulated",
    }
  }
}
