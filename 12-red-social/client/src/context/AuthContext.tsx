import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { User } from '../types'
import { ApiError, api, setAccessToken, setRefreshHandler } from '../utils/api'

interface AuthResponse {
  user: User
  token: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  sessionError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const applySession = useCallback((data: AuthResponse) => {
    setSessionError(null)
    setUser(data.user)
    setToken(data.token)
    setAccessToken(data.token)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const data = await api.post<AuthResponse>('/auth/refresh')
      applySession(data)
      return data.token
    } catch (error) {
      setUser(null)
      setToken(null)
      setAccessToken(null)
      if (!(error instanceof ApiError && error.status === 401)) {
        setSessionError(error instanceof Error ? error.message : 'No se pudo restaurar la sesión.')
      }
      return null
    }
  }, [applySession])

  useEffect(() => {
    setRefreshHandler(refreshSession)
    void api.refreshSession().finally(() => setLoading(false))
    return () => setRefreshHandler(null)
  }, [refreshSession])

  const login = async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password })
    applySession(data)
  }

  const register = async (email: string, username: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/register', { email, username, password })
    applySession(data)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
      setToken(null)
      setAccessToken(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, sessionError }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
