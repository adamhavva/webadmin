"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");

      const isShortcut =
        (isMac && event.metaKey && event.key.toLowerCase() === "d") ||
        (!isMac && event.ctrlKey && event.key.toLowerCase() === "d");

      if (!isShortcut) return;

      event.preventDefault();

      const isDark =
        theme === "dark" ||
        (theme === "system" && systemTheme === "dark");

      setTheme(isDark ? "light" : "dark");
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, theme, systemTheme, setTheme]);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5" />

        <span className="sr-only">
          Toggle theme
        </span>
      </Button>
    );
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" && systemTheme === "dark");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}

      <span className="sr-only">
        {isDark
          ? "Switch to light mode"
          : "Switch to dark mode"}
      </span>
    </Button>
  );
}
