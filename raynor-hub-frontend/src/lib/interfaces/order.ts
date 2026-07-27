import type { AutomationStatus, CurrencyCode, DeliveryStatus, EntityId, ISODateString, OrderStatus, PaymentStatus } from "@/lib/types/status"

export interface Order {
  id: EntityId
  orderNumber: string
  externalOrderId?: string
  marketplaceId: EntityId
  salesChannelType?: "marketplace" | "web_store"
  customerId: EntityId
  productId: EntityId
  externalListingName?: string
  productName?: string
  game?: string
  robloxUsername?: string
  marketplaceCustomerName?: string
  customerNotes?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  currency: CurrencyCode
  paymentStatus: PaymentStatus
  deliveryStatus: DeliveryStatus
  automationStatus: AutomationStatus
  status: OrderStatus
  assignedBotId?: EntityId
  fulfillmentMode?: "automatic" | "manual"
  marketplaceCompletionStatus?: "pending" | "completed" | "failed" | "manual_required"
  notificationStatus?: "pending" | "sent" | "failed" | "manual_required"
  createdAt: ISODateString
  updatedAt: ISODateString
}
