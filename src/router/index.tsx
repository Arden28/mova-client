import * as React from "react"
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"
import AuthProvider from "@/context/AuthContext"
import RequireAuth from "@/components/RequireAuth"
import GuestOnly from "@/components/GuestOnly"

import AppLayout from "@/layouts/AppLayout"
import AuthLayout from "@/layouts/AuthLayout"

const Overview = React.lazy(() => import("@/app/pages/Overview"))
const Reservations = React.lazy(() => import("@/app/pages/Reservations"))
const Buses = React.lazy(() => import("@/app/pages/Buses"))
const People = React.lazy(() => import("@/app/pages/People"))
const Staff = React.lazy(() => import("@/app/pages/Staff"))
const Notifications = React.lazy(() => import("@/app/pages/Notifications"))
const Settings = React.lazy(() => import("@/app/pages/Settings"))
const MyAccount = React.lazy(() => import("@/app/pages/MyAccount"))
const Login = React.lazy(() => import("@/app/pages/Auth/Login"))
const NotFound = React.lazy(() => import("@/app/pages/NotFound"))

function withSuspense(node: React.ReactNode) {
  return <React.Suspense fallback={null}>{node}</React.Suspense>
}

// Root element that injects AuthProvider INSIDE the Router context
function Providers() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

export const router = createBrowserRouter([
  {
    element: <Providers />, // now AuthProvider can use useNavigate()
    children: [
      {
        path: "/",
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { index: true, element: <Navigate to="login" replace /> },
              { path: "login", element: withSuspense(<Login />) },
            ],
          },
        ],
      },

      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          {
            element: <RequireAuth />,
            children: [
              { path: "overview", element: withSuspense(<Overview />) },
              { path: "reservations", element: withSuspense(<Reservations />) },
              { path: "buses", element: withSuspense(<Buses />) },
              { path: "people", element: withSuspense(<People />) },
              { path: "staff", element: withSuspense(<Staff />) },
              { path: "notifications", element: withSuspense(<Notifications />) },
              { path: "settings", element: withSuspense(<Settings />) },
              { path: "account", element: withSuspense(<MyAccount />) },
            ],
          },
        ],
      },

      { path: "*", element: withSuspense(<NotFound />) },
    ],
  },
])
