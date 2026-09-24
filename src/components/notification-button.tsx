"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotificationButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />

      {/* Notification indicator */}
      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />

      <span className="sr-only">Notifications</span>
    </Button>
  );
}