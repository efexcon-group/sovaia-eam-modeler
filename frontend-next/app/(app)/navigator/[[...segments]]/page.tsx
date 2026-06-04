import Link from "next/link";
import { getMe, getNavigator, getSchichten } from "@/lib/api-client";
import type { NavigatorResponse } from "@/lib/modeler-types";
import { LayerTabs } from "@/components/navigator/LayerTabs";
import { Breadcrumb } from "@/components/navigator/Breadcrumb";
import { TaxonomyTiles } from "@/components/navigator/TaxonomyTiles";
import { ComparePanel } from "@/components/navigator/ComparePanel";
import { MetricsBar } from "@/components/navigator/MetricsBar";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
}

/** Stakeholder-Navigator: Layer wählen → Drill-Down → Classic-vs-Sovaia-Vergleich. */
export default async function NavigatorPage({ params }: PageProps) {
  const { segments = [] } = await params;
  const path = segments.join("/");

  // Schichten + Me parallel (beide unkritisch — Fehler degradieren weich).
  const [schichten, tenant] = await Promise.all([
    getSchichten()
      .then((r) => r.schichten)
      .catch(() => null),
    getMe()
      .then((r) => r.tenant)
      .catch(() => null),
  ]);

  // Navigator-Daten nur bei gesetztem Pfad.
  let navData: NavigatorResponse | null = null;
  let navError: string | null = null;
  if (segments.length > 0) {
    try {
      navData = await getNavigator(path);
    } catch (e) {
      const status = (e as { status?: number }).status;
      navError =
        status === 403
          ? `Pfad „${path}" ist für diesen Tenant nicht lizenziert.`
          : status === 404
          ? `Layer „${segments[0]}" nicht gefunden.`
          : `Navigator-Fehler: ${String(e)}`;
    }
  }

  // Breadcrumb-Labels: Layer aus Schichten, letztes aus current, Rest = rohe ID.
  const breadcrumbSegments: { id: string; label: string }[] = [];
  if (segments.length > 0 && schichten) {
    const layer = schichten.find((s) => s.id === segments[0]);
    breadcrumbSegments.push({ id: segments[0], label: layer?.["label-de"] ?? segments[0] });
    for (let i = 1; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      breadcrumbSegments.push({
        id: segments[i],
        label: isLast ? navData?.current["label-de"] ?? segments[i] : segments[i],
      });
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Stakeholder-Navigator</div>
            <div className="text-xs text-slate-500">
              Classic-vs-Sovaia-Vergleich mit Wirkungs-Metriken
              {tenant && (
                <span className="text-slate-400"> · Tenant: <code className="text-slate-600">{tenant}</code></span>
              )}
            </div>
          </div>
          <Link
            href="/canvas"
            className="rounded-md bg-white shadow-sm border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            Architekt-Canvas →
          </Link>
        </div>
        {schichten ? (
          <LayerTabs schichten={schichten} active={segments[0]} />
        ) : (
          <div className="px-4 py-3 text-xs text-rose-700 bg-rose-50">
            Schichten konnten nicht geladen werden.
          </div>
        )}
        <Breadcrumb segments={breadcrumbSegments} />
        {navData && (
          <MetricsBar impact={navData["impact-aggregate"]} cost={navData["cost-aggregate"]} />
        )}
      </header>

      {segments.length === 0 && (
        <div className="px-4 py-8 max-w-2xl">
          <p className="text-sm text-slate-700">
            Wähle eine <strong>Schicht</strong> oben, um Stakeholder-Sichten zu starten. Auf jeder
            Drill-Ebene siehst du <strong>Classic-vs-Sovaia-AI-Vergleich</strong> mit Wirkungs-Metriken.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Detail-Bäume jenseits von Business werden iterativ befüllt (LLM-Vorschlag, User-Pflege).
          </p>
        </div>
      )}

      {segments.length > 0 && (
        <main>
          {navError && <div className="px-4 py-2 text-xs text-rose-700 bg-rose-50">{navError}</div>}
          {navData && (
            <>
              {navData.current["summary-de"] && (
                <div className="px-4 pt-3 pb-1 text-sm text-slate-600">{navData.current["summary-de"]}</div>
              )}
              <TaxonomyTiles
                items={navData.children}
                emptyHint={
                  navData.children.length === 0
                    ? "Detail-Ebene erreicht — kein weiterer Drill verfügbar."
                    : undefined
                }
              />
              <ComparePanel
                path={path}
                classic={navData.classic}
                sovaia={navData.sovaia}
                mappings={navData.mappings}
              />
            </>
          )}
        </main>
      )}
    </div>
  );
}
