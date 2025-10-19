"use client"

import * as React from "react"
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
import { Bell, CheckCheck, Inbox, Dot } from "lucide-react"
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
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([
    // Sample data — remove in production
    // { id: "1", title: "Nouvelle réservation", description: "Réservation #FG-1932 confirmée", time: "Il y a 2 min", unread: true, type: "success" },
    // { id: "2", title: "Paiement reçu", description: "KSh 12,000 crédités", time: "Il y a 1 h", unread: false, type: "info" },
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />

        <div className="ml-auto flex items-center gap-2">
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative",
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
                // smooth open/close
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
                          "flex items-start gap-3 p-4 hover:bg-accent/40 transition-colors",
                          n.unread && "bg-accent/20"
                        )}
                        // onClick={() => ... navigate/mark single as read }
                      >
                        {/* Type badge */}
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
                          <p className="text-sm font-medium leading-5">
                            {n.title}
                          </p>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotifications([])}
                >
                  Vider
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
