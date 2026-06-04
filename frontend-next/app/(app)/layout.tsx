import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShellClient } from "@/components/AppShellClient";
import { MODELER_SIDEBAR_ROUTES } from "@/lib/sidebar-routes";

/** NextAuth-geschützte Route-Group (app). Server-Component → Session-Check vor Render. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user as { id?: string; email?: string | null; name?: string | null };
  return (
    <AppShellClient
      brand="sovaia"
      appKey="architecture-modeler"
      appLabel="Architecture Modeler"
      appVersion={process.env.APP_VERSION ?? "0.1.0"}
      sidebarRoutes={MODELER_SIDEBAR_ROUTES}
      user={{ id: u.id ?? "", email: u.email ?? undefined, name: u.name ?? undefined }}
    >
      {children}
    </AppShellClient>
  );
}
