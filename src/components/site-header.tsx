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
import { Inbox, CheckCheck, ChevronDown, Plus, Dot } from "lucide-react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type NotificationItem = {
  id: string
  title: string
  description?: string
  time?: string
  unread?: boolean
  type?: "info" | "success" | "warning" | "error"
}

/* -------------------------------------------------------------------------- */
/*                              Helper Components                             */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                   Header                                   */
/* -------------------------------------------------------------------------- */

const TABS = [
  { to: "/bus", label: "Bus" },
  { to: "/chauffeurs", label: "Chauffeurs" },
  { to: "/controleurs", label: "Contrôleurs" },
  { to: "/proprietaires", label: "Propriétaires de bus" },
  { to: "/clients", label: "Clients" },
  { to: "/locations", label: "Locations" },
  { to: "/staff", label: "Staff" },
] as const

export function SiteHeader() {
  /* ------------------------------ Notifications ----------------------------- */
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const unreadCount = notifications.filter((n) => n.unread).length
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))

  /* --------------------------------- Routing -------------------------------- */
  const { pathname } = useLocation()

  /* --------------------------- Responsive overflow --------------------------- */
  // Only apply overflow logic on small screens; show "Plus" only on small screens.
  const [isSmall, setIsSmall] = React.useState<boolean>(false)
  const [visibleCount, setVisibleCount] = React.useState<number>(TABS.length)
  const [hasOverflow, setHasOverflow] = React.useState<boolean>(false)

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const itemRefs = React.useRef<(HTMLAnchorElement | null)[]>([])
  itemRefs.current = []

  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)")
    const update = () => setIsSmall(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  React.useEffect(() => {
    // If not small, show everything and bail out
    if (!isSmall) {
      setVisibleCount(TABS.length)
      setHasOverflow(false)
      return
    }

    let timeout: ReturnType<typeof setTimeout> | null = null
    const measure = () => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.clientWidth
      // Reserve width for the "Plus" button on small screens (approx 48-56px)
      const reserve = 56

      let acc = 0
      let count = 0
      for (let i = 0; i < TABS.length; i++) {
        const el = itemRefs.current[i]
        const w = (el?.offsetWidth ?? 80) + (i === 0 ? 0 : 1) // +1px for the left border except first
        if (acc + w > containerWidth - reserve) break
        acc += w
        count++
      }

      // Ensure at least 1 tab visible
      count = Math.max(1, count)

      // If the active tab isn't among the visible slice, swap it into view
      const activeIdx = TABS.findIndex((t) => pathname.startsWith(t.to))
      if (activeIdx !== -1 && activeIdx >= count && count > 0) {
        // "force" one spot for the active tab
        count = Math.min(count, TABS.length - 1)
      }

      setVisibleCount(count)
      setHasOverflow(count < TABS.length)
    }

    const run = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(measure, 10)
    }

    run()
    const ro = new ResizeObserver(run)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener("resize", run)
    return () => {
      if (timeout) clearTimeout(timeout)
      ro.disconnect()
      window.removeEventListener("resize", run)
    }
  }, [isSmall, pathname])

  // Build visible/overflow arrays (with active preserved in visible on small)
  const activeIdx = TABS.findIndex((t) => pathname.startsWith(t.to))
  let visibleTabs = TABS.slice(0, visibleCount)
  let overflowTabs = TABS.slice(visibleCount)

  if (isSmall && activeIdx >= visibleCount && activeIdx !== -1 && visibleCount > 0) {
    // replace the last visible with the active tab
    const active = TABS[activeIdx]
    // const lastVisible = visibleTabs[visibleTabs.length - 1]
    visibleTabs = [...TABS.slice(0, visibleCount - 1), active]
    overflowTabs = TABS.filter((t) => !visibleTabs.includes(t))
    // Keep order stable in overflow
  }

  /* --------------------------------- Render --------------------------------- */
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
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center px-1.5 py-1 text-sm font-medium border-b-2 border-transparent transition-colors",
                    "text-black hover:text-foreground",
                    isActive && "border-primary"
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
                    "inline-flex items-center px-1.5 py-1 text-sm font-medium border-b-2 border-transparent transition-colors",
                    "text-black hover:text-foreground",
                    isActive && "border-primary"
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

      {/* Secondary headbar (tabs) */}
      <div className="z-30 w-full border-b bg-background">
        <ScrollArea className="w-full">
          <div
            ref={containerRef}
            className="relative flex h-10 items-stretch px-2 sm:px-4"
          >
            {/* Tabs (always visible; left-borders instead of separators) */}
            {visibleTabs.map((tab, idx) => (
              <TabLink
                key={tab.to}
                to={tab.to}
                label={tab.label}
                hasLeftBorder={idx !== 0}
                innerRef={(el) => (itemRefs.current[idx] = el)}
              />
            ))}

            {/* "Plus" dropdown — only on small screens */}
            {hasOverflow && isSmall && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-9 px-2 sm:hidden hover:bg-muted/60"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Plus
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  {overflowTabs.map((tab) => (
                    <DropdownMenuItem asChild key={tab.to} className="cursor-pointer">
                      <NavLink to={tab.to} className="w-full px-2 py-1.5">
                        {tab.label}
                      </NavLink>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Tab Link                                  */
/* -------------------------------------------------------------------------- */

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
      ref={innerRef}
      to={to}
      className={({ isActive }) =>
        cn(
          // base
          "inline-flex h-10 items-center px-3 text-sm transition-colors rounded-none border-0",
          // left border instead of a visual separator
          hasLeftBorder && "border-l border-border",
          // hover (applies even when active)
          "hover:bg-muted/60",
          // active styling: white bg, borders on top/left/right, NO bottom (by overlapping)
          isActive
            ? "bg-background text-foreground border-x border-t border-border -mb-px"
            : "text-muted-foreground"
        )
      }
    >
      {label}
    </NavLink>
  )
}
