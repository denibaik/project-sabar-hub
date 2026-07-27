import {
  mockActivities,
  mockAgents,
  mockCustomers,
  mockDeliveries,
  mockInventory,
  mockMarketplaces,
  mockNotifications,
  mockOrders,
  mockProducts,
} from "@/lib/mock"

export const mockDataService = {
  getOrders: () => mockOrders,
  getProducts: () => mockProducts,
  getInventory: () => mockInventory,
  getCustomers: () => mockCustomers,
  getDeliveries: () => mockDeliveries,
  getMarketplaces: () => mockMarketplaces,
  getAgents: () => mockAgents,
  getActivities: () => mockActivities,
  getNotifications: () => mockNotifications,
} as const
