import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Toggle } from "./toggle";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Toggle 
      variant="outline"
      size="sm"
      pressed={theme === "dark"}
      onPressedChange={toggleTheme}
      aria-label="تبديل المظهر"
      className="border-2 border-muted bg-background hover:bg-accent hover:text-accent-foreground p-2 rounded-full"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-primary" />
      ) : (
        <Moon className="h-5 w-5 text-primary" />
      )}
    </Toggle>
  );
}
