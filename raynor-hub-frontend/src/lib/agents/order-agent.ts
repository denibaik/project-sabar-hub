import type { Order } from "@/lib/interfaces"
import { BaseAgent } from "./base-agent"
import type { AgentExecutionContext } from "./contracts"

export interface OrderAgentPayload {
  order: Order
}

export interface OrderAgentResult {
  orderId: string
  orderNumber: string
  accepted: boolean
  nextStep: "payment_validation" | "manual_review"
}

export class OrderAgent extends BaseAgent<OrderAgentPayload, OrderAgentResult> {
  readonly id = "agent-order"
  readonly name = "Order Agent"
  protected readonly simulatedExecutionTime = 180

  protected async perform(context: AgentExecutionContext<OrderAgentPayload>): Promise<OrderAgentResult> {
    const { order } = context.payload
    if (!order.id || !order.orderNumber) throw new Error("Order identity is required")
    if (order.quantity <= 0 || order.totalAmount < 0) throw new Error("Order quantity or amount is invalid")

    this.addLog("info", "order.validated", `Order ${order.orderNumber} passed structural validation`, context.executionId)
    const nextStep = order.paymentStatus === "failed" ? "manual_review" : "payment_validation"

    return { orderId: order.id, orderNumber: order.orderNumber, accepted: true, nextStep }
  }
}
