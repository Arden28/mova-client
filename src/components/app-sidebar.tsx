// src/components/AppSidebar.tsx
"use client"

import * as React from "react"
import { NavLink } from "react-router-dom"
import { IconGauge, IconBell } from "@tabler/icons-react"

import useAuth from "@/hooks/useAuth"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

/* -------------------- Notifications panel (moved from header) -------------------- */

type NoticeType = "info" | "success" | "warning" | "error"

type Notice = {
  id: string
  title: string
  description?: string
  time?: string
  unread?: boolean
  type?: NoticeType
}

function EmptyState({
  title = "Aucune notification",
  description = "Tout est calme pour le moment.",
}: { title?: string; description?: string }) {
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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const role = (user?.role ?? "").toString().toLowerCase()
  const isAdmin = role === "admin" || role === "superadmin"

  // Local notifications state (wire to store/api if needed)
  const [notifications, setNotifications] = React.useState<Notice[]>([])
  const unreadCount = notifications.filter((n) => n.unread).length
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  return (
    <Sidebar
      collapsible="offcanvas"
      className="w-[68px] border-r h-screen sticky top-0"
      {...props}
    >
      {/* Top: Logo only (no text) */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="justify-center p-2">
              <NavLink to="/" aria-label="Accueil">
                <img
                  src="/assets/images/logo.png"
                  alt="Mova"
                  width={50}
                  height={50}
                  className="rounded-md mx-auto"
                />
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Middle: icons-only primary nav */}
      <SidebarContent className="px-0">
        <SidebarMenu className="gap-1">
          {/* Dashboard (icon only) — admin only */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="justify-center p-2"
                tooltip="Tableau de bord"
              >
                <NavLink to="/overview" aria-label="Tableau de bord" title="Tableau de bord">
                  <IconGauge className="h-5 w-5" />
                  <span className="sr-only">Tableau de bord</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      {/* Bottom: notifications + (admin-only) settings + user avatar */}
      <SidebarFooter className="p-2 mt-auto">
        <SidebarMenu className="gap-1">
          {/* Notifications (icon only, opens panel here; no badge) */}
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton
                  className="justify-center p-2"
                  aria-label="Notifications"
                  title="Notifications"
                  tooltip="Notifications"
                >
                  <IconBell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-80 p-0"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Aucune non lue"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={markAllRead}
                    disabled={unreadCount === 0}
                  >
                    Tout marquer lu
                  </button>
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
                              {n.time && <span>{n.time}</span>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>

          {/* User avatar (dropdown intact) */}
          <SidebarMenuItem>
            {/* No `compact` prop required; NavUser handles its own layout */}
            <NavUser />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
