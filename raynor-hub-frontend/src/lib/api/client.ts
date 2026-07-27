import type { ApiResponse } from "./contracts"

/** Transport boundary for the future backend integration. */
export interface ApiClient {
  get<T>(path: string): Promise<ApiResponse<T>>
  post<TRequest, TResponse>(path: string, body: TRequest): Promise<ApiResponse<TResponse>>
  put<TRequest, TResponse>(path: string, body: TRequest): Promise<ApiResponse<TResponse>>
  delete<T>(path: string): Promise<ApiResponse<T>>
}

/** Backend integration is intentionally not enabled during the UI phase. */
export const apiClient: ApiClient | null = null
