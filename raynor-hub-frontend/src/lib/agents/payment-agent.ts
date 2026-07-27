import type { CurrencyCode, PaymentStatus } from "@/lib/types"
import { BaseAgent } from "./base-agent"
import type { AgentExecutionContext } from "./contracts"

export interface PaymentAgentPayload {
  orderId: string
  expectedAmount: number
  receivedAmount: number
  currency: CurrencyCode
  marketplaceStatus: PaymentStatus
}

export interface PaymentAgentResult {
  orderId: string
  verified: boolean
  paymentStatus: PaymentStatus
  variance: number
}

export class PaymentAgent extends BaseAgent<PaymentAgentPayload, PaymentAgentResult> {
  readonly id = "agent-payment"
  readonly name = "Payment Agent"
  protected readonly simulatedExecutionTime = 210

  protected async perform(context: AgentExecutionContext<PaymentAgentPayload>): Promise<PaymentAgentResult> {
    const { orderId, expectedAmount, receivedAmount, marketplaceStatus } = context.payload
    if (expectedAmount < 0 || receivedAmount < 0) throw new Error("Payment amount cannot be negative")

    const variance = receivedAmount - expectedAmount
    const verified = marketplaceStatus === "paid" && variance === 0
    const paymentStatus: PaymentStatus = verified ? "paid" : marketplaceStatus === "failed" ? "failed" : "verifying"
    this.addLog(verified ? "success" : "warning", "payment.verified", verified ? `Payment for ${orderId} is verified` : `Payment for ${orderId} requires review`, context.executionId, { variance })

    return { orderId, verified, paymentStatus, variance }
  }
}
