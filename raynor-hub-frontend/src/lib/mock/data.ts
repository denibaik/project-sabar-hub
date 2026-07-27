import type {
  Activity,
  Agent,
  Customer,
  Delivery,
  Inventory,
  Marketplace,
  Notification,
  Order,
  Product,
} from "@/lib/interfaces"

export const mockMarketplaces: Marketplace[] = [
  { id: "mp-itemku", name: "Itemku", slug: "itemku", connectionStatus: "connected", syncStatus: "synced", ordersToday: 38, revenueToday: 8_450_000, currency: "IDR", lastSyncedAt: "2026-07-20T09:44:20+07:00", enabled: true },
  { id: "mp-g2g", name: "G2G", slug: "g2g", connectionStatus: "connected", syncStatus: "synced", ordersToday: 27, revenueToday: 1_285, currency: "USD", lastSyncedAt: "2026-07-20T09:43:52+07:00", enabled: true },
  { id: "mp-u7buy", name: "U7Buy", slug: "u7buy", connectionStatus: "connected", syncStatus: "syncing", ordersToday: 19, revenueToday: 825, currency: "USD", lastSyncedAt: "2026-07-20T09:42:10+07:00", enabled: true },
  { id: "mp-vcgamers", name: "VCGamers", slug: "vcgamers", connectionStatus: "degraded", syncStatus: "failed", ordersToday: 14, revenueToday: 3_120_000, currency: "IDR", lastSyncedAt: "2026-07-20T09:12:00+07:00", enabled: true },
  { id: "mp-eldorado", name: "Eldorado", slug: "eldorado", connectionStatus: "disconnected", syncStatus: "paused", ordersToday: 0, revenueToday: 0, currency: "USD", lastSyncedAt: null, enabled: false },
]

export const mockProducts: Product[] = [
  { id: "prd-robux-150k", sku: "RBX-150K", name: "Robux 150K", description: "Paket pengiriman 150.000 Robux melalui akun delivery terverifikasi.", category: "Roblox Currency", price: 1_485_000, currency: "IDR", status: "active", marketplaceIds: ["mp-itemku", "mp-g2g", "mp-u7buy", "mp-vcgamers"], createdAt: "2026-05-02T10:00:00+07:00", updatedAt: "2026-07-19T18:30:00+07:00" },
  { id: "prd-robux-75k", sku: "RBX-075K", name: "Robux 75K", description: "Paket Robux menengah dengan estimasi delivery di bawah lima menit.", category: "Roblox Currency", price: 755_000, currency: "IDR", status: "active", marketplaceIds: ["mp-itemku", "mp-g2g", "mp-vcgamers"], createdAt: "2026-05-02T10:05:00+07:00", updatedAt: "2026-07-20T08:10:00+07:00" },
  { id: "prd-gamepass", sku: "RBL-GPASS-PRO", name: "Premium Game Pass", description: "Game pass premium untuk katalog game Roblox pilihan.", category: "Game Pass", price: 349_000, currency: "IDR", status: "active", marketplaceIds: ["mp-itemku", "mp-u7buy"], createdAt: "2026-05-18T13:00:00+07:00", updatedAt: "2026-07-18T11:15:00+07:00" },
  { id: "prd-private-server", sku: "RBL-PS-30D", name: "Private Server 30 Days", description: "Akses private server selama 30 hari dengan aktivasi otomatis.", category: "Subscription", price: 129_000, currency: "IDR", status: "active", marketplaceIds: ["mp-itemku", "mp-vcgamers"], createdAt: "2026-06-01T09:00:00+07:00", updatedAt: "2026-07-20T07:55:00+07:00" },
  { id: "prd-giftcard-50", sku: "RBL-GC-050", name: "Roblox Gift Card $50", description: "Kode gift card regional US yang dikirim secara otomatis.", category: "Gift Card", price: 50, currency: "USD", status: "active", marketplaceIds: ["mp-g2g", "mp-u7buy", "mp-eldorado"], createdAt: "2026-06-14T16:00:00+07:00", updatedAt: "2026-07-17T12:00:00+07:00" },
]

