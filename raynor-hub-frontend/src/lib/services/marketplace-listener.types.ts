import type { Marketplace } from "@/lib/interfaces/marketplace"
import type { Order } from "@/lib/interfaces/order"
import type { PaymentStatus } from "@/lib/types/status"

export type SupportedMarketplace = Marketplace["name"]

export interface MarketplaceListenerError {
  marketplace: SupportedMarketplace
  code: "INVALID_PAYLOAD" | "UNSUPPORTED_MARKETPLACE" | "NORMALIZATION_FAILED"
  message: string
  field?: string
}

export interface NormalizedOrderResult {
  success: boolean
  order?: Order
  errors: MarketplaceListenerError[]
  receivedAt: string
}

export interface MarketplacePollResult {
  marketplace: SupportedMarketplace
  received: number
  normalized: number
  rejected: number
  orders: Order[]
  errors: MarketplaceListenerError[]
  polledAt: string
}

export interface SupervisorAgentPort {
  receiveOrder(order: Order): Promise<void> | void
}

export interface MarketplaceListenerOptions {
  supervisor?: SupervisorAgentPort
  now?: () => Date
}

export interface ItemkuOrderPayload {
  order_id: string
  order_number: string
  buyer: { username: string; email?: string; phone_number?: string }
  item: { sku: string; title: string; quantity: number; unit_price: number }
  payment: { state: "paid" | "pending" | "failed"; total: number; currency: string }
  created_at: string
}

export interface G2GOrderPayload {
  transactionId: string
  referenceNo: string
  customer: { nickname: string; email?: string; country?: string }
  product: { productCode: string; productName: string; qty: number; price: number }
  paymentStatus: "COMPLETED" | "PENDING" | "FAILED"
  amount: { value: number; currency: string }
  orderedAt: string
}

export interface U7BuyOrderPayload {
  id: string
  orderNo: string
  user_info: { user_name: string; user_email?: string }
  goods: { goods_id: string; goods_name: string; count: number; sell_price: number }
  pay_status: 1 | 2 | 3
  pay_amount: number
  currency_code: string
  create_time: string
}

export interface VCGamersOrderPayload {
  order: { id: string; number: string; createdAt: string }
  customer: { displayName: string; email?: string; region?: string }
  lineItems: Array<{ productId: string; name: string; quantity: number; amount: number }>
  transaction: { status: "settled" | "pending" | "voided"; total: number; currency: string }
}

export interface EldoradoOrderPayload {
  id: string
  order_code: string
  buyer: { name: string; email?: string; country_code?: string }
  offer: { id: string; name: string; quantity: number; unit_price: number }
  status: "completed" | "awaiting_payment" | "cancelled"
  total_price: number
  currency: string
  date_created: string
}

export type MarketplacePayload =
  | ItemkuOrderPayload
  | G2GOrderPayload
  | U7BuyOrderPayload
  | VCGamersOrderPayload
  | EldoradoOrderPayload

export function paymentStatusFromMock(value: string | number): PaymentStatus {
  if (value === "paid" || value === "COMPLETED" || value === 1 || value === "settled" || value === "completed") return "paid"
  if (value === "failed" || value === "FAILED" || value === 3 || value === "voided" || value === "cancelled") return "failed"
  return "pending"
}
