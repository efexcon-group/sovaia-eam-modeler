"use client";

import type { ReactNode } from "react";
import { AppShell, type SidebarRoute } from "@efexcon-group/app-shell-react";

export interface AppShellClientProps {
  brand: string;
  appKey: string;
  appLabel: string;
  appVersion?: string;
  sidebarRoutes: SidebarRoute[];
  user?: { id: string; name?: string; email?: string; avatarUrl?: string };
  children: ReactNode;
}

/** Client-Wrapper für die AppShell (Library nutzt createContext ohne 'use client'). */
export function AppShellClient(props: AppShellClientProps) {
  return (
    <AppShell
      brand={props.brand}
      appKey={props.appKey}
      appLabel={props.appLabel}
      appVersion={props.appVersion}
      sidebarRoutes={props.sidebarRoutes}
      user={props.user}
    >
      {props.children}
    </AppShell>
  );
}
