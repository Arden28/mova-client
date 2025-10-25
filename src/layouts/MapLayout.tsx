"use client"

import * as React from "react"
import { Outlet } from "react-router-dom"
import "mapbox-gl/dist/mapbox-gl.css"

export default function MapLayout() {
  return (
    // Fill the viewport no matter what
    <div className="fixed inset-0 bg-background">
      <main className="h-full w-full">
        <Outlet />
      </main>
    </div>
  )
}
