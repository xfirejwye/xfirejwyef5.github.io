import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const STORAGE_KEY = "fs-age-confirmed";

export const AgeGate = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "yes";
    if (!ok) setOpen(true);
  }, []);

  const confirm = () => {
    localStorage.setItem(STORAGE_KEY, "yes");
    setOpen(false);
  };

  const leave = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        className="max-w-md border-primary/30 bg-card/95 backdrop-blur shadow-glow"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <img src={logo} alt="FS Videos logo" className="h-20 w-20 object-contain" />
          <DialogTitle className="font-display text-3xl tracking-wider">
            ARE YOU OVER <span className="text-gradient">18</span>?
          </DialogTitle>
          <DialogDescription className="text-base">
            FS Videos hosts user-uploaded content with no restrictions.
            You must be at least 18 years old to enter.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={leave} className="w-full">
            No, exit
          </Button>
          <Button variant="hero" onClick={confirm} className="w-full">
            Yes, I'm 18+
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
