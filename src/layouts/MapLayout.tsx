"use client"

import * as React from "react"
import { Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import "mapbox-gl/dist/mapbox-gl.css"

export default function MapLayout({ className }: { className?: string }) {
  return (
    <div className={cn("relative min-h-screen w-dvw bg-background", className)}>
      <main className="h-full w-full">
        <Outlet />
      </main>
    </div>
  )
}
