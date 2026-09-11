import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, getStoredViewMode, getToken, setStoredViewMode, setToken } from '../api/client'
import type { User } from '../api/types'
import { resolveViewMode, type ViewMode } from './viewMode'

type AuthContextValue = {
  user: User | null
  loading: boolean
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  login: (username: string, password: string, options?: { as?: 'trainer' }) => Promise<void>
  signup: (username: string, password: string, email?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewModeState] = useState<ViewMode>('trainee')

  const setViewMode = useCallback((mode: ViewMode) => {
    setStoredViewMode(mode)
    setViewModeState(mode)
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    apiFetch<User>('/accounts/me/')
      .then((me) => {
        setUser(me)
        // Keep whatever mode was last chosen if it's still valid for this
        // account, otherwise fall back to the account's actual capability.
        const stored = getStoredViewMode()
        const stillValid = stored === 'trainer' ? me.is_trainer : stored === 'trainee' ? me.is_trainee : false
        setViewMode(stillValid ? (stored as ViewMode) : resolveViewMode(me))
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [setViewMode])

  const login = useCallback(
    async (username: string, password: string, options?: { as?: 'trainer' }) => {
      const { token } = await apiFetch<{ token: string }>('/auth/token/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setToken(token)
      const me = await apiFetch<User>('/accounts/me/')
      setUser(me)
      setViewMode(resolveViewMode(me, options?.as))
    },
    [setViewMode],
  )

  const signup = useCallback(
    async (username: string, password: string, email?: string) => {
      const { token } = await apiFetch<{ token: string }>('/auth/signup/', {
        method: 'POST',
        body: JSON.stringify({ username, password, email: email ?? '' }),
      })
      setToken(token)
      const me = await apiFetch<User>('/accounts/me/')
      setUser(me)
      setViewMode(resolveViewMode(me))
    },
    [setViewMode],
  )

  const logout = useCallback(() => {
    setToken(null)
    setStoredViewMode(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await apiFetch<User>('/accounts/me/')
    setUser(me)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, viewMode, setViewMode, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
