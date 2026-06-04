"use client";

import type { ReactNode } from "react";
import {
  AppShell,
  DefaultUserMenuSlot,
  type SidebarRoute,
} from "@efexcon-group/app-shell-react";

export interface AppShellClientProps {
  brand: string;
  appKey: string;
  appLabel: string;
  appVersion?: string;
  sidebarRoutes: SidebarRoute[];
  user?: { id: string; name?: string; email?: string; avatarUrl?: string };
  children: ReactNode;
}

/**
 * Client-Wrapper für die AppShell (Library nutzt createContext ohne 'use client').
 *
 * Welle 8 (sovaia-app-shell-core 6b47c63 + 088ffa6): Migration der Topbar-Slots
 * auf die neue Slot-API. `brandSlot` rendert wie der frueher implizite Default
 * (appLabel als fettgedruckter Text), `topbarRightSlot` rendert UserMenu via
 * DefaultUserMenuSlot-Convenience-Wrapper. Sidebar-Footer bleibt absichtlich
 * nicht ueberschrieben, damit die Backward-Compat-Default-Render der Library
 * (footerRoutes wie "Einstellungen" + appVersion) erhalten bleibt —
 * DefaultSidebarFooterSlot rendert footerRoutes nicht.
 *
 * `brand`-Prop bleibt aktiv: speist AppShellContext (useAppShellContext).
 */
export function AppShellClient(props: AppShellClientProps) {
  return (
    <AppShell
      brand={props.brand}
      appKey={props.appKey}
      appLabel={props.appLabel}
      appVersion={props.appVersion}
      sidebarRoutes={props.sidebarRoutes}
      brandSlot={<div style={{ fontWeight: 600 }}>{props.appLabel}</div>}
      topbarRightSlot={props.user ? <DefaultUserMenuSlot user={props.user} /> : null}
    >
      {props.children}
    </AppShell>
  );
}
