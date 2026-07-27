import { agentRegistry } from "@/lib/agents"
import type { AgentExecutionResult } from "@/lib/agents"
import type { Order } from "@/lib/interfaces"
import { marketplacePayloads } from "@/lib/mock/marketplace-payloads"
import type { MarketplacePayload, SupportedMarketplace } from "./marketplace-listener.types"
import { MarketplaceListenerService } from "./marketplace-listener.service"

export type SimulationStage =
  | "marketplace_listener"
  | "supervisor"
  | "order"
  | "payment"
  | "inventory"
  | "delivery"
  | "notification"
  | "reporting"

export interface SimulationEvent {
  stage: SimulationStage
  agent: string
  action: string
  detail: string
  status: "running" | "completed" | "failed"
  timestamp: string
}

export interface SimulatedDashboardOrder {
  id: string
  marketplace: SupportedMarketplace
  customer: string
  product: string
  payment: string
  automation: string
  delivery: string
  time: string
}

export interface OrderSimulationResult {
  success: boolean
  order: Order
  dashboardOrder: SimulatedDashboardOrder
  revenueDelta: number
  inventoryDelta: number
  events: SimulationEvent[]
  executions: Array<AgentExecutionResult<unknown>>
  automationStatus: "completed" | "failed"
}

export interface SimulationOptions {
  onEvent?: (event: SimulationEvent) => void
  delayMs?: number
}

const MARKETPLACES: SupportedMarketplace[] = ["Eldorado", "U7Buy", "G2G", "Itemku"]

const CUSTOMER_NAMES: Record<SupportedMarketplace, string> = {
  Itemku: "Nadia Putri",
  G2G: "Rizky Aditya",
  U7Buy: "Alvin Pratama",

  Eldorado: "Marcus Lee",
  VCGamers: "Salsa Rahma",
}

const PRODUCT_NAMES: Record<SupportedMarketplace, string> = {
  Itemku: "Raccoon",
  G2G: "Dragonfly",
  U7Buy: "Huge Cat",

  Eldorado: "Frost Dragon",
  VCGamers: "Private Server 30 Days",
}

export class OrderSimulationService {
  private sequence = 0

