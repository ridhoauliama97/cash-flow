"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_COOKIE = "theme";

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    document.cookie = `${THEME_COOKIE}=${next ? "dark" : "light"};path=/;max-age=31536000;samesite=lax`;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground"
      onClick={toggle}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
      <span className="dark:hidden">Dark mode</span>
      <span className="hidden dark:block">Light mode</span>
    </Button>
  );
}
