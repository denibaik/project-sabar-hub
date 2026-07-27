import { BaseAgent } from "./base-agent"
import type { AgentExecutionContext } from "./contracts"

export interface InventoryAgentPayload {
  orderId: string
  productId: string
  requestedQuantity: number
  availableStock: number
}

export interface InventoryAgentResult {
  orderId: string
  productId: string
  reservedQuantity: number
  remainingStock: number
  reservationStatus: "reserved" | "insufficient_stock"
}

export class InventoryAgent extends BaseAgent<InventoryAgentPayload, InventoryAgentResult> {
  readonly id = "agent-inventory"
  readonly name = "Inventory Agent"
  protected readonly simulatedExecutionTime = 145

  protected async perform(context: AgentExecutionContext<InventoryAgentPayload>): Promise<InventoryAgentResult> {
    const { orderId, productId, requestedQuantity, availableStock } = context.payload
    if (requestedQuantity <= 0) throw new Error("Requested quantity must be positive")

    const canReserve = availableStock >= requestedQuantity
    this.addLog(canReserve ? "success" : "warning", "inventory.checked", canReserve ? `Reserved ${requestedQuantity} unit(s) for ${orderId}` : `Insufficient stock for ${orderId}`, context.executionId)

    return {
      orderId,
      productId,
      reservedQuantity: canReserve ? requestedQuantity : 0,
      remainingStock: canReserve ? availableStock - requestedQuantity : availableStock,
      reservationStatus: canReserve ? "reserved" : "insufficient_stock",
    }
  }
}
