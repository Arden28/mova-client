"use client"

import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { IconBell } from "@tabler/icons-react"
import { Inbox, CheckCheck, Dot, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

/* ----------------------------- Tabs (data) ----------------------------- */

const TABS = [
  { to: "/buses", label: "Bus" },
  { to: "/people", label: "Chauffeurs & Propriétaires" },
  { to: "/reservations", label: "Locations" },
  { to: "/staff", label: "Staff" },
] as const

/* ----------------------------- Empty state ----------------------------- */

function EmptyState({
  title = "Aucune notification",
  description = "Tout est calme pour le moment.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="rounded-full ring-1 ring-border p-3">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

/* ----------------------------- Secondary navbar ----------------------------- */

function SecondaryHeadbar() {
  return (
    <div className="z-30 w-full border-b bg-primary/5">
      <div className="flex items-center justify-between px-4 sm:px-6 h-10 text-sm">
        {/* Visible links on medium+ screens */}
        <div className="hidden md:flex items-center gap-4">
          {TABS.map((t, i) => (
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
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-sm"
              >
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
                        isActive
                          ? "bg-accent text-foreground"
                          : "hover:bg-accent/60 text-muted-foreground"
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
  const [notifications, setNotifications] = React.useState<
    {
      id: string
      title: string
      description?: string
      time?: string
      unread?: boolean
      type?: "info" | "success" | "warning" | "error"
    }[]
  >([])

  const unreadCount = notifications.filter((n) => n.unread).length
  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  const location = useLocation()
  const isLocations = location.pathname.startsWith("/locations")
  const isDataActive = !isLocations

  return (
    <>
      {/* Top header */}
      <header className="relative z-40 flex h-[56px] items-center border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />

        {/* Center nav */}
        <nav className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
          <ul className="flex items-center gap-6">
            <li>
              <NavLink
                to="/data"
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
                to="/locations"
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

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-accent hover:text-accent-foreground"
              >
                <IconBell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0
                      ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                      : "Aucune non lue"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Tout marquer lu</span>
                </Button>
              </div>

              {notifications.length === 0 ? (
                <EmptyState />
              ) : (
                <ScrollArea className="max-h-80">
                  <ul className="divide-y">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={cn(
                          "flex items-start gap-3 p-4 transition-colors hover:bg-accent/40",
                          n.unread && "bg-accent/20"
                        )}
                      >
                        <div className="pt-0.5">
                          <Badge
                            variant={
                              n.type === "success"
                                ? "default"
                                : n.type === "warning"
                                ? "secondary"
                                : n.type === "error"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {n.type ?? "info"}
                          </Badge>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-5">{n.title}</p>
                          {n.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            {n.unread && <Dot className="h-4 w-4" />}
                            {n.time && <span>{n.time}</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Clean, responsive second nav */}
      <SecondaryHeadbar />
    </>
  )
}
