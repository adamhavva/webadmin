"use client"

import * as React from "react"

import {
  Archive,
  BookOpen,
  Boxes,
  ClipboardList,
  Coffee,
  Factory,
  GalleryVerticalEnd,
  History,
  LayoutDashboard,
  Layers,
  Package,
  PackageCheck,
  PackagePlus,
  Play,
  Plus,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  UserCog,
  UserPlus,
  Users,
  Warehouse,
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
  teams: {
    name: string
    logo: React.ReactNode
    plan: string
  }[]
  navMain: NavItem[]
} = {
  teams: [
    {
      name: "ASCEND Coffee",
      logo: <GalleryVerticalEnd className="size-4" />,
      plan: "Enterprise",
    },
  ],

  navMain: [
    // =========================================================
    // 0. DASHBOARD
    // =========================================================
    {
      title: "Dashboard",
      description: "Ringkasan aktivitas ASCEND",
      url: "/",
      icon: <LayoutDashboard className="size-[18px]" strokeWidth={1.8} />,
    },

    // =========================================================
    // 1. PERSEDIAAN
    // =========================================================
    {
      title: "Persediaan",
      description: "Kelola bahan, produk, resep, dan produksi",
      url: "#",
      icon: <Warehouse className="size-[18px]" strokeWidth={1.8} />,
      defaultOpen: true,
      items: [
        // ---------- 1.1 Bahan Baku ----------
        {
          title: "Bahan Baku",
          description: "Kelola bahan yang digunakan",
          url: "#",
          icon: <Package className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Daftar Bahan",
              description: "Lihat seluruh bahan baku",
              url: "/inventory/items",
              icon: <ClipboardList className="size-4" strokeWidth={1.8} />,
            },
            {
              title: "Tambah Bahan",
              description: "Tambahkan bahan baku baru",
              url: "/inventory/items/new",
              icon: <PackagePlus className="size-4" strokeWidth={1.8} />,
            },
          ],
        },

        // ---------- 1.2 Pengadaan ----------
        {
          title: "Pengadaan",
          description: "Beli dan terima bahan baku",
          url: "#",
          icon: <ShoppingCart className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Riwayat Pengadaan",
              description: "Lihat transaksi pengadaan",
              url: "/inventory/restocks",
              icon: <History className="size-4" strokeWidth={1.8} />,
            },
            {
              title: "Penerimaan Barang",
              description: "Catat bahan yang diterima",
              url: "/inventory/restocks/new",
              icon: <PackageCheck className="size-4" strokeWidth={1.8} />,
            },
          ],
        },

        // ---------- 1.3 Batch Bahan ----------
        {
          title: "Batch Bahan",
          description: "Lihat stok setiap batch bahan",
          url: "/inventory/batches",
          icon: <Layers className="size-4" strokeWidth={1.8} />,
        },

        // ---------- 1.4 Produk ----------
        {
          title: "Produk",
          description: "Kelola produk yang dijual",
          url: "#",
          icon: <Coffee className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Daftar Produk",
              description: "Lihat seluruh produk",
              url: "/inventory/products",
              icon: <ClipboardList className="size-4" strokeWidth={1.8} />,
            },
            {
              title: "Tambah Produk",
              description: "Tambahkan produk baru",
              url: "/inventory/products/new",
              icon: <Plus className="size-4" strokeWidth={1.8} />,
            },
          ],
        },

        // ---------- 1.5 Resep ----------
        {
          title: "Resep",
          description: "Atur bahan untuk setiap produk",
          url: "#",
          icon: <BookOpen className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Daftar Resep",
              description: "Lihat seluruh resep produk",
              url: "/inventory/recipes",
              icon: <ClipboardList className="size-4" strokeWidth={1.8} />,
            },
            {
              title: "Tambah Resep",
              description: "Buat resep produk baru",
              url: "/inventory/recipes/new",
              icon: <Plus className="size-4" strokeWidth={1.8} />,
            },
          ],
        },

        // ---------- 1.6 Produksi ----------
        {
          title: "Produksi",
          description: "Ubah bahan menjadi produk jadi",
          url: "#",
          icon: <Factory className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Riwayat Produksi",
              description: "Lihat seluruh aktivitas produksi",
              url: "/inventory/production",
              icon: <History className="size-4" strokeWidth={1.8} />,
            },
            {
              title: "Buat Produksi",
              description: "Catat produksi produk baru",
              url: "/inventory/production/new",
              icon: <Play className="size-4" strokeWidth={1.8} />,
            },
          ],
        },

        // ---------- 1.7 Produk Jadi ----------
        {
          title: "Produk Jadi",
          description: "Kelola stok produk siap dijual",
          url: "#",
          icon: <Boxes className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Stok Produk Jadi",
              description: "Lihat stok produk hasil produksi",
              url: "/inventory/finished-products",
              icon: <Archive className="size-4" strokeWidth={1.8} />,
            },
          ],
        },
      ],
    },

    // =========================================================
    // 2. ADMINISTRASI
    // =========================================================
    {
      title: "Administrasi",
      description: "Kelola pengguna dan akses sistem",
      url: "#",
      icon: <Settings2 className="size-[18px]" strokeWidth={1.8} />,
      defaultOpen: true,
      items: [
        // ---------- 2.1 Management User ----------
        {
          title: "Management User",
          description: "Kelola akun Barista dan Customer",
          url: "#",
          icon: <UserCog className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Daftar Pengguna",
              description: "Lihat Barista dan Customer",
              url: "/users",
              icon: <Users className="size-4" strokeWidth={1.8} />,
            },
            {
              title: "Tambah Pengguna",
              description: "Buat akun Barista atau Customer",
              url: "/users/new",
              icon: <UserPlus className="size-4" strokeWidth={1.8} />,
            },
          ],
        },

        // ---------- 2.2 Admin ----------
        {
          title: "Admin",
          description: "Kelola akun administrator",
          url: "#",
          icon: <ShieldCheck className="size-4" strokeWidth={1.8} />,
          defaultOpen: true,
          items: [
            {
              title: "Daftar Admin",
              description: "Lihat seluruh administrator",
              url: "/admins",
              icon: <Users className="size-4" strokeWidth={1.8} />,
            },
            {
              title: "Tambah Admin",
              description: "Buat akun administrator baru",
              url: "/admins/new",
              icon: <UserPlus className="size-4" strokeWidth={1.8} />,
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
      className="border-r bg-sidebar"
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>

      <SidebarContent className="gap-0 overflow-y-auto px-2 py-3">
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}