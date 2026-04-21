import { Link, NavLink } from "react-router-dom";
import { Upload, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.png";

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src={logo}
            alt="F5 Videos"
            className="h-9 w-9 object-contain transition-transform group-hover:scale-110"
          />
          <span className="font-display text-2xl tracking-widest leading-none">
            F5<span className="text-primary">VIDEOS</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <span className="inline-flex items-center gap-1.5"><Flame className="h-4 w-4" /> Discover</span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="hero" size="sm" className="gap-2">
            <Link to="/upload">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
