export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiResponse<T> {
  data: T
  message?: string
  requestId?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface QueryOptions {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
}
