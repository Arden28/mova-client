// import Image from "next/image";
import * as React from "react";
import {
  IconHelp,
  IconBus,
  IconGauge,
  IconSettings,
  IconTicket,
  IconUsersGroup,
  IconUserCog,
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Arden BOUET",
    email: "admin@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    { title: "Tableau de bord", url: "/overview", icon: IconGauge },
    { title: "Réservations", url: "/reservations", icon: IconTicket },
    { title: "Bus", url: "/buses", icon: IconBus },
    { title: "Chauffeurs & Propriétaires", url: "/people", icon: IconUsersGroup },
    { title: "Staff", url: "/staff", icon: IconUserCog },
  ],
  navSecondary: [
    {
      title: "Paramètres",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Aide",
      url: "#",
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#" className="flex items-center gap-2">
                <img
                  src="/assets/images/logo.png"
                  alt="Mova Logo"
                  width={50}
                  height={50}
                  className="rounded-md"
                />
                <span className="text-base font-semibold">Mova Manager</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
