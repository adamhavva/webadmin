import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NotificationButton } from "@/components/notification-button";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b">
          <div className="flex w-full items-center gap-2 px-4">
            {/* Left */}
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />

              <Separator
                orientation="vertical"
                className="mr-2 h-4"
              />

              <div className="text-sm font-medium">
                ASCEND WebAdmin
              </div>
            </div>

            {/* Right */}
            <div className="ml-auto flex items-center gap-1">
              <NotificationButton />
              <ModeToggle />
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}