import { NavLink } from "react-router-dom";
import { Home, Flame, Upload } from "lucide-react";

/**
 * Mobile-only bottom navigation bar.
 * Hidden on md+ where the desktop header nav is shown.
 */
export const MobileNav = () => {
  const base =
    "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors";
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
          }
        >
          <Home className="h-5 w-5" />
          Home
        </NavLink>
        <NavLink
          to="/reels"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
          }
        >
          <Flame className="h-5 w-5" />
          Reels
        </NavLink>
        <NavLink
          to="/upload"
          className={({ isActive }) =>
            `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
          }
        >
          <Upload className="h-5 w-5" />
          Upload
        </NavLink>
      </div>
    </nav>
  );
};
