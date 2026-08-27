import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, getToken, setToken } from '../api/client'
import type { User } from '../api/types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
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

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
