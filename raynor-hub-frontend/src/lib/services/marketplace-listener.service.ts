import type { Order } from "@/lib/interfaces/order"
import { marketplacePayloads } from "@/lib/mock/marketplace-payloads"
import type { CurrencyCode, PaymentStatus } from "@/lib/types/status"
import {
  paymentStatusFromMock,
  type EldoradoOrderPayload,
  type G2GOrderPayload,
  type ItemkuOrderPayload,
  type MarketplaceListenerError,
  type MarketplaceListenerOptions,
  type MarketplacePayload,
  type MarketplacePollResult,
  type NormalizedOrderResult,
  type SupportedMarketplace,
  type U7BuyOrderPayload,
  type VCGamersOrderPayload,
} from "./marketplace-listener.types"

const MARKETPLACE_IDS: Record<SupportedMarketplace, string> = {
  Itemku: "mp-itemku",
  G2G: "mp-g2g",
  U7Buy: "mp-u7buy",
  VCGamers: "mp-vcgamers",
  Eldorado: "mp-eldorado",
}

const PRODUCT_IDS: Record<string, string> = {
  "RBX-150K": "prd-robux-150k",
  "RBX-075K": "prd-robux-75k",
  "RBL-GPASS-PRO": "prd-gamepass",
  "RBL-PS-30D": "prd-private-server",
  "RBL-GC-050": "prd-giftcard-50",
}

interface NormalizationFields {
  externalId: string
  orderNumber: string
  customerReference: string
  productReference: string
  quantity: number
  unitPrice: number
  totalAmount: number
  currency: string
  paymentStatus: PaymentStatus
  createdAt: string
}

export class MarketplaceListenerService {
  private readonly now: () => Date
  private readonly supervisor: MarketplaceListenerOptions["supervisor"]

  constructor(options: MarketplaceListenerOptions = {}) {
    this.now = options.now ?? (() => new Date())
    this.supervisor = options.supervisor
  }

  async pollMarketplace(marketplace: SupportedMarketplace): Promise<MarketplacePollResult> {
    const payloads = marketplacePayloads[marketplace] as readonly MarketplacePayload[]
    const orders: Order[] = []
    const errors: MarketplaceListenerError[] = []

    for (const payload of payloads) {
      const result = this.normalize(marketplace, payload)

      if (!result.success || !result.order) {
        errors.push(...result.errors)
        continue
      }

      orders.push(result.order)
      await this.supervisor?.receiveOrder(result.order)
    }

    return {
      marketplace,
      received: payloads.length,
      normalized: orders.length,
      rejected: errors.length,
      orders,
      errors,
      polledAt: this.now().toISOString(),
    }
  }

  async pollAll(): Promise<MarketplacePollResult[]> {
    const marketplaces = Object.keys(marketplacePayloads) as SupportedMarketplace[]
    return Promise.all(marketplaces.map((marketplace) => this.pollMarketplace(marketplace)))
  }

  async receivePayload(marketplace: SupportedMarketplace, payload: MarketplacePayload): Promise<NormalizedOrderResult> {
    const result = this.normalize(marketplace, payload)
    if (result.success && result.order) {
      await this.supervisor?.receiveOrder(result.order)
    }
    return result
  }

  normalize(marketplace: SupportedMarketplace, payload: MarketplacePayload): NormalizedOrderResult {
    const receivedAt = this.now().toISOString()

    try {
      const fields = this.extractFields(marketplace, payload)
      const errors = this.validate(marketplace, fields)

      if (errors.length > 0) {
        return { success: false, errors, receivedAt }
      }

      const createdAt = new Date(fields.createdAt).toISOString()
      const productId = PRODUCT_IDS[fields.productReference] ?? `prd-external-${this.toId(fields.productReference)}`
      const order: Order = {
        id: `ord-${marketplace.toLowerCase()}-${this.toId(fields.externalId)}`,
        orderNumber: fields.orderNumber,
        marketplaceId: MARKETPLACE_IDS[marketplace],
        customerId: `cus-${marketplace.toLowerCase()}-${this.toId(fields.customerReference)}`,
        productId,
        quantity: fields.quantity,
        unitPrice: fields.unitPrice,
        totalAmount: fields.totalAmount,
        currency: this.normalizeCurrency(fields.currency),
        paymentStatus: fields.paymentStatus,
        deliveryStatus: "pending",
        automationStatus: fields.paymentStatus === "paid" ? "waiting" : "manual_review",
        status: fields.paymentStatus === "paid" ? "pending" : fields.paymentStatus === "failed" ? "failed" : "pending",
        createdAt,
        updatedAt: receivedAt,
      }

      return { success: true, order, errors: [], receivedAt }
    } catch (error) {
      return {
        success: false,
        errors: [{
          marketplace,
          code: "NORMALIZATION_FAILED",
          message: error instanceof Error ? error.message : "Unknown normalization error",
        }],
        receivedAt,
      }
    }
  }

