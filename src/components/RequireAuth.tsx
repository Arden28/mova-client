import { Navigate, Outlet, useLocation } from "react-router-dom"
import useAuth from "@/hooks/useAuth"

function RequireAuth() {
  const { status, isAuthenticated } = useAuth()
  const location = useLocation()

  // Block render while checking token; prevents flicker
  if (status === "loading") return null

  // If not authenticated, redirect to login immediately
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default RequireAuth
