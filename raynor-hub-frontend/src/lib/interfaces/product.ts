import type { CurrencyCode, EntityId, ISODateString, ProductStatus } from "@/lib/types/status"

export interface Product {
  id: EntityId
  sku: string
  name: string
  description: string
  category: string
  price: number
  currency: CurrencyCode
  status: ProductStatus
  marketplaceIds: EntityId[]
  thumbnailUrl?: string
  createdAt: ISODateString
  updatedAt: ISODateString
}
