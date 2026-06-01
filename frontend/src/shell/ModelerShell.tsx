import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, type SidebarRoute, type UserInfo, type LicenseInfo } from "@sovaia/app-shell-react";
import { getLicense, getMe, type License, type MeResponse } from "../api-client";
import { licenseToInfo, meToUser } from "./adapters";

/**
 * ModelerShell — verkabelt @sovaia/app-shell-react AppShell mit dem
 * Modeler-Backend.
 *
 * Iteration 0:
 *   - Lädt /v1/me + /v1/edit/license parallel beim Mount.
 *   - Mapped beide auf den AppShell-LicenseBadge/UserMenu-Vertrag.
 *   - Liefert eine schmale SidebarRoute-Liste (Navigator, Canvas).
 *   - Profile-Switcher + ModeToggle bleiben leer — Modeler hat noch keinen
 *     Profile/Mode-State (Phase-2 Modeler-Backend-Erweiterung).
 *
 * Logout:
 *   - Aktuell pragmatischer Reload via location.href = "/" — Modeler hat
 *     noch keinen dedizierten Auth-Logout-Endpoint.
 *   - Sobald /api/auth/logout oder OIDC-Logout existiert: hier hinzufügen.
 */
const SIDEBAR_ROUTES: SidebarRoute[] = [
  { path: "#/navigator", label: "Navigator" },
  { path: "#/canvas", label: "Canvas" },
];

const APP_VERSION = "0.1.0";

interface ModelerShellProps {
  children: ReactNode;
}

export default function ModelerShell({ children }: ModelerShellProps) {
  // useNavigate wird absichtlich aufgerufen, um die HashRouter-Integration
  // zu beweisen — kann später für Profile-Switch-Side-Effects genutzt werden.
  useNavigate();

  const [user, setUser] = useState<UserInfo | undefined>();
  const [license, setLicense] = useState<LicenseInfo | undefined>();

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getMe(), getLicense()]).then(([meRes, licRes]) => {
      if (!mounted) return;
      if (meRes.status === "fulfilled") {
        const me: MeResponse = meRes.value;
        setUser(meToUser(me));
        // Falls /v1/me eine inline-License hat, ist die schon im Adapter.
        if (me.license) {
          setLicense(licenseToInfo(me.license));
        }
      }
      if (licRes.status === "fulfilled") {
        const lic: License = licRes.value;
        setLicense(licenseToInfo(lic));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell
      brand="sovaia"
      appKey="architecture-modeler"
      appLabel="Architecture Modeler"
      appVersion={APP_VERSION}
      sidebarRoutes={SIDEBAR_ROUTES}
      user={user}
      license={license}
      // Profile + Mode noch nicht verkabelt — Modeler-Phase-2.
    >
      {children}
    </AppShell>
  );
}
