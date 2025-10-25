"use client"

import * as React from "react"
import { Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"

/**
 * Minimal layout for map-first experiences:
 * - No sidebar, no app chrome
 * - Fills the whole viewport
 */
export default function MapLayout({
  className,
}: {
  className?: string
}) {
  return (
    <div className={cn("h-[100dvh] w-full bg-background", className)}>
      {/* Optional top strip for future controls (kept empty/hidden) */}
      {/* <div className="h-0" /> */}
      <main className="h-full w-full">
        <Outlet />
      </main>
    </div>
  )
}
