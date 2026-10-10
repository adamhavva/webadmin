"use client";

import * as React from "react";

import {
  ListOrderedIcon,
  Settings,
  MapPin,
} from "lucide-react";

import { NavMain, type NavItem } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const teams = [
  {
    name: "ASCEND Coffee",
    logo: <MapPin className="size-4" />,
    plan: "Enterprise",
  },
];

// =============================================================
// NAVIGATION ITEMS
// Simplified: Order, Maps, Pengaturan
// =============================================================
const navigation: NavItem[] = [
  {
    title: "Order",
    description: "Kelola semua pesanan customer",
    url: "/orders",
    icon: <ListOrderedIcon className="size-4" strokeWidth={1.8} />,
  },
  {
    title: "Maps",
    description: "Peta lokasi barista real-time",
    url: "/maps",
    icon: <MapPin className="size-4" strokeWidth={1.8} />,
  },
];

// =============================================================
// SYSTEM
// =============================================================
const system: NavItem[] = [
  {
    title: "Pengaturan",
    description: "Konfigurasi global aplikasi",
    url: "/settings",
    icon: <Settings className="size-4" strokeWidth={1.8} />,
  },
];

// =============================================================
// MAIN COMPONENT
// =============================================================

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r bg-sidebar"
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <TeamSwitcher teams={teams} />
      </SidebarHeader>

      <SidebarContent className="gap-1 overflow-y-auto px-2 py-3">
        {/* Main Navigation */}
        <NavMain items={navigation} />

        {/* Sistem */}
        <SidebarGroup className="px-0 mt-4">
          <SidebarGroupLabel>Sistem</SidebarGroupLabel>
          <NavMain items={system} />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}