export const mockInventory: Inventory[] = [
  { id: "inv-001", productId: "prd-robux-150k", currentStock: 240, reservedStock: 18, availableStock: 222, reorderPoint: 40, assignedBotIds: ["agt-order", "agt-inventory"], status: "in_stock", updatedAt: "2026-07-20T09:44:00+07:00" },
  { id: "inv-002", productId: "prd-robux-75k", currentStock: 185, reservedStock: 12, availableStock: 173, reorderPoint: 35, assignedBotIds: ["agt-inventory"], status: "in_stock", updatedAt: "2026-07-20T09:43:00+07:00" },
  { id: "inv-003", productId: "prd-gamepass", currentStock: 28, reservedStock: 6, availableStock: 22, reorderPoint: 20, assignedBotIds: ["agt-inventory"], status: "low_stock", updatedAt: "2026-07-20T09:41:00+07:00" },
  { id: "inv-004", productId: "prd-private-server", currentStock: 64, reservedStock: 4, availableStock: 60, reorderPoint: 15, assignedBotIds: ["agt-order"], status: "in_stock", updatedAt: "2026-07-20T09:38:00+07:00" },
  { id: "inv-005", productId: "prd-giftcard-50", currentStock: 0, reservedStock: 0, availableStock: 0, reorderPoint: 25, assignedBotIds: [], status: "out_of_stock", updatedAt: "2026-07-20T08:50:00+07:00" },
]

export const mockCustomers: Customer[] = [
  { id: "cus-nadia", marketplaceId: "mp-itemku", externalCustomerId: "ITK-882104", name: "Nadia Putri", email: "nadia.putri@example.com", phone: "+6281212345678", country: "Indonesia", totalOrders: 12, lifetimeValue: 9_840_000, status: "active", createdAt: "2026-02-14T10:15:00+07:00", updatedAt: "2026-07-20T09:41:00+07:00" },
  { id: "cus-rizky", marketplaceId: "mp-g2g", externalCustomerId: "G2G-491852", name: "Rizky Aditya", email: "rizky.aditya@example.com", country: "Indonesia", totalOrders: 7, lifetimeValue: 1_925, status: "active", createdAt: "2026-03-22T14:30:00+07:00", updatedAt: "2026-07-20T09:39:00+07:00" },
  { id: "cus-alvin", marketplaceId: "mp-u7buy", externalCustomerId: "U7B-108291", name: "Alvin Pratama", email: "alvin.pratama@example.com", country: "Singapore", totalOrders: 4, lifetimeValue: 630, status: "active", createdAt: "2026-04-05T08:40:00+07:00", updatedAt: "2026-07-20T09:34:00+07:00" },
  { id: "cus-salsa", marketplaceId: "mp-vcgamers", externalCustomerId: "VCG-773401", name: "Salsa Rahma", email: "salsa.rahma@example.com", phone: "+6285798765432", country: "Indonesia", totalOrders: 9, lifetimeValue: 4_280_000, status: "active", createdAt: "2026-01-30T19:20:00+07:00", updatedAt: "2026-07-20T09:28:00+07:00" },
  { id: "cus-marcus", marketplaceId: "mp-eldorado", externalCustomerId: "ELD-008172", name: "Marcus Lee", email: "marcus.lee@example.com", country: "United States", totalOrders: 2, lifetimeValue: 100, status: "inactive", createdAt: "2026-06-11T21:00:00+07:00", updatedAt: "2026-07-10T11:00:00+07:00" },
]