  async simulate(options: SimulationOptions = {}): Promise<OrderSimulationResult> {
    this.sequence += 1
    const events: SimulationEvent[] = []
    const executions: Array<AgentExecutionResult<unknown>> = []
    const marketplace = MARKETPLACES[(this.sequence - 1) % MARKETPLACES.length]
    const payload = this.createPayload(marketplace)
    const workflowId = `simulation-${Date.now()}-${this.sequence}`
    const delayMs = options.delayMs ?? 220
    let normalizedOrder: Order | undefined

    const emit = async (stage: SimulationStage, agent: string, action: string, detail: string, status: SimulationEvent["status"] = "completed") => {
      const event = { stage, agent, action, detail, status, timestamp: new Date().toISOString() }
      events.unshift(event)
      options.onEvent?.(event)
      await this.delay(delayMs)
    }

    const listener = new MarketplaceListenerService({
      supervisor: {
        receiveOrder: async (order) => {
          normalizedOrder = order
          await emit("supervisor", "Supervisor Agent", "Accepted normalized order", `${order.orderNumber} routed to Order Agent`)
        },
      },
    })

    await emit("marketplace_listener", "Marketplace Listener", "Received marketplace order", `New order received from ${marketplace}`, "running")
    const listenerResult = await listener.receivePayload(marketplace, payload)
    if (!listenerResult.success || !normalizedOrder) {
      throw new Error(listenerResult.errors.map((error) => error.message).join(", ") || "Marketplace order normalization failed")
    }

    const order: Order = normalizedOrder
    await emit("marketplace_listener", "Marketplace Listener", "Normalized order", `${order.orderNumber} converted to internal Order`)

    const run = async <TResult>(stage: SimulationStage, agentName: string, action: string, operation: () => Promise<AgentExecutionResult<TResult>>) => {
      await emit(stage, agentName, action, `${agentName} is processing ${order.orderNumber}`, "running")
      const result = await operation()
      executions.push(result)
      await emit(stage, agentName, result.success ? `${action} completed` : `${action} failed`, `${result.executionTime} ms simulated execution`, result.success ? "completed" : "failed")
      if (!result.success) throw new Error(result.error ?? `${agentName} execution failed`)
      return result
    }

    await run("order", "Order Agent", "Validate order", () => agentRegistry.order.execute({
      executionId: `${workflowId}-order`, correlationId: workflowId, task: "Validate simulated marketplace order", payload: { order },
    }))

    const payment = await run("payment", "Payment Agent", "Validate payment", () => agentRegistry.payment.execute({
      executionId: `${workflowId}-payment`, correlationId: workflowId, task: "Validate simulated payment", payload: {
        orderId: order.id, expectedAmount: order.totalAmount, receivedAmount: order.totalAmount, currency: order.currency, marketplaceStatus: "paid",
      },
    }))

    const inventory = await run("inventory", "Inventory Agent", "Reserve inventory", () => agentRegistry.inventory.execute({
      executionId: `${workflowId}-inventory`, correlationId: workflowId, task: "Reserve simulated stock", payload: {
        orderId: order.id, productId: order.productId, requestedQuantity: order.quantity, availableStock: 120,
      },
    }))

    const delivery = await run("delivery", "Delivery Agent", "Queue delivery", () => agentRegistry.delivery.execute({
      executionId: `${workflowId}-delivery`, correlationId: workflowId, task: "Queue simulated digital delivery", payload: {
        orderId: order.id, productId: order.productId, customerId: order.customerId, paymentVerified: payment.data.verified, stockReserved: inventory.data.reservationStatus === "reserved",
      },
    }))

    await run("notification", "Notification Agent", "Notify customer", () => agentRegistry.notification.execute({
      executionId: `${workflowId}-notification`, correlationId: workflowId, task: "Simulate customer notification", payload: {
        recipientId: order.customerId, channel: "in_app", template: "delivery_completed", variables: { orderNumber: order.orderNumber },
      },
    }))

    await run("reporting", "Reporting Agent", "Update analytics", () => agentRegistry.reporting.execute({
      executionId: `${workflowId}-reporting`, correlationId: workflowId, task: "Update simulated dashboard analytics", payload: {
        period: { start: order.createdAt, end: new Date().toISOString() }, orders: [{ totalAmount: order.totalAmount, status: "completed" }],
      },
    }))

    return {
      success: true,
      order: { ...order, paymentStatus: "paid", automationStatus: "completed", deliveryStatus: "delivered", status: "completed", updatedAt: new Date().toISOString() },
      dashboardOrder: {
        id: order.orderNumber,
        marketplace,
        customer: CUSTOMER_NAMES[marketplace],
        product: PRODUCT_NAMES[marketplace],
        payment: "Paid",
        automation: "Completed",
        delivery: delivery.data.deliveryStatus === "queued" ? "Delivered" : "Pending",
        time: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
      },
      revenueDelta: order.totalAmount,
      inventoryDelta: order.quantity,
      events,
      executions,
      automationStatus: "completed",
    }
  }

  private createPayload(marketplace: SupportedMarketplace): MarketplacePayload {
    const source = marketplacePayloads[marketplace][0]
    if (!source) throw new Error(`No mock payload configured for ${marketplace}`)
    const timestamp = new Date().toISOString()
    const suffix = `${Date.now()}-${this.sequence}`
    const payload = structuredClone(source) as MarketplacePayload

    switch (marketplace) {
      case "Itemku":
        return { ...payload, order_id: `ITK-${suffix}`, order_number: `ITK-SIM-${suffix}`, created_at: timestamp }
      case "G2G":
        return { ...payload, transactionId: `G2G-${suffix}`, referenceNo: `G2G-SIM-${suffix}`, orderedAt: timestamp }
      case "U7Buy":
        return { ...payload, id: `U7B-${suffix}`, orderNo: `U7B-SIM-${suffix}`, create_time: timestamp }

      case "Eldorado":
        return { ...payload, id: `ELD-${suffix}`, order_code: `ELD-SIM-${suffix}`, date_created: timestamp, status: "completed" }
    }

    throw new Error(`Unsupported marketplace payload: ${marketplace}`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const orderSimulationService = new OrderSimulationService()
