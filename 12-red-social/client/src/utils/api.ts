const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
    if (!response.ok) throw new Error('Request failed')
    return response.json()
  },

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' })
  },

  async post(endpoint: string, data: any) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) })
  }
}