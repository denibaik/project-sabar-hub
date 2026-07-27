import { BaseAgent } from "./base-agent"
import type { AgentExecutionContext } from "./contracts"

export interface DeliveryAgentPayload {
  orderId: string
  productId: string
  customerId: string
  paymentVerified: boolean
  stockReserved: boolean
}

export interface DeliveryAgentResult {
  orderId: string
  deliveryId: string
  deliveryStatus: "queued" | "requires_review"
  estimatedCompletionSeconds: number | null
}

export class DeliveryAgent extends BaseAgent<DeliveryAgentPayload, DeliveryAgentResult> {
  readonly id = "agent-delivery"
  readonly name = "Delivery Agent"
  protected readonly simulatedExecutionTime = 320

  protected async perform(context: AgentExecutionContext<DeliveryAgentPayload>): Promise<DeliveryAgentResult> {
    const { orderId, paymentVerified, stockReserved } = context.payload
    const ready = paymentVerified && stockReserved
    this.addLog(ready ? "success" : "warning", "delivery.scheduled", ready ? `Delivery queued for ${orderId}` : `Delivery ${orderId} requires review`, context.executionId)

    return {
      orderId,
      deliveryId: `delivery-${orderId}`,
      deliveryStatus: ready ? "queued" : "requires_review",
      estimatedCompletionSeconds: ready ? 90 : null,
    }
  }
}
