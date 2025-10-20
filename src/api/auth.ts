// src/api/auth.ts
import apiService, { type ApiResult, ApiError } from "./apiService"

const USER_KEY = "user"

function hasWindow() {
  return typeof window !== "undefined"
}

const storage = {
  getUserRaw(): string | null {
    if (!hasWindow()) return null
    try {
      return window.localStorage.getItem(USER_KEY)
    } catch {
      /* ignore localStorage errors (SSR / private mode) */
      return null
    }
  },
  setUserRaw(value: string) {
    if (!hasWindow()) return
    try {
      window.localStorage.setItem(USER_KEY, value)
    } catch {
      /* ignore localStorage errors (SSR / private mode) */
    }
  },
  removeUser() {
    if (!hasWindow()) return
    try {
      window.localStorage.removeItem(USER_KEY)
    } catch {
      /* ignore localStorage errors (SSR / private mode) */
    }
  },
}

export type Credentials = {
  phone?: string
  email?: string
  password: string
}

export type LoginResponse<TUser = unknown> = {
  token?: string
  access_token?: string
  user?: TUser
}

export type MeResponse<TUser = unknown> = {
  // Some APIs return { user }, others return raw user
  user?: TUser | null
  // plus any other fields...
}

const auth = {
  getUser<TUser = unknown>(): TUser | null {
    const raw = storage.getUserRaw()
    if (!raw) return null
    try {
      return JSON.parse(raw) as TUser
    } catch {
      return null
    }
  },

  setUser<TUser = unknown>(user: TUser | null) {
    if (user == null) {
      storage.removeUser()
      return
    }
    try {
      storage.setUserRaw(JSON.stringify(user))
    } catch {
      /* ignore */
    }
  },

  async login<TUser = unknown>(
    credentials: Credentials,
    path: "/auth/login" | "/login" = "/auth/login"
  ): Promise<ApiResult<LoginResponse<TUser>>> {
    const res = await apiService.post<LoginResponse<TUser>, Credentials>(path, credentials)
    const token = res.data.token ?? res.data.access_token
    if (!token) {
      throw new ApiError(res.status, "Aucun jeton d'authentification retourné par l'API.")
    }
    apiService.setToken(token)
    if (res.data.user) auth.setUser<TUser>(res.data.user)
    return res
  },



  async logout(path: "/auth/logout" | "/logout" = "/auth/logout") {
    const hadToken = !!apiService.getToken?.()
    try {
      if (hadToken) {
        await apiService.post(path)
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 419)) {
        // already invalid → ignore
      } else {
        // optionally log other errors
      }
    } finally {
      apiService.removeToken()
      this.setUser?.(null as any) // defensive: clear cached user
      // ^ if you exported setUser — if not, leave it out. AuthContext handles it anyway.
    }
    return { success: true, data: null, status: 204 } as ApiResult<null>
  },

  /**
   * Fetch current user. Accepts { user: {...} } or raw user object.
   * Never clears the token here; let the caller decide (e.g. only on 401).
   */
  async fetchUser<TUser = unknown>(
    path: "/auth/me" | "/user" = "/auth/me"
  ): Promise<TUser | null> {
    const res = await apiService.get<any>(path)
    const data = res.data

    // Try common shapes
    let user: TUser | null = null
    if (data && typeof data === "object") {
      if ("user" in data) {
        user = (data.user ?? null) as TUser | null
      } else if ("id" in data || "name" in data || "email" in data) {
        user = data as TUser
      }
    }

    // Cache (do not remove token here)
    auth.setUser(user)
    return user
  },
}

export default auth
