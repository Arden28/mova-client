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

/** If you already have shadcn's Empty component, you can use:
 * import { Empty } from "@/components/ui/empty"
 * and replace <EmptyState ... /> with <Empty ... />
 */

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
  // Replace with your store / props as needed
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const unreadCount = notifications.filter((n) => n.unread).length
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  return (
    <header className="relative z-40 flex h-[56px] items-center border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
      {/* Left: Sidebar trigger (like Airtable’s hamburger) */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
      </div>

      {/* Center: Airtable-like top nav */}
      <nav className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
        <ul className="flex items-center gap-6 rounded-full bg-background/70 px-3 py-1.5 ring-1 ring-border shadow-sm">
          <li>
            <NavLink
              to="/data"
              className={({ isActive }) =>
                cn(
                  "relative rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-[2px] after:w-0 after:bg-primary after:transition-all",
                  isActive
                    ? "text-foreground after:w-[calc(100%-1rem)]"
                    : "hover:after:w-[calc(100%-1rem)]"
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
                  "relative rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-[2px] after:w-0 after:bg-primary after:transition-all",
                  isActive
                    ? "text-foreground after:w-[calc(100%-1rem)]"
                    : "hover:after:w-[calc(100%-1rem)]"
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
  )
}
