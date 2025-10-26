import * as React from "react"
import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import "mapbox-gl/dist/mapbox-gl.css"

export default function AppLayout() {
  const providerStyle = React.useMemo(
    () =>
      ({
        "--sidebar-width": "calc(var(--spacing) * 72)", // ~288px
        "--header-height": "calc(var(--spacing) * 12)", // ~48px
      }) as React.CSSProperties,
    []
  )

  return (
    <SidebarProvider style={providerStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="">
              {/* <div className="px-4 lg:px-6"> */}
                {/* Lazy content renders here */}
                <React.Suspense fallback={null}>
                  <Outlet />
                </React.Suspense>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
