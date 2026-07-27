export type EntityId = string
export type ISODateString = string
export type CurrencyCode = "IDR" | "USD"

export type ConnectionStatus = "connected" | "degraded" | "disconnected"
export type MarketplaceSyncStatus = "synced" | "syncing" | "failed" | "paused"
export type ProductStatus = "active" | "draft" | "archived"
export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock"
export type CustomerStatus = "active" | "blocked" | "inactive"
export type PaymentStatus = "pending" | "paid" | "verifying" | "failed" | "refunded"
export type DeliveryStatus = "pending" | "queued" | "waiting_bot" | "delivering" | "verifying" | "delivered" | "failed"
export type AutomationStatus = "waiting" | "processing" | "completed" | "failed" | "manual_review"
export type OrderStatus = "received" | "pending" | "processing" | "waiting_bot" | "delivering" | "verifying" | "completed" | "failed" | "manual_review" | "refund"
export type AgentStatus = "online" | "busy" | "degraded" | "offline"
export type ActivitySeverity = "info" | "success" | "warning" | "error"
export type NotificationType = "order" | "inventory" | "marketplace" | "agent" | "system"
export type NotificationPriority = "low" | "normal" | "high" | "critical"
