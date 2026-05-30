import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getNavigator,
  getSchichten,
  type NavigatorResponse,
  type Schicht,
} from "../api-client";
import { Breadcrumb } from "./Breadcrumb";
import { ComparePanel } from "./ComparePanel";
import { LayerTabs } from "./LayerTabs";
import { TaxonomyTiles } from "./TaxonomyTiles";

interface CachedTree {
  layerId: string;
  data: NavigatorResponse | null;
  error: string | null;
}

export default function NavigatorPage() {
  const loc = useLocation();
  const path = loc.pathname.replace(/^\/navigator\/?/, "");
  const segments = path.split("/").filter(Boolean);

  const [schichten, setSchichten] = useState<Schicht[] | null>(null);
  const [schichtenError, setSchichtenError] = useState<string | null>(null);

  const [navData, setNavData] = useState<CachedTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Schichten einmal laden.
  useEffect(() => {
    getSchichten()
      .then((r) => setSchichten(r.schichten))
      .catch((e) => setSchichtenError(String(e)));
  }, []);

  // Navigator-Daten bei Pfadwechsel oder Mutation laden.
  useEffect(() => {
    if (segments.length === 0) {
      setNavData(null);
      return;
    }
    setLoading(true);
    let alive = true;
    getNavigator(path)
      .then((data) => alive && setNavData({ layerId: segments[0], data, error: null }))
      .catch((e) => alive && setNavData({ layerId: segments[0], data: null, error: String(e) }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [path, refreshTick]);

  const refresh = () => setRefreshTick((n) => n + 1);

  // Breadcrumb-Labels auflösen — Layer aus schichten, Rest aus navData.current bzw IDs.
  const breadcrumbSegments = useMemo(() => {
    if (segments.length === 0 || !schichten) return [];
    const result: { id: string; label: string }[] = [];
    const layer = schichten.find((s) => s.id === segments[0]);
    result.push({ id: segments[0], label: layer?.["label-de"] ?? segments[0] });
    // Für tiefere Segmente: nutze das aktuelle current-Label (nur Letzes), Rest als rohe ID.
    for (let i = 1; i < segments.length; i++) {
      const id = segments[i];
      const isLast = i === segments.length - 1;
      const label = isLast ? navData?.data?.current["label-de"] ?? id : id;
      result.push({ id, label });
    }
    return result;
  }, [segments, schichten, navData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Sovaia Architecture-Modeler
            </div>
            <div className="text-xs text-slate-500">Stakeholder-Navigator</div>
          </div>
          <Link
            to="/canvas"
            className="rounded-md bg-white shadow-sm border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            Architekt-Canvas →
          </Link>
        </div>
        {schichtenError ? (
          <div className="px-4 py-2 text-xs text-rose-700 bg-rose-50">
            Schichten konnten nicht geladen werden: {schichtenError}
          </div>
        ) : schichten ? (
          <LayerTabs schichten={schichten} />
        ) : (
          <div className="px-4 py-3 text-xs text-slate-500">Lade Schichten…</div>
        )}
      </header>

      <Breadcrumb segments={breadcrumbSegments} />

      {segments.length === 0 && (
        <div className="px-4 py-8 max-w-2xl">
          <p className="text-sm text-slate-700">
            Wähle eine <strong>Schicht</strong> oben, um Stakeholder-Sichten zu starten.
            Auf jeder Drill-Ebene siehst du <strong>Classic-vs-Sovaia-AI-Vergleich</strong> mit Wirkungs-Metriken.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Detail-Bäume jenseits von Business werden iterativ befüllt
            (LLM-Vorschlag, User-Pflege — ADR-082 §"Classic-Reference-Modell").
          </p>
        </div>
      )}

      {segments.length > 0 && (
        <main>
          {loading && (
            <div className="px-4 py-2 text-xs text-slate-500">Lade {path}…</div>
          )}
          {navData?.error && (
            <div className="px-4 py-2 text-xs text-rose-700 bg-rose-50">
              Navigator-Fehler: {navData.error}
            </div>
          )}
          {navData?.data && (
            <>
              {navData.data.current["summary-de"] && (
                <div className="px-4 pt-3 pb-1 text-sm text-slate-600">
                  {navData.data.current["summary-de"]}
                </div>
              )}
              <TaxonomyTiles
                children={navData.data.children}
                emptyHint={
                  navData.data.children.length === 0
                    ? "Detail-Ebene erreicht — kein weiterer Drill verfügbar."
                    : undefined
                }
              />
              <ComparePanel
                path={path}
                classic={navData.data.classic}
                sovaia={navData.data.sovaia}
                impact={navData.data["impact-aggregate"]}
                onMutate={refresh}
              />
            </>
          )}
        </main>
      )}
    </div>
  );
}
