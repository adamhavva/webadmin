"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export type NavItem = {
  title: string
  url: string
  description?: string
  defaultOpen?: boolean
  icon?: React.ReactNode
  isActive?: boolean
  items?: NavItem[]
}

type NavMainProps = {
  items: NavItem[]
}

export function NavMain({ items }: NavMainProps) {
  return (
    <SidebarGroup className="px-2 py-2 group-data-[collapsible=icon]:px-0">

      <SidebarMenu className="mt-1 gap-1">
        {items.map((item) => (
          <NavItemRenderer
            key={`${item.title}-${item.url}`}
            item={item}
            level={0}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavItemRenderer({
  item,
  level,
}: {
  item: NavItem
  level: number
}) {
  const pathname = usePathname()
  const router = useRouter()

  const hasChildren =
    Boolean(item.items && item.items.length > 0)

  /*
    Hanya URL yang benar-benar sama yang dianggap
    sebagai halaman aktif.

    Contoh:
    /inventory/items
    tidak aktif ketika pathname:
    /inventory/items/new
  */
  const isCurrentPage =
    item.url !== "#" &&
    pathname === item.url

  /*
    Parent tetap dianggap aktif/open jika salah satu
    child atau descendant sedang berada di halaman aktif.
  */
  const hasActiveDescendant = React.useMemo(
    () => hasActiveChild(item, pathname),
    [item, pathname]
  )

  const [open, setOpen] = React.useState(
    item.isActive === true || hasActiveDescendant
  )

  /*
    Kalau user sedang berada di dalam salah satu
    halaman child, parent otomatis tetap terbuka.
  */
  React.useEffect(() => {
    if (hasActiveDescendant) {
      setOpen(true)
    }
  }, [hasActiveDescendant])

  const handleClick = () => {
    if (hasChildren) {
      setOpen((current) => !current)
      return
    }

    if (item.url !== "#") {
      router.push(item.url)
    }
  }

  /*
    LEVEL 0
    Menu utama:
    Dashboard
    Persediaan
    dll.
  */
  if (level === 0) {
    const active =
      isCurrentPage || hasActiveDescendant

    return (
      <SidebarMenuItem>
<SidebarMenuButton
  tooltip={item.title}
  isActive={active}
  onClick={handleClick}
  className={[
    "h-10 rounded-lg",
    "px-3",
    "text-[13px] font-medium",
    "transition-colors",
    "hover:bg-muted/70",

    // Sidebar collapsed
    "group-data-[collapsible=icon]:size-10",
    "group-data-[collapsible=icon]:min-w-10",
    "group-data-[collapsible=icon]:justify-center",
    "group-data-[collapsible=icon]:px-0",
    "group-data-[collapsible=icon]:mx-auto",

    active
      ? "bg-muted text-foreground shadow-none"
      : "text-foreground/80",
  ].join(" ")}
>
  {item.icon && (
    <span
      className="
        flex
        size-5
        shrink-0
        items-center
        justify-center

        group-data-[collapsible=icon]:size-6
      "
    >
      {item.icon}
    </span>
  )}

  <span
    className="
      truncate
      group-data-[collapsible=icon]:hidden
    "
  >
    {item.title}
  </span>

  {hasChildren && (
    <ChevronDown
      className={[
        "ml-auto size-4 shrink-0",
        "text-muted-foreground/70",
        "transition-transform duration-200",
        "group-data-[collapsible=icon]:hidden",
        open ? "rotate-0" : "-rotate-90",
      ].join(" ")}
    />
  )}
</SidebarMenuButton>
        {hasChildren && open && (
          <SidebarMenuSub className="ml-4 mr-0 border-l border-border/60 pl-2">
            {item.items!.map((child) => (
              <NavItemRenderer
                key={`${child.title}-${child.url}`}
                item={child}
                level={1}
              />
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    )
  }

  /*
    SUBMENU / CHILD
  */
  const active =
    isCurrentPage || hasActiveDescendant

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={isCurrentPage}
        onClick={handleClick}
        className={[
          "min-h-9 rounded-md px-3",
          "text-[12px]",
          "transition-colors",
          "hover:bg-muted/60",

          active
            ? "bg-muted/70 font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        {item.icon && (
          <span className="flex size-4 shrink-0 items-center justify-center">
            {item.icon}
          </span>
        )}

        <span>
          {item.title}
        </span>
        {hasChildren && (
          <ChevronRight
            className={[
              "ml-auto size-3.5 shrink-0",
              "text-muted-foreground/60",
              "transition-transform duration-200",
              open ? "rotate-90" : "rotate-0",
            ].join(" ")}
          />
        )}
      </SidebarMenuSubButton>

      {hasChildren && open && (
        <SidebarMenuSub className="ml-3 border-l border-border/50 pl-2">
          {item.items!.map((child) => (
            <NavItemRenderer
              key={`${child.title}-${child.url}`}
              item={child}
              level={level + 1}
            />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuSubItem>
  )
}

/*
  Mengecek apakah salah satu descendant mempunyai
  URL yang PERSIS sama dengan pathname sekarang.

  Tidak menggunakan startsWith().

  Contoh:

  pathname:
  /inventory/items/new

  item:
  /inventory/items

  hasil:
  false

  item:
  /inventory/items/new

  hasil:
  true
*/
function hasActiveChild(
  item: NavItem,
  pathname: string
): boolean {
  if (!item.items?.length) {
    return false
  }

  return item.items.some((child) => {
    const childIsActive =
      child.url !== "#" &&
      pathname === child.url

    return (
      childIsActive ||
      hasActiveChild(child, pathname)
    )
  })
}