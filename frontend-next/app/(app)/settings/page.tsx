import Link from "next/link";
import { getMe } from "@/lib/api-client";
import type { License } from "@/lib/modeler-types";
import { TabLizenz } from "@/components/settings/TabLizenz";

export const dynamic = "force-dynamic";

type TabKey = "allgemein" | "benutzer-und-rechte" | "lizenz" | "reference";

const TABS: { id: TabKey; label: string }[] = [
  { id: "allgemein", label: "Allgemein" },
  { id: "benutzer-und-rechte", label: "Benutzer & Rechte" },
  { id: "lizenz", label: "Lizenz & Update" },
  { id: "reference", label: "Reference / Tenant" },
];

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

/** Einstellungen — Tab-Layout nach BLM-Vorbild (ADR-091). */
export default async function SettingsPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const active: TabKey = (TABS.find((t) => t.id === tab)?.id) ?? "lizenz";

  let license: License | null = null;
  if (active === "lizenz") {
    license = await getMe()
      .then((me) => me.license)
      .catch(() => null);
  }
  const appVersion = process.env.APP_VERSION ?? "0.1.0";

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 pt-3">
          <div className="text-base font-semibold text-slate-900">Einstellungen</div>
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-slate-200 px-4 pt-3">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/settings?tab=${t.id}`}
              className={[
                "px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
                active === t.id
                  ? "border-emerald-500 text-emerald-700 font-medium bg-emerald-50/40"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="p-6">
        {active === "lizenz" && <TabLizenz license={license} appVersion={appVersion} />}
        {active === "allgemein" && <Placeholder>Allgemeine Einstellungen folgen.</Placeholder>}
        {active === "benutzer-und-rechte" && (
          <Placeholder>
            Benutzerverwaltung, Rollen und Profile — angebunden über user-core (ADR-061). Folgt in der
            nächsten Phase.
          </Placeholder>
        )}
        {active === "reference" && <Placeholder>Reference- und Tenant-Einstellungen folgen.</Placeholder>}
      </div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-xl text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg px-5 py-8 text-center">
      {children}
    </div>
  );
}
