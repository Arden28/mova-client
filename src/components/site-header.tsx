// src/components/SiteHeader.tsx
"use client"

import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

/* ----------------------------- Tabs (data) ----------------------------- */
const TABS = [
  { to: "/buses", label: "Bus" },
  { to: "/people", label: "Chauffeurs & Propriétaires" },
  { to: "/reservations", label: "Locations" },
  { to: "/staff", label: "Staff" },
] as const

/* ----------------------------- Secondary navbar ----------------------------- */
function SecondaryHeadbar() {
  return (
    <div className="z-30 w-full border-b bg-primary/5">
      <div className="flex items-center justify-between px-4 sm:px-6 h-10 text-sm">
        {/* Visible links on medium+ screens */}
        <div className="hidden md:flex items-center gap-4">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cn(
                  "inline-flex h-10 items-center px-2 font-medium transition-colors border-b-2",
                  "border-transparent hover:text-foreground text-muted-foreground",
                  isActive && "text-foreground border-primary"
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>

        {/* Dropdown for small screens */}
        <div className="flex md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-sm">
                <MoreHorizontal className="h-4 w-4" />
                <span>Plus</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-1 min-w-48">
              {TABS.map((t) => (
                <DropdownMenuItem key={t.to} asChild className="rounded-md">
                  <NavLink
                    to={t.to}
                    className={({ isActive }) =>
                      cn(
                        "w-full px-2 py-1.5 rounded-md transition-colors",
                        isActive ? "bg-accent text-foreground" : "hover:bg-accent/60 text-muted-foreground"
                      )
                    }
                  >
                    {t.label}
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Main Header ----------------------------- */
export function SiteHeader() {
  const location = useLocation()
  const isLocations = location.pathname.startsWith("/locations")
  const isDataActive = !isLocations

  return (
    <>
      {/* Top header */}
      <header className="relative z-40 flex h-[56px] items-center border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
        {/* No SidebarTrigger (sidebar is fixed compact) */}

        {/* Center nav */}
        <nav className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
          <ul className="flex items-center gap-6">
            <li>
              <NavLink
                to="/"
                className={() =>
                  cn(
                    "inline-flex items-center px-1.5 py-1 text-sm font-medium border-b-2 transition-colors",
                    isDataActive
                      ? "text-foreground border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )
                }
              >
                Données
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/reservations/map"
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center px-1.5 py-1 text-sm font-medium border-b-2 transition-colors",
                    (isActive || isLocations)
                      ? "text-foreground border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )
                }
              >
                Locations
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Right side — intentionally empty (notifications moved to sidebar) */}
        <div className="ml-auto flex items-center gap-2" />
      </header>

      {/* Clean, responsive second nav */}
      <SecondaryHeadbar />
    </>
  )
}
