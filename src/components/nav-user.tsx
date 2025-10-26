// src/components/nav-user.tsx
"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import {
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"

/** Create initials like "CN" from a name */
function getInitials(name?: string) {
  if (!name) return "??"
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : ""
  return (first + last).toUpperCase() || name.slice(0, 2).toUpperCase()
}

type UserWithAvatar = {
  id: string
  name: string
  email: string
  role?: string
  avatar?: string | null
}

export function NavUser({ compact = false }: { compact?: boolean }) {
  const { isMobile } = useSidebar()
  const { status, user, logout } = useAuth()

  if (status === "loading") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center justify-center p-2">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!user) return null

  const u = user as UserWithAvatar
  const initials = getInitials(u.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* Avatar-only trigger (no name/email, stays compact) */}
            <SidebarMenuButton
              size="lg"
              className="justify-center p-2"
              aria-label="Ouvrir le menu utilisateur"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                {u.avatar ? (
                  <AvatarImage src={u.avatar} alt={u.name} />
                ) : (
                  <AvatarImage src="" alt={u.name} />
                )}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {u.avatar ? (
                    <AvatarImage src={u.avatar} alt={u.name} />
                  ) : (
                    <AvatarImage src="" alt={u.name} />
                  )}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{u.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{u.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/account" className="flex items-center gap-2">
                  <IconUserCircle />
                  Mon compte
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                logout()
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <IconLogout />
                Me déconnecter
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
