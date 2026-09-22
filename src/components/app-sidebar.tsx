"use client"

import * as React from "react"

import {
  Boxes,
  ClipboardList,
  Factory,
  GalleryVerticalEnd,
  History,
  Layers3,
  LayoutDashboard,
  Package,
  PackageCheck,
  PackagePlus,
  Plus,
  ScrollText,
} from "lucide-react"

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
  user: {
    name: "Admin",
    email: "admin@ascend.com",
    avatar: "/avatars/admin.jpg",
  },

  teams: [
    {
      name: "ASCEND Coffee",
      logo: <GalleryVerticalEnd className="size-4" />,
      plan: "Enterprise",
    },
  ],

  navMain: [
    // =========================================================
    // DASHBOARD
    // =========================================================
    {
      title: "Dashboard",
      description: "Ringkasan aktivitas ASCEND",
      url: "/",
      icon: (
        <LayoutDashboard
          className="size-[18px] shrink-0"
          strokeWidth={1.8}
        />
      ),
    },

    // =========================================================
    // PERSEDIAAN
    // Urutan mengikuti proses bisnis:
    // Bahan → Pengadaan → Batch → Resep → Produksi → Produk Jadi
    // =========================================================
    {
      title: "Persediaan",
      description: "Kelola bahan, produksi, dan stok",
      url: "#",
      icon: (
        <Boxes
          className="size-[18px] shrink-0"
          strokeWidth={1.8}
        />
      ),
      items: [
        // =====================================================
        // 1. BAHAN BAKU
        // =====================================================
        {
          title: "Bahan Baku",
          description: "Kelola bahan yang digunakan",
          url: "#",
          icon: (
            <Package
              className="size-4 shrink-0"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Daftar Bahan",
              description: "Lihat seluruh bahan baku",
              url: "/inventory/items",
              icon: (
                <ClipboardList
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
            {
              title: "Tambah Bahan",
              description: "Tambahkan bahan baku baru",
              url: "/inventory/items/new",
              icon: (
                <Plus
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
          ],
        },

        // =====================================================
        // 2. PENGADAAN
        // =====================================================
        {
          title: "Pengadaan",
          description: "Beli dan terima bahan baku",
          url: "#",
          icon: (
            <PackagePlus
              className="size-4 shrink-0"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Riwayat Pengadaan",
              description: "Lihat transaksi pengadaan",
              url: "/inventory/restocks",
              icon: (
                <History
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
            {
              title: "Penerimaan Barang",
              description: "Catat bahan yang diterima",
              url: "/inventory/restocks/new",
              icon: (
                <PackageCheck
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
          ],
        },

        // =====================================================
        // 3. BATCH BAHAN
        // =====================================================
        {
          title: "Batch Bahan",
          description: "Lihat stok setiap batch bahan",
          url: "/inventory/batches",
          icon: (
            <Layers3
              className="size-4 shrink-0"
              strokeWidth={1.8}
            />
          ),
        },

        // =====================================================
        // 4. RESEP
        // =====================================================
        {
          title: "Resep",
          description: "Atur bahan untuk setiap produk",
          url: "#",
          icon: (
            <ScrollText
              className="size-4 shrink-0"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Daftar Resep",
              description: "Lihat seluruh resep produk",
              url: "/inventory/recipes",
              icon: (
                <ClipboardList
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
            {
              title: "Tambah Resep",
              description: "Buat resep produk baru",
              url: "/inventory/recipes/new",
              icon: (
                <Plus
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
          ],
        },

        // =====================================================
        // 5. PRODUKSI
        // =====================================================
        {
          title: "Produksi",
          description: "Ubah bahan menjadi produk jadi",
          url: "#",
          icon: (
            <Factory
              className="size-4 shrink-0"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Riwayat Produksi",
              description: "Lihat seluruh aktivitas produksi",
              url: "/inventory/production",
              icon: (
                <History
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
            {
              title: "Buat Produksi",
              description: "Catat produksi produk baru",
              url: "/inventory/production/new",
              icon: (
                <Plus
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
            },
          ],
        },

        // =====================================================
        // 6. PRODUK JADI
        // =====================================================
        {
          title: "Produk Jadi",
          description: "Kelola stok produk siap dijual",
          url: "#",
          icon: (
            <PackageCheck
              className="size-4 shrink-0"
              strokeWidth={1.8}
            />
          ),
          items: [
            {
              title: "Stok Produk Jadi",
              description: "Lihat stok produk hasil produksi",
              url: "/inventory/finished-products",
              icon: (
                <ClipboardList
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
              ),
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
      variant="sidebar"
      className="border-r bg-background"
      {...props}
    >
      <SidebarHeader
        className="
          border-b
          px-2
          py-3
          group-data-[collapsible=icon]:px-2
        "
      >
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>

      <SidebarContent
        className="
          px-2
          py-3
          group-data-[collapsible=icon]:px-1
        "
      >
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter
        className="
          border-t
          px-2
          py-3
          group-data-[collapsible=icon]:px-2
        "
      >
        <NavUser user={data.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}