// src/context/AuthContext.tsx
import React, { createContext, useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import auth from "@/api/auth"
import apiService, { ApiError } from "@/api/apiService"

export type AppUser = {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

export interface AuthContextShape {
  status: AuthStatus
  user: AppUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>
}

export const AuthContext = createContext<AuthContextShape | undefined>(undefined)

function withTimeout<T>(p: Promise<T>, ms: number) {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("auth/me timeout")), ms)),
  ])
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("unauthenticated")
  const navigate = useNavigate()

  useEffect(() => {
    const token = apiService.getToken()
    const cached = auth.getUser<AppUser>()

    if (!token) {
      setUser(null)
      setStatus("unauthenticated")
      return
    }

    setUser(cached ?? null)
    setStatus("authenticated")

    ;(async () => {
      try {
        const me = await withTimeout(auth.fetchUser<AppUser>(), 3500)
        if (me) {
          setUser(me)
          setStatus("authenticated")
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // token invalid – clear locally (don’t rely on /logout here)
          apiService.removeToken()
          setUser(null)
          setStatus("unauthenticated")
          // optional: navigate("/login")
        } else {
          setStatus("authenticated") // network/timeout: keep cached session
        }
      }
    })()
  }, [])


  const login = useCallback(
    async (email: string, password: string) => {
      setStatus("loading")
      try {
        await auth.login({ email, password })
        const me = await auth.fetchUser<AppUser>()
        setUser(me)
        setStatus("authenticated")
        navigate("/")
      } catch (err) {
        setUser(null)
        setStatus("unauthenticated")
        throw err
      }
    },
    [navigate]
  )

const logout = useCallback(async () => {
  try {
    await auth.logout() // may 401 → our auth.ts already swallows; still wrap just in case
  } catch {
    // ignore – logout must be idempotent in the UI
  } finally {
    setUser(null)
    setStatus("unauthenticated")
    navigate("/login")
  }
}, [navigate])

  const refresh = useCallback(async () => {
    setStatus("loading")
    try {
      const me = await withTimeout(auth.fetchUser<AppUser>(), 3500)
      if (me) {
        setUser(me)
        setStatus("authenticated")
      } else {
        // keep session; backend didn’t deny it
        setStatus("authenticated")
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await auth.logout()
        setUser(null)
        setStatus("unauthenticated")
      } else {
        setStatus("authenticated")
      }
    }
  }, [])

  const value = useMemo<AuthContextShape>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      login,
      logout,
      refresh,
      setUser,
    }),
    [user, status, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
