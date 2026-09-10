import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, getToken, setToken } from '../api/client'
import type { User } from '../api/types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  signup: (username: string, password: string, email?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    apiFetch<User>('/accounts/me/')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const { token } = await apiFetch<{ token: string }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setToken(token)
    const me = await apiFetch<User>('/accounts/me/')
    setUser(me)
  }, [])

  const signup = useCallback(async (username: string, password: string, email?: string) => {
    const { token } = await apiFetch<{ token: string }>('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify({ username, password, email: email ?? '' }),
    })
    setToken(token)
    const me = await apiFetch<User>('/accounts/me/')
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await apiFetch<User>('/accounts/me/')
    setUser(me)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
