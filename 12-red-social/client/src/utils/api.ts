const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

let accessToken: string | null = null
let refreshHandler: (() => Promise<string | null>) | null = null
let refreshInFlight: Promise<string | null> | null = null

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler
}

async function refreshAccessToken() {
  if (!refreshHandler) return null
  if (!refreshInFlight) {
    refreshInFlight = refreshHandler().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export const api = {
  async request<T = unknown>(endpoint: string, options: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(options.headers)
    if (!headers.has('Content-Type') && options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include'
    })
    const data = await response.json().catch(() => null)

    if (response.status === 401 && retry && !endpoint.startsWith('/auth/') && refreshHandler) {
      const newToken = await refreshAccessToken()
      if (newToken) return this.request<T>(endpoint, options, false)
    }
    if (!response.ok) throw new ApiError(data?.error || `Request failed (${response.status})`, response.status)
    return data as T
  },

  async refreshSession(): Promise<string | null> {
    return refreshAccessToken()
  },

  async get<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  },

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      ...(data === undefined ? {} : { body: JSON.stringify(data) })
    })
  }
}
