import React, { useMemo } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import Overview from "@/app/pages/Overview"
import Reservations from "@/app/pages/Reservations"
import Buses from "@/app/pages/Buses"
import People from "@/app/pages/People"
import Staff from "@/app/pages/Staff"
import Notifications from "@/app/pages/Notifications"
import Settings from "@/app/pages/Settings"
import MyAccount from "@/app/pages/MyAccount"
import LoginPage from "@/app/pages/Auth/Login"
import NotFound from "@/app/pages/NotFound"

import AuthProvider from "@/context/AuthContext"     // ⬅️ default export
import RequireAuth from "@/components/RequireAuth"   // ⬅️ default export, must use <Outlet />
import GuestOnly from "@/components/GuestOnly"       // ⬅️ default export, must use <Outlet />

import "mapbox-gl/dist/mapbox-gl.css"

export default function App() {
  const location = useLocation()

  // Routes rendered without sidebar/header
  const standaloneRoutes = ["/login", "/register", "/forgot-password"]
  const isStandaloneRoute = standaloneRoutes.some((route) =>
    location.pathname.startsWith(route)
  )

  const providerStyle = useMemo(
    () =>
      ({
        "--sidebar-width": "calc(var(--spacing) * 72)", // ≈ 288px
        "--header-height": "calc(var(--spacing) * 12)",  // ≈ 48px
      }) as React.CSSProperties,
    []
  )

  // STANDALONE tree (no sidebar/header)
  if (isStandaloneRoute) {
    return (
      <AuthProvider>
        <Routes>
          {/* Guest-only wrapper (should render <Outlet /> inside) */}
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            {/* <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} /> */}
          </Route>

          {/* Fallback for unknown public routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    )
  }

  // MAIN APP tree (with sidebar/header) + grouped protected routes
  return (
    <AuthProvider>
      <SidebarProvider style={providerStyle}>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <Routes>
                    <Route index element={<Navigate to="/overview" replace />} />

                    {/* Group all protected routes under RequireAuth (should render <Outlet />) */}
                    <Route element={<RequireAuth />}>
                      <Route path="/overview" element={<Overview />} />
                      <Route path="/reservations" element={<Reservations />} />
                      <Route path="/buses" element={<Buses />} />
                      <Route path="/people" element={<People />} />
                      <Route path="/staff" element={<Staff />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/account" element={<MyAccount />} />
                    </Route>

                    {/* Fallback for unknown protected routes */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
