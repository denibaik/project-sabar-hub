import { mockInventory, mockOrders } from "@/lib/mock"
import { DeliveryAgent } from "./delivery-agent"
import type { AgentExecutionContext, AgentExecutionResult } from "./contracts"
import { InventoryAgent } from "./inventory-agent"
import { NotificationAgent } from "./notification-agent"
import { OrderAgent } from "./order-agent"
import { PaymentAgent } from "./payment-agent"
import { ReportingAgent } from "./reporting-agent"

export type SupportedAgentName =
  | "order"
  | "inventory"
  | "payment"
  | "delivery"
  | "notification"
  | "reporting"

export type RegisteredAgent =
  | OrderAgent
  | InventoryAgent
  | PaymentAgent
  | DeliveryAgent
  | NotificationAgent
  | ReportingAgent

export interface WorkflowExecutionResult {
  workflowId: string
  success: boolean
  startedAt: string
  completedAt: string
  steps: Array<AgentExecutionResult<unknown>>
  failedAt?: SupportedAgentName
}

export class AgentRegistry {
  readonly order = new OrderAgent()
  readonly inventory = new InventoryAgent()
  readonly payment = new PaymentAgent()
  readonly delivery = new DeliveryAgent()
  readonly notification = new NotificationAgent()
  readonly reporting = new ReportingAgent()

  getAll(): RegisteredAgent[] {
    return [this.order, this.inventory, this.payment, this.delivery, this.notification, this.reporting]
  }

  get(name: SupportedAgentName): RegisteredAgent {
    return this[name]
  }

  async simulateOrderWorkflow(orderId = mockOrders[0]?.id ?? "ord-demo-001"): Promise<WorkflowExecutionResult> {
    const startedAt = new Date().toISOString()
    const workflowId = `workflow-${Date.now()}`
    const order = mockOrders.find((item) => item.id === orderId) ?? mockOrders[0]
    if (!order) throw new Error("No mock order is available for workflow simulation")

    const inventory = mockInventory.find((item) => item.productId === order.productId)
    if (!inventory) throw new Error(`No mock inventory found for product ${order.productId}`)

    const steps: Array<AgentExecutionResult<unknown>> = []
    const context = <TPayload,>(task: string, payload: TPayload): AgentExecutionContext<TPayload> => ({
      executionId: `${workflowId}-${steps.length + 1}`,
      correlationId: workflowId,
      task,
      payload,
    })

    const orderResult = await this.order.execute(context("Validate incoming order", { order }))
    steps.push(orderResult)
    if (!orderResult.success) return this.workflowResult(workflowId, startedAt, steps, "order")

    const paymentResult = await this.payment.execute(context("Validate marketplace payment", {
      orderId: order.id,
      expectedAmount: order.totalAmount,
      receivedAmount: order.totalAmount,
      currency: order.currency,
      marketplaceStatus: order.paymentStatus,
    }))
    steps.push(paymentResult)
    if (!paymentResult.success) return this.workflowResult(workflowId, startedAt, steps, "payment")

    const inventoryResult = await this.inventory.execute(context("Reserve product inventory", {
      orderId: order.id,
      productId: order.productId,
      requestedQuantity: order.quantity,
      availableStock: inventory.availableStock,
    }))
    steps.push(inventoryResult)
    if (!inventoryResult.success || inventoryResult.data.reservationStatus !== "reserved") return this.workflowResult(workflowId, startedAt, steps, "inventory")

    const deliveryResult = await this.delivery.execute(context("Queue digital product delivery", {
      orderId: order.id,
      productId: order.productId,
      customerId: order.customerId,
      paymentVerified: paymentResult.data.verified,
      stockReserved: inventoryResult.data.reservationStatus === "reserved",
    }))
    steps.push(deliveryResult)
    if (!deliveryResult.success) return this.workflowResult(workflowId, startedAt, steps, "delivery")

    const notificationResult = await this.notification.execute(context("Notify customer about delivery", {
      recipientId: order.customerId,
      channel: "in_app",
      template: deliveryResult.data.deliveryStatus === "queued" ? "payment_confirmed" : "manual_review",
      variables: { orderNumber: order.orderNumber },
    }))
    steps.push(notificationResult)
    if (!notificationResult.success) return this.workflowResult(workflowId, startedAt, steps, "notification")

    const reportingResult = await this.reporting.execute(context("Record workflow analytics", {
      period: { start: order.createdAt, end: new Date().toISOString() },
      orders: [{ totalAmount: order.totalAmount, status: deliveryResult.data.deliveryStatus === "queued" ? "completed" : "processing" }],
    }))
    steps.push(reportingResult)

    return this.workflowResult(workflowId, startedAt, steps, reportingResult.success ? undefined : "reporting")
  }

  private workflowResult(workflowId: string, startedAt: string, steps: Array<AgentExecutionResult<unknown>>, failedAt?: SupportedAgentName): WorkflowExecutionResult {
    return {
      workflowId,
      success: !failedAt && steps.every((step) => step.success),
      startedAt,
      completedAt: new Date().toISOString(),
      steps,
      failedAt,
    }
  }
}

export const agentRegistry = new AgentRegistry()
