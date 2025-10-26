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
import { cn } from "@/lib/utils"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      // Fixed + compact: never collapses
      collapsible="none"
      className={cn(
        // narrow rail-style width
        "w-[68px] data-[state=expanded]:w-[68px] data-[state=collapsed]:w-[68px]",
        "border-r"
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
          {/* Dashboard only (icon, no text) */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="justify-center p-2" tooltip="Tableau de bord">
              <NavLink to="/overview" aria-label="Tableau de bord" title="Tableau de bord">
                <IconGauge className="h-5 w-5" />
                <span className="sr-only">Tableau de bord</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Divider-ish spacing */}
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

          {/* Notifications (icon only, works like nav link, no badge) */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="justify-center p-2" tooltip="Notifications">
              <NavLink to="/notifications" aria-label="Notifications" title="Notifications">
                <IconBell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      {/* Bottom: avatar only (dropdown on click) */}
      <SidebarFooter className="p-2">
        {/* NavUser already handles its dropdown; we keep only the avatar visually */}
        <NavUser compact />
      </SidebarFooter>
    </Sidebar>
  )
}