  private extractFields(marketplace: SupportedMarketplace, payload: MarketplacePayload): NormalizationFields {
    switch (marketplace) {
      case "Itemku": {
        const data = payload as ItemkuOrderPayload
        return {
          externalId: data.order_id,
          orderNumber: data.order_number,
          customerReference: data.buyer.email ?? data.buyer.username,
          productReference: data.item.sku,
          quantity: data.item.quantity,
          unitPrice: data.item.unit_price,
          totalAmount: data.payment.total,
          currency: data.payment.currency,
          paymentStatus: paymentStatusFromMock(data.payment.state),
          createdAt: data.created_at,
        }
      }
      case "G2G": {
        const data = payload as G2GOrderPayload
        return {
          externalId: data.transactionId,
          orderNumber: data.referenceNo,
          customerReference: data.customer.email ?? data.customer.nickname,
          productReference: data.product.productCode,
          quantity: data.product.qty,
          unitPrice: data.product.price,
          totalAmount: data.amount.value,
          currency: data.amount.currency,
          paymentStatus: paymentStatusFromMock(data.paymentStatus),
          createdAt: data.orderedAt,
        }
      }
      case "U7Buy": {
        const data = payload as U7BuyOrderPayload
        return {
          externalId: data.id,
          orderNumber: data.orderNo,
          customerReference: data.user_info.user_email ?? data.user_info.user_name,
          productReference: data.goods.goods_id,
          quantity: data.goods.count,
          unitPrice: data.goods.sell_price,
          totalAmount: data.pay_amount,
          currency: data.currency_code,
          paymentStatus: paymentStatusFromMock(data.pay_status),
          createdAt: data.create_time,
        }
      }
      case "VCGamers": {
        const data = payload as VCGamersOrderPayload
        const firstItem = data.lineItems[0]
        if (!firstItem) throw new Error("VCGamers payload does not contain a line item")
        return {
          externalId: data.order.id,
          orderNumber: data.order.number,
          customerReference: data.customer.email ?? data.customer.displayName,
          productReference: firstItem.productId,
          quantity: firstItem.quantity,
          unitPrice: firstItem.amount,
          totalAmount: data.transaction.total,
          currency: data.transaction.currency,
          paymentStatus: paymentStatusFromMock(data.transaction.status),
          createdAt: data.order.createdAt,
        }
      }
      case "Eldorado": {
        const data = payload as EldoradoOrderPayload
        return {
          externalId: data.id,
          orderNumber: data.order_code,
          customerReference: data.buyer.email ?? data.buyer.name,
          productReference: data.offer.id,
          quantity: data.offer.quantity,
          unitPrice: data.offer.unit_price,
          totalAmount: data.total_price,
          currency: data.currency,
          paymentStatus: paymentStatusFromMock(data.status),
          createdAt: data.date_created,
        }
      }
    }
  }

  private validate(marketplace: SupportedMarketplace, fields: NormalizationFields): MarketplaceListenerError[] {
    const errors: MarketplaceListenerError[] = []
    const required: Array<[keyof NormalizationFields, unknown]> = [
      ["externalId", fields.externalId],
      ["orderNumber", fields.orderNumber],
      ["customerReference", fields.customerReference],
      ["productReference", fields.productReference],
      ["createdAt", fields.createdAt],
    ]

    for (const [field, value] of required) {
      if (typeof value !== "string" || value.trim() === "") {
        errors.push({ marketplace, code: "INVALID_PAYLOAD", field, message: `${field} is required` })
      }
    }

    if (!Number.isInteger(fields.quantity) || fields.quantity <= 0) {
      errors.push({ marketplace, code: "INVALID_PAYLOAD", field: "quantity", message: "quantity must be a positive integer" })
    }
    if (!Number.isFinite(fields.unitPrice) || fields.unitPrice < 0) {
      errors.push({ marketplace, code: "INVALID_PAYLOAD", field: "unitPrice", message: "unitPrice must be a non-negative number" })
    }
    if (!Number.isFinite(fields.totalAmount) || fields.totalAmount < 0) {
      errors.push({ marketplace, code: "INVALID_PAYLOAD", field: "totalAmount", message: "totalAmount must be a non-negative number" })
    }
    if (Number.isNaN(Date.parse(fields.createdAt))) {
      errors.push({ marketplace, code: "INVALID_PAYLOAD", field: "createdAt", message: "createdAt must be a valid date" })
    }
    if (!(["IDR", "USD"] as string[]).includes(fields.currency.toUpperCase())) {
      errors.push({ marketplace, code: "INVALID_PAYLOAD", field: "currency", message: "currency must be IDR or USD" })
    }

    return errors
  }

  private normalizeCurrency(currency: string): CurrencyCode {
    return currency.toUpperCase() === "USD" ? "USD" : "IDR"
  }

  private toId(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }
}
