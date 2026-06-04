"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@efexcon-group/app-shell-theming/react";
import { SOVAIA_THEME } from "@efexcon-group/app-shell-theming";

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={SOVAIA_THEME}>{children}</ThemeProvider>;
}
