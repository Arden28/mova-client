"use client"

import * as React from "react"
import { NavLink } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { IconBell } from "@tabler/icons-react"
import { Inbox, CheckCheck, Dot } from "lucide-react"
import { cn } from "@/lib/utils"

type NotificationItem = {
  id: string
  title: string
  description?: string
  time?: string
  unread?: boolean
  type?: "info" | "success" | "warning" | "error"
}

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

export function SiteHeader() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const unreadCount = notifications.filter((n) => n.unread).length
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  return (
    <>
      {/* Main header */}
      <header className="relative z-40 flex h-[56px] items-center border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
        {/* Left: Sidebar trigger */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
        </div>

        {/* Center: plain nav, underline primary when active */}
        <nav className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
          <ul className="flex items-center gap-6">
            <li>
              <NavLink
                to="/data"
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center px-1.5 py-1 text-sm font-medium",
                    "text-muted-foreground hover:text-foreground transition-colors",
                    "border-b-2 border-transparent",
                    isActive && "text-primary border-primary"
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
                    "inline-flex items-center px-1.5 py-1 text-sm font-medium",
                    "text-muted-foreground hover:text-foreground transition-colors",
                    "border-b-2 border-transparent",
                    isActive && "text-primary border-primary"
                  )
                }
              >
                Locations
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Right: Notifications */}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative",
                  "hover:bg-accent hover:text-accent-foreground",
                  "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
                )}
              >
                <IconBell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className={cn(
                "w-80 p-0",
                "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              )}
            >
              {/* Header */}
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

              {/* List / Empty */}
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

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2">
                <Button variant="ghost" size="sm">
                  Voir tout
                </Button>
                <Button variant="outline" size="sm" onClick={() => setNotifications([])}>
                  Vider
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Secondary headbar (full width, links separated by |, no rounded/borders) */}
      <div className="z-30 w-full border-b bg-primary/5">
        <div className="mx-auto w-full max-w-screen-2xl px-4">
          <div className="flex h-10 items-center justify-center overflow-x-auto whitespace-nowrap text-sm">
            <NavItem to="/bus" label="Bus" />
            <SeparatorPipe />
            <NavItem to="/chauffeurs" label="Chauffeurs" />
            <SeparatorPipe />
            <NavItem to="/controleurs" label="Contrôleurs" />
            <SeparatorPipe />
            <NavItem to="/proprietaires" label="Propriétaires de bus" />
            <SeparatorPipe />
            <NavItem to="/clients" label="Clients" />
            <SeparatorPipe />
            <NavItem to="/activites" label="Activités" />
            <SeparatorPipe />
            <NavItem to="/locations" label="Locations" />
            <SeparatorPipe />
            <NavItem to="/staff" label="Staff" />
          </div>
        </div>
      </div>
    </>
  )
}

/* --- Small helper components for the secondary headbar --- */

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "px-2 py-1 text-muted-foreground hover:text-foreground transition-colors",
          "border-b-2 border-transparent",
          isActive && "text-primary border-primary"
        )
      }
    >
      {label}
    </NavLink>
  )
}

function SeparatorPipe() {
  return <span className="px-2 text-muted-foreground/70" aria-hidden>|</span>
}
