import type {
  EldoradoOrderPayload,
  G2GOrderPayload,
  ItemkuOrderPayload,
  U7BuyOrderPayload,
  VCGamersOrderPayload,
} from "@/lib/services/marketplace-listener.types"

export const itemkuOrderPayloads: ItemkuOrderPayload[] = [
  {
    order_id: "ITK-99184021",
    order_number: "INV-ITEMKU-20260720-4102",
    buyer: { username: "nadia_playz", email: "nadia.putri@example.com", phone_number: "+6281212345678" },
    item: { sku: "RBX-150K", title: "Robux 150K", quantity: 1, unit_price: 1_485_000 },
    payment: { state: "paid", total: 1_485_000, currency: "IDR" },
    created_at: "2026-07-20T09:41:02+07:00",
  },
]

export const g2gOrderPayloads: G2GOrderPayload[] = [
  {
    transactionId: "G2G-TX-778291",
    referenceNo: "G2G-20260720-8821",
    customer: { nickname: "RizkyA", email: "rizky.aditya@example.com", country: "ID" },
    product: { productCode: "RBL-GPASS-PRO", productName: "Premium Game Pass", qty: 1, price: 22.5 },
    paymentStatus: "COMPLETED",
    amount: { value: 22.5, currency: "USD" },
    orderedAt: "2026-07-20T09:38:44+07:00",
  },
]

export const u7BuyOrderPayloads: U7BuyOrderPayload[] = [
  {
    id: "U7B-620184",
    orderNo: "U7B202607201028",
    user_info: { user_name: "AlvinP", user_email: "alvin.pratama@example.com" },
    goods: { goods_id: "RBX-075K", goods_name: "Robux 75K", count: 2, sell_price: 48.5 },
    pay_status: 2,
    pay_amount: 97,
    currency_code: "USD",
    create_time: "2026-07-20T09:33:17+07:00",
  },
]

export const vcGamersOrderPayloads: VCGamersOrderPayload[] = [
  {
    order: { id: "VCG-710288", number: "VCG/ORD/20260720/2041", createdAt: "2026-07-20T09:26:51+07:00" },
    customer: { displayName: "Salsa Rahma", email: "salsa.rahma@example.com", region: "ID" },
    lineItems: [{ productId: "RBL-PS-30D", name: "Private Server 30 Days", quantity: 1, amount: 129_000 }],
    transaction: { status: "settled", total: 129_000, currency: "IDR" },
  },
]

export const eldoradoOrderPayloads: EldoradoOrderPayload[] = [
  {
    id: "ELD-ORDER-401992",
    order_code: "ELD-20260720-A892",
    buyer: { name: "Marcus Lee", email: "marcus.lee@example.com", country_code: "US" },
    offer: { id: "RBL-GC-050", name: "Roblox Gift Card $50", quantity: 1, unit_price: 50 },
    status: "awaiting_payment",
    total_price: 50,
    currency: "USD",
    date_created: "2026-07-20T09:20:05+07:00",
  },
]

export const marketplacePayloads = {
  Itemku: itemkuOrderPayloads,
  G2G: g2gOrderPayloads,
  U7Buy: u7BuyOrderPayloads,
  VCGamers: vcGamersOrderPayloads,
  Eldorado: eldoradoOrderPayloads,
} as const
