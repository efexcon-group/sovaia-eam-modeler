import type { SidebarRoute } from "@efexcon-group/app-shell-react";

export const MODELER_SIDEBAR_ROUTES: SidebarRoute[] = [
  { path: "/navigator", label: "Navigator" },
  { path: "/canvas", label: "Canvas" },
  { path: "/bibliothek", label: "Bibliothek" },
  { path: "/szenario", label: "Szenario" },
  { path: "/settings", label: "Einstellungen", footer: true },
];
