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
import { Inbox, CheckCheck, Dot, ChevronDown } from "lucide-react"
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

/* ----------------------------- Tabs (data) ----------------------------- */

const TABS = [
  { to: "/bus", label: "Bus" },
  { to: "/chauffeurs", label: "Chauffeurs" },
  { to: "/controleurs", label: "Contrôleurs" },
  { to: "/proprietaires", label: "Propriétaires de bus" },
  { to: "/clients", label: "Clients" },
  { to: "/locations", label: "Locations" },
  { to: "/staff", label: "Staff" },
] as const

function TabLink({
  to,
  label,
  hasLeftBorder,
  innerRef,
}: {
  to: string
  label: string
  hasLeftBorder?: boolean
  innerRef?: (el: HTMLAnchorElement | null) => void
}) {
  return (
    <NavLink
      to={to}
      ref={innerRef as any}
      className={({ isActive }) =>
        cn(
          "px-3 inline-flex h-10 items-center select-none transition-colors rounded-none",
          // baseline text + hover for all states
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          // left divider (replaces separators)
          hasLeftBorder && "border-l border-border",
          // active state: lift above bottom border & remove it visually
          isActive &&
            "bg-white text-foreground border-x border-t border-border -mb-[1px] relative z-10"
        )
      }
    >
      {label}
    </NavLink>
  )
}

/* ----------------------- Responsive overflow headbar ---------------------- */

function ResponsiveHeadbar() {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const dropdownMeasureRef = React.useRef<HTMLButtonElement | null>(null)
  const itemRefs = React.useRef<(HTMLAnchorElement | null)[]>([])
  itemRefs.current = []

  const [visibleCount, setVisibleCount] = React.useState(TABS.length)
  const [hasOverflow, setHasOverflow] = React.useState(false)

  const measure = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const available = container.clientWidth
    const ddW = dropdownMeasureRef.current?.offsetWidth ?? 64
    let used = 0
    let count = 0

    for (let i = 0; i < TABS.length; i++) {
      const el = itemRefs.current[i]
      if (!el) continue
      const w = el.offsetWidth
      const remaining = TABS.length - (i + 1)
      const needsDropdown = remaining > 0
      const nextUsed = used + w + (needsDropdown ? ddW : 0)
      if (nextUsed <= available) {
        used += w
        count++
      } else {
        break
      }
    }

    if (count === 0) count = 1
    setVisibleCount(count)
    setHasOverflow(count < TABS.length)
  }, [])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let timeout: NodeJS.Timeout | null = null
    const observer = new ResizeObserver(() => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(measure, 150)
    })
    observer.observe(container)
    window.addEventListener("resize", measure)
    measure()

    return () => {
      if (timeout) clearTimeout(timeout)
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  const visible = TABS.slice(0, visibleCount)
  const overflow = TABS.slice(visibleCount)

  return (
    <div className="z-30 w-full border-b bg-primary/5">
      <div ref={containerRef} className="w-full">
        <div className="flex h-10 items-stretch gap-0 px-4 text-sm">
          {visible.map((t, i) => (
            <TabLink
              key={t.to}
              to={t.to}
              label={t.label}
              hasLeftBorder={i > 0}
              innerRef={(el) => (itemRefs.current[i] = el)}
            />
          ))}

          {/* “Plus” only appears if overflow is true */}
          {hasOverflow && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-10 px-3 rounded-none hover:bg-muted/60 border-l border-border"
                  )}
                  ref={dropdownMeasureRef}
                >
                  Plus <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-1 min-w-56">
                {overflow.map((t) => (
                  <DropdownMenuItem key={t.to} asChild className="rounded-[6px]">
                    <NavLink to={t.to} className="w-full">
                      {t.label}
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}


/* --------------------------------- Header --------------------------------- */

export function SiteHeader() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const unreadCount = notifications.filter((n) => n.unread).length
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  // Center nav: underline active; Données active by default
  const location = useLocation()
  const isLocations = location.pathname.startsWith("/locations")
  const isDataActive = !isLocations

  return (
    <>
      {/* Top header */}
      <header className="relative z-40 flex h-[56px] items-center border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />

        {/* Center nav (Données / Locations) */}
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

      {/* Secondary headbar with responsive overflow (left borders, no separators) */}
      <ResponsiveHeadbar />
    </>
  )
}
