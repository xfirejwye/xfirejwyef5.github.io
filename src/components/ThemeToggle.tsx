import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";

  const handleToggle = () => {
    // restart animation
    if (iconRef.current) {
      iconRef.current.classList.remove("animate-theme-swap");
      // force reflow so the animation can replay
      void iconRef.current.offsetWidth;
      iconRef.current.classList.add("animate-theme-swap");
    }
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={handleToggle}
      className="rounded-full relative overflow-hidden hover:bg-primary/10 active:scale-90 transition-transform"
    >
      <span ref={iconRef} className="inline-flex items-center justify-center">
        {mounted && isDark ? (
          <Sun className="h-5 w-5 text-primary" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </span>
    </Button>
  );
};
