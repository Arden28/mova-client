"use client"

import * as React from "react"
import { Outlet } from "react-router-dom"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import "mapbox-gl/dist/mapbox-gl.css"

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div id="app-shell" className="flex h-screen w-full overflow-hidden pl-0">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <SiteHeader />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col flex-1">
              <React.Suspense fallback={null}>
                <Outlet />
              </React.Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
