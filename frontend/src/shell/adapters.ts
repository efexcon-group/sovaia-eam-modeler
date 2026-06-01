// Adapter zwischen Modeler-eigenen API-Typen und @sovaia/app-shell-react-Typen.
//
// Hintergrund: @sovaia/app-shell-react ist die kanonische Cross-App-Library (ADR-087).
// Sie verwendet ein generisches Vokabular (LicenseInfo.mode = "open"|"strict"|"preview",
// kein Lease-Lifecycle), während der Modeler eine eigene License-Form hat
// (mode = "open"|"strict"|"preview", allowed-layers/paths).
//
// Diese Mapping-Schicht ist bewusst dünn: sie verheiratet die zwei Modelle
// pragmatisch, ohne den App-Shell-Vertrag aufzuweichen.

import type { LicenseInfo, UserInfo } from "@sovaia/app-shell-react";
import type { License, MeResponse } from "../api-client";

/**
 * Mappt Modeler-License auf den AppShell-LicenseBadge-Vertrag.
 *
 * Modeler kennt drei Modes:
 *   - "open"    → voller Zugriff (Dev/Internal)
 *   - "strict"  → lizenz-gegrenzt nach allowed-layers/paths
 *   - "preview" → Read-only-Demo
 *
 * Mapping auf AppShell-LicenseInfo:
 *   - leaseStatus ist im Modeler nicht modelliert → wir treten als "ACTIVE" auf,
 *     solange überhaupt eine License vorhanden ist.
 *   - tier nutzen wir, um die Modeler-Allowed-Layers-Count als grobe Indikation
 *     ins Badge zu spielen ("Layers: 6/12" wäre eine zukünftige Verfeinerung;
 *     aktuell schreiben wir nur "Modeler").
 *   - groups bleibt leer — Modeler nutzt allowed-paths statt License-Groups.
 */
export function licenseToInfo(license: License | null): LicenseInfo | undefined {
  if (!license) return undefined;
  return {
    mode: license.mode,
    leaseStatus: "ACTIVE",
    tier: "Modeler",
  };
}

/**
 * Mappt Modeler /v1/me auf AppShell-UserInfo.
 *
 * Modeler-Iteration-0 hat noch keinen echten Auth-Stack (Auth-Header werden
 * vom Backend toleriert) — daher gibt /v1/me nur tenant + license zurück.
 * Wir bauen eine synthetische UserInfo aus dem tenant-Slug, damit das
 * UserMenu im Header eine ID anzeigen kann.
 */
export function meToUser(me: MeResponse): UserInfo {
  return {
    id: me.tenant,
    name: me.tenant,
  };
}
