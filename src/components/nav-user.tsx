// src/components/layout/NavUser.tsx
import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react"
import { Link } from "react-router-dom"
import * as React from "react"


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

/** Optional avatar property on the user object */
type UserWithAvatar = {
  id: string
  name: string
  email: string
  role?: string
  avatar?: string | null
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { status, user, logout } = useAuth()

  // While auth is resolving, you can render a lightweight skeleton (or nothing)
  if (status === "loading") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-36 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // If not authenticated, don't render the user menu at all
  if (!user) return null

  const u = user as UserWithAvatar
  const initials = getInitials(u.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                {/* If you later store avatar in profile, it will render here */}
                {u.avatar ? (
                  <AvatarImage src={u.avatar} alt={u.name} />
                ) : (
                  <AvatarImage src="" alt={u.name} />
                )}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{u.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {u.email}
                </span>
              </div>

              <IconDotsVertical className="ml-auto size-4" />
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
                  <span className="text-muted-foreground truncate text-xs">
                    {u.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/account" className="flex items-center gap-2 hover:bg-gray-100">
                  <IconUserCircle />
                  Mon compte
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Call real logout from AuthContext */}
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
