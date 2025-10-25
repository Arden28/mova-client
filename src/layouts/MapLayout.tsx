"use client"

import * as React from "react"
import { Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import "mapbox-gl/dist/mapbox-gl.css"

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
    <div className="w-full bg-background">
      {/* Optional top strip for future controls (kept empty/hidden) */}
      {/* <div className="h-0" /> */}
      <main className="">
        <Outlet />
      </main>
    </div>
  )
}
