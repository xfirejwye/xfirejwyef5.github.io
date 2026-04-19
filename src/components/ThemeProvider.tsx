import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="fs-theme">
    {children}
  </NextThemesProvider>
);
