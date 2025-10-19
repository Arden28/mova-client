import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

import Overview from "@/app/pages/Overview";
import Reservations from "@/app/pages/Reservations";
import Buses from "@/app/pages/Buses";
import People from "@/app/pages/People";
import Staff from "@/app/pages/Staff";
import Notifications from "@/app/pages/Notifications";
import Settings from "@/app/pages/Settings";
import MyAccount from "@/app/pages/MyAccount";
import LoginPage from "@/app/pages/Auth/Login";

import "mapbox-gl/dist/mapbox-gl.css";
import NotFound from "./app/pages/NotFound";

export default function App() {
  const location = useLocation();

  // Define an array of routes that should be standalone (no sidebar/header)
  const standaloneRoutes = ["/login", "/register", "/forgot-password"];

  const isStandaloneRoute = standaloneRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  const providerStyle = useMemo(
    () =>
      ({
        "--sidebar-width": "calc(var(--spacing) * 72)",  // ≈ 288px
        "--header-height": "calc(var(--spacing) * 12)",   // ≈ 48px
      }) as React.CSSProperties,
    []
  );

  // If on on those route, render standalone page
  if (isStandaloneRoute) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} /> */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Otherwise, render the main app layout
  return (
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
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/reservations" element={<Reservations />} />
                  <Route path="/buses" element={<Buses />} />
                  <Route path="/people" element={<People />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/account" element={<MyAccount />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
