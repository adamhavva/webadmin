"use client"

import * as React from "react"

import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

import {
  Boxes,
  Factory,
  GalleryVerticalEnd,
  LayoutDashboard,
  Package,
  PackagePlus,
} from "lucide-react"

const data: {
  user: {
    name: string
    email: string
    avatar: string
  }
  teams: {
    name: string
    logo: React.ReactNode
    plan: string
  }[]
  navMain: NavItem[]
} = {
  /*
    Data user yang ditampilkan pada bagian bawah sidebar.
  */
  user: {
    name: "Admin",
    email: "admin@ascend.com",
    avatar: "/avatars/admin.jpg",
  },

  /*
    Workspace ASCEND yang ditampilkan pada bagian atas sidebar.
  */
  teams: [
    {
      name: "ASCEND Coffee",
      logo: <GalleryVerticalEnd className="size-4" />,
      plan: "Enterprise",
    },
  ],

  /*
    Navigasi yang tersedia saat ini hanya untuk
    fitur yang memang sudah kita kembangkan.
  */
  navMain: [
    /*
      Dashboard utama.
    */
    {
      title: "Dashboard",
      url: "/",
      icon: (
        <LayoutDashboard
          className="size-[18px]"
          strokeWidth={1.8}
        />
      ),
    },

    /*
      Modul persediaan ASCEND.

      Struktur:
      - Bahan
      - Restock
      - Produksi

      Batch tidak ditampilkan sebagai menu karena
      batch dibuat otomatis oleh Restock atau Produksi.
    */
    {
      title: "Persediaan",
      url: "#",
      icon: (
        <Boxes
          className="size-[18px]"
          strokeWidth={1.8}
        />
      ),
      items: [
        /*
          Master Inventory Item.

          Halaman ini hanya mengelola master bahan:
          nama, tipe, satuan, dan status aktif.
        */
        {
          title: "Bahan",
          url: "#",
          icon: (
            <Package
              className="size-4"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Semua Bahan",
              url: "/inventory/items",
            },
            {
              title: "Tambah Bahan",
              url: "/inventory/items/new",
            },
          ],
        },

        /*
          Restock.

          Admin memasukkan stok dan harga pembelian
          melalui modul ini.

          Backend kemudian otomatis membuat batch.
        */
        {
          title: "Restock",
          url: "#",
          icon: (
            <PackagePlus
              className="size-4"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Semua Restock",
              url: "/inventory/restocks",
            },
            {
              title: "Tambah Restock",
              url: "/inventory/restocks/new",
            },
          ],
        },

        /*
          Produksi.

          Digunakan untuk mencatat proses produksi
          semi-finished inventory seperti Espresso.

          Batch hasil produksi dibuat otomatis oleh backend.
        */
        {
          title: "Produksi",
          url: "#",
          icon: (
            <Factory
              className="size-4"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Semua Produksi",
              url: "/inventory/production",
            },
            {
              title: "Tambah Produksi",
              url: "/inventory/production/new",
            },
          ],
        },
      ],
    },
  ],
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SidebarHeader className="px-2 pt-3">
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        <NavUser user={data.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}