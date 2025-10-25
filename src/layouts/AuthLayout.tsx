import * as React from "react"
import { Outlet } from "react-router-dom"

export default function AuthLayout() {
  return (
    <div className="">
        <React.Suspense fallback={null}>
          <Outlet />
        </React.Suspense>
    </div>
  )
}
