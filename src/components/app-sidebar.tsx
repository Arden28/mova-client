// src/components/AppSidebar.tsx
"use client"

import * as React from "react"
import { NavLink } from "react-router-dom"
import {
  IconGauge,
  IconSettings,
  IconBell,
} from "@tabler/icons-react"

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
  // Local notifications state (you can wire this to your store/api if needed)
  const [notifications, setNotifications] = React.useState<Notice[]>([])
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  return (
    <Sidebar
      // Keep the original off-canvas behavior on mobile so the trigger can open it
      collapsible="offcanvas"
      className={cn(
        // fixed, compact rail width on desktop
        "w-[68px] data-[state=expanded]:w-[68px] data-[state=collapsed]:w-[68px]",
        // ensure full height and proper border
        "border-r h-screen sticky top-0"
      )}
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
                  width={40}
                  height={40}
                  className="rounded-md mx-auto"
                />
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Middle: icons only */}
      <SidebarContent className="px-0">
        <SidebarMenu className="gap-1">
          {/* Dashboard (icon only) */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="justify-center p-2" tooltip="Tableau de bord">
              <NavLink to="/overview" aria-label="Tableau de bord" title="Tableau de bord">
                <IconGauge className="h-5 w-5" />
                <span className="sr-only">Tableau de bord</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Spacer */}
          <div className="my-2" />

          {/* Settings (icon only) */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="justify-center p-2" tooltip="Paramètres">
              <NavLink to="/settings" aria-label="Paramètres" title="Paramètres">
                <IconSettings className="h-5 w-5" />
                <span className="sr-only">Paramètres</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Notifications (icon only, opens panel here; no badge) */}
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton
                  className="justify-center p-2"
                  aria-label="Notifications"
                  title="Notifications"
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
                      {notifications.some((n) => n.unread)
                        ? `${notifications.filter((n) => n.unread).length} non lue(s)`
                        : "Aucune non lue"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={markAllRead}
                    disabled={!notifications.some((n) => n.unread)}
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
        </SidebarMenu>
      </SidebarContent>

      {/* Bottom: avatar-only (dropdown intact) */}
      <SidebarFooter className="p-2">
        <NavUser compact />
      </SidebarFooter>
    </Sidebar>
  )
}
