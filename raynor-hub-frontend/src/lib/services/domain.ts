import type { EntityId } from "@/lib/types"
import { mockDataService } from "./mock-data-service"

export const domainService = {
  getOrderById: (id: EntityId) => mockDataService.getOrders().find((order) => order.id === id),
  getProductById: (id: EntityId) => mockDataService.getProducts().find((product) => product.id === id),
  getCustomerById: (id: EntityId) => mockDataService.getCustomers().find((customer) => customer.id === id),
  getMarketplaceById: (id: EntityId) => mockDataService.getMarketplaces().find((marketplace) => marketplace.id === id),
  getInventoryByProductId: (productId: EntityId) => mockDataService.getInventory().find((item) => item.productId === productId),
} as const