export const mockOrders: Order[] = [
  { id: "ord-08412", orderNumber: "SH-20260720-08412", marketplaceId: "mp-itemku", customerId: "cus-nadia", productId: "prd-robux-150k", quantity: 1, unitPrice: 1_485_000, totalAmount: 1_485_000, currency: "IDR", paymentStatus: "paid", deliveryStatus: "delivered", automationStatus: "completed", status: "completed", assignedBotId: "agt-order", createdAt: "2026-07-20T09:41:02+07:00", updatedAt: "2026-07-20T09:43:18+07:00" },
  { id: "ord-08411", orderNumber: "SH-20260720-08411", marketplaceId: "mp-g2g", customerId: "cus-rizky", productId: "prd-gamepass", quantity: 1, unitPrice: 349_000, totalAmount: 349_000, currency: "IDR", paymentStatus: "paid", deliveryStatus: "queued", automationStatus: "processing", status: "processing", assignedBotId: "agt-order", createdAt: "2026-07-20T09:38:44+07:00", updatedAt: "2026-07-20T09:42:12+07:00" },
  { id: "ord-08410", orderNumber: "SH-20260720-08410", marketplaceId: "mp-u7buy", customerId: "cus-alvin", productId: "prd-robux-75k", quantity: 2, unitPrice: 755_000, totalAmount: 1_510_000, currency: "IDR", paymentStatus: "verifying", deliveryStatus: "pending", automationStatus: "waiting", status: "pending", createdAt: "2026-07-20T09:33:17+07:00", updatedAt: "2026-07-20T09:40:03+07:00" },
  { id: "ord-08409", orderNumber: "SH-20260720-08409", marketplaceId: "mp-vcgamers", customerId: "cus-salsa", productId: "prd-private-server", quantity: 1, unitPrice: 129_000, totalAmount: 129_000, currency: "IDR", paymentStatus: "paid", deliveryStatus: "delivered", automationStatus: "completed", status: "completed", assignedBotId: "agt-order", createdAt: "2026-07-20T09:26:51+07:00", updatedAt: "2026-07-20T09:28:40+07:00" },
  { id: "ord-08408", orderNumber: "SH-20260720-08408", marketplaceId: "mp-itemku", customerId: "cus-nadia", productId: "prd-robux-75k", quantity: 1, unitPrice: 755_000, totalAmount: 755_000, currency: "IDR", paymentStatus: "failed", deliveryStatus: "failed", automationStatus: "manual_review", status: "failed", createdAt: "2026-07-20T09:18:21+07:00", updatedAt: "2026-07-20T09:21:54+07:00" },
]

export const mockDeliveries: Delivery[] = [
  { id: "del-08412", orderId: "ord-08412", botId: "agt-order", status: "delivered", attemptCount: 1, deliveryReference: "DLV-ITK-772901", queuedAt: "2026-07-20T09:42:00+07:00", startedAt: "2026-07-20T09:42:16+07:00", completedAt: "2026-07-20T09:43:18+07:00", updatedAt: "2026-07-20T09:43:18+07:00" },
  { id: "del-08411", orderId: "ord-08411", botId: "agt-order", status: "queued", attemptCount: 0, queuedAt: "2026-07-20T09:42:12+07:00", updatedAt: "2026-07-20T09:42:12+07:00" },
  { id: "del-08409", orderId: "ord-08409", botId: "agt-order", status: "delivered", attemptCount: 1, deliveryReference: "DLV-VCG-180492", queuedAt: "2026-07-20T09:27:35+07:00", startedAt: "2026-07-20T09:27:50+07:00", completedAt: "2026-07-20T09:28:40+07:00", updatedAt: "2026-07-20T09:28:40+07:00" },
  { id: "del-08408", orderId: "ord-08408", status: "failed", attemptCount: 2, failureReason: "Payment confirmation expired before delivery allocation.", queuedAt: "2026-07-20T09:19:10+07:00", startedAt: "2026-07-20T09:19:24+07:00", updatedAt: "2026-07-20T09:21:54+07:00" },
]

