"use client";

import * as React from "react";

import {
  BarChart3,
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
  Play,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
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
    logo: <GalleryVerticalEnd className="size-4" />,
    plan: "Enterprise",
  },
];

// =============================================================
// DASHBOARD — berdiri sendiri
// =============================================================
const dashboard: NavItem = {
  title: "Dashboard",
  description: "Ringkasan aktivitas ASCEND",
  url: "/",
  icon: <LayoutDashboard className="size-[18px]" strokeWidth={1.8} />,
};

// =============================================================
// ALUR PERSEDIAAN
// Urutan mengikuti flow bisnis:
// Bahan Baku → Pengadaan → Batch → Produk → Resep → Produksi → Produk Jadi
// Hanya 2 level (parent + leaf).
// =============================================================
const inventoryFlow: NavItem[] = [
  {
    title: "Bahan Baku",
    description: "Kelola bahan yang digunakan",
    url: "#",
    icon: <Package className="size-4" strokeWidth={1.8} />,
    items: [
      {
        title: "Daftar Bahan",
        description: "Lihat seluruh bahan baku",
        url: "/inventory/items",
        icon: <ClipboardList className="size-4" strokeWidth={1.8} />,
      },
      {
        title: "Batch Bahan",
        description: "Lihat stok per batch bahan",
        url: "/inventory/batches",
        icon: <Layers className="size-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    title: "Pengadaan",
    description: "Beli dan terima bahan baku",
    url: "#",
    icon: <ShoppingCart className="size-4" strokeWidth={1.8} />,
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
  {
    title: "Produk",
    description: "Kelola produk yang dijual",
    url: "#",
    icon: <Coffee className="size-4" strokeWidth={1.8} />,
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
        icon: <Package className="size-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    title: "Resep",
    description: "Atur bahan untuk setiap produk",
    url: "#",
    icon: <BookOpen className="size-4" strokeWidth={1.8} />,
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
        icon: <BookOpen className="size-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    title: "Produksi",
    description: "Ubah bahan menjadi produk jadi",
    url: "#",
    icon: <Factory className="size-4" strokeWidth={1.8} />,
    items: [
      {
        title: "Riwayat Produksi",
        description: "Lihat seluruh aktivitas produksi",
        url: "/inventory/productions",
        icon: <History className="size-4" strokeWidth={1.8} />,
      },
      {
        title: "Buat Produksi",
        description: "Catat produksi produk baru",
        url: "/inventory/productions/new",
        icon: <Play className="size-4" strokeWidth={1.8} />,
      },
    ],
  },
  {
    title: "Produk Jadi",
    description: "Kelola stok produk siap dijual",
    url: "/inventory/finished-products",
    icon: <Boxes className="size-4" strokeWidth={1.8} />,
  },
];

// =============================================================
// LAPORAN & ANALITIK
// =============================================================
const reports: NavItem[] = [
  {
    title: "Riwayat HPP",
    description: "Histori biaya produksi produk",
    url: "/inventory/cost-history",
    icon: <TrendingUp className="size-4" strokeWidth={1.8} />,
  },
];

// =============================================================
// ADMINISTRASI
// =============================================================
const administration: NavItem[] = [
  {
    title: "Management User",
    description: "Kelola akun Barista dan Customer",
    url: "#",
    icon: <UserCog className="size-4" strokeWidth={1.8} />,
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
  {
    title: "Admin",
    description: "Kelola akun administrator",
    url: "#",
    icon: <ShieldCheck className="size-4" strokeWidth={1.8} />,
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
        <NavMain items={[dashboard]} />

        <SidebarGroup className="px-0">
          <SidebarGroupLabel>Alur Persediaan</SidebarGroupLabel>
          <NavMain items={inventoryFlow} />
        </SidebarGroup>

        <SidebarGroup className="px-0">
          <SidebarGroupLabel>Laporan</SidebarGroupLabel>
          <NavMain items={reports} />
        </SidebarGroup>

        <SidebarGroup className="px-0">
          <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
          <NavMain items={administration} />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}