import { Navigate, Outlet, useLocation } from "react-router-dom"
import useAuth from "@/hooks/useAuth"

function GuestOnly() {
  const { status } = useAuth()
  const location = useLocation()

  // If we know we're authenticated, bounce away from login
  if (status === "authenticated") {
    const to = (location.state as any)?.from?.pathname || "/"
    return <Navigate to={to} replace />
  }

  // Show guest content even while "loading" (prevents form disappearing)
  return <Outlet />
}

export default GuestOnly