export const mockAgents: Agent[] = [
  { id: "agt-supervisor", name: "Supervisor Agent", role: "supervisor", description: "Coordinates workflow routing and exception escalation.", status: "online", runningTasks: 8, completedTasksToday: 328, healthPercentage: 99, averageResponseTimeMs: 182, lastActivityAt: "2026-07-20T09:44:48+07:00" },
  { id: "agt-order", name: "Order Agent", role: "order", description: "Validates and orchestrates marketplace order lifecycle.", status: "busy", runningTasks: 24, completedTasksToday: 184, healthPercentage: 98, averageResponseTimeMs: 236, lastActivityAt: "2026-07-20T09:44:39+07:00" },
  { id: "agt-inventory", name: "Inventory Agent", role: "inventory", description: "Reserves stock and manages product availability.", status: "online", runningTasks: 11, completedTasksToday: 142, healthPercentage: 97, averageResponseTimeMs: 205, lastActivityAt: "2026-07-20T09:44:22+07:00" },
  { id: "agt-payment", name: "Payment Agent", role: "payment", description: "Reconciles and validates marketplace payments.", status: "online", runningTasks: 7, completedTasksToday: 163, healthPercentage: 100, averageResponseTimeMs: 154, lastActivityAt: "2026-07-20T09:43:58+07:00" },
  { id: "agt-support", name: "Customer Support Agent", role: "support", description: "Handles status inquiries and customer escalation.", status: "online", runningTasks: 16, completedTasksToday: 96, healthPercentage: 96, averageResponseTimeMs: 412, lastActivityAt: "2026-07-20T09:42:41+07:00" },
  { id: "agt-reporting", name: "Reporting Agent", role: "reporting", description: "Aggregates operational and revenue analytics.", status: "online", runningTasks: 3, completedTasksToday: 28, healthPercentage: 99, averageResponseTimeMs: 624, lastActivityAt: "2026-07-20T09:40:50+07:00" },
]

export const mockActivities: Activity[] = [
  { id: "act-001", actorType: "agent", actorId: "agt-order", actorName: "Order Agent", action: "Created Order", description: "Order SH-20260720-08412 dibuat dari webhook Itemku.", severity: "success", resourceType: "order", resourceId: "ord-08412", metadata: { marketplace: "Itemku", amount: 1_485_000 }, createdAt: "2026-07-20T09:41:02+07:00" },
  { id: "act-002", actorType: "agent", actorId: "agt-inventory", actorName: "Inventory Agent", action: "Reserved Stock", description: "Satu unit Robux 150K berhasil direservasi.", severity: "info", resourceType: "inventory", resourceId: "inv-001", metadata: { quantity: 1 }, createdAt: "2026-07-20T09:42:08+07:00" },
  { id: "act-003", actorType: "agent", actorId: "agt-order", actorName: "Order Agent", action: "Delivered Product", description: "Delivery SH-20260720-08412 selesai dalam 62 detik.", severity: "success", resourceType: "delivery", resourceId: "del-08412", metadata: { durationSeconds: 62 }, createdAt: "2026-07-20T09:43:18+07:00" },
  { id: "act-004", actorType: "agent", actorId: "agt-support", actorName: "Customer Support Agent", action: "Answered Customer", description: "Pertanyaan status order Nadia Putri terselesaikan.", severity: "success", resourceType: "customer", resourceId: "cus-nadia", createdAt: "2026-07-20T09:44:04+07:00" },
  { id: "act-005", actorType: "marketplace", actorId: "mp-vcgamers", actorName: "VCGamers", action: "Sync Failed", description: "Sinkronisasi katalog gagal setelah tiga percobaan.", severity: "warning", resourceType: "marketplace", resourceId: "mp-vcgamers", metadata: { retryCount: 3 }, createdAt: "2026-07-20T09:44:31+07:00" },
]

export const mockNotifications: Notification[] = [
  { id: "not-001", type: "marketplace", priority: "high", title: "VCGamers sync degraded", message: "Sinkronisasi katalog VCGamers gagal setelah tiga percobaan.", read: false, actionUrl: "/marketplace", resourceId: "mp-vcgamers", createdAt: "2026-07-20T09:44:31+07:00" },
  { id: "not-002", type: "inventory", priority: "high", title: "Gift card out of stock", message: "Roblox Gift Card $50 tidak memiliki stok tersedia.", read: false, actionUrl: "/inventory", resourceId: "inv-005", createdAt: "2026-07-20T09:30:00+07:00" },
  { id: "not-003", type: "order", priority: "normal", title: "Order requires review", message: "Order SH-20260720-08408 membutuhkan verifikasi manual.", read: false, actionUrl: "/orders/ord-08408", resourceId: "ord-08408", createdAt: "2026-07-20T09:21:54+07:00" },
  { id: "not-004", type: "agent", priority: "low", title: "Daily agent health check", message: "Seluruh agent utama memiliki health score di atas 95%.", read: true, actionUrl: "/automation", createdAt: "2026-07-20T08:00:00+07:00", readAt: "2026-07-20T08:12:00+07:00" },
]
