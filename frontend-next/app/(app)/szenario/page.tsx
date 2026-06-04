import Link from "next/link";
import { getScenarioGap, getScenarioTargets } from "@/lib/api-client";
import type { GapCapability, ScenarioGapResponse, ScenarioTarget } from "@/lib/modeler-types";

export const dynamic = "force-dynamic";

const DIMENSION_LABEL: Record<string, string> = {
  data: "Daten",
  technology: "Technologie",
  operations: "Betrieb",
  infrastructure: "Infrastruktur",
  governance: "Governance",
};

const PROVIDER_LABEL: Record<string, string> = {
  "kiinno-datacenter": "KIINNO Datacenter",
  "kiinno-implementation": "KIINNO Implementierung",
  "sovaia-module": "Sovaia-Modul",
  "efexcon-ag": "EFEXCON AG",
};

const STATUS_STYLE: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-800",
  released: "bg-sky-100 text-sky-800",
  planned: "bg-slate-100 text-slate-600",
  beta: "bg-amber-100 text-amber-800",
};

interface PageProps {
  searchParams: Promise<{ target?: string }>;
}

/** Szenario-Advisor (ADR-096/098): Sovereign-AI-Readiness-Gap für ein Workload-Ziel. */
export default async function SzenarioPage({ searchParams }: PageProps) {
  const { target } = await searchParams;
  const targets = await getScenarioTargets()
    .then((r) => r.targets)
    .catch(() => [] as ScenarioTarget[]);

  let gap: ScenarioGapResponse | null = null;
  let gapError: string | null = null;
  if (target) {
    try {
      gap = await getScenarioGap(target);
    } catch (e) {
      gapError = String(e);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 pt-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-slate-900">Szenario-Advisor</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Sovereign-AI-Readiness</span>
        </div>
        <div className="text-xs text-slate-500 mb-2">
          Was braucht ein Ziel — und was fehlt ohne den Sovaia/KIINNO-Stack? (ADR-098)
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-slate-200 pt-1">
          {targets.map((t) => (
            <Link
              key={t.id}
              href={`/szenario?target=${encodeURIComponent(t.id)}`}
              title={t["summary-de"]}
              className={[
                "px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
                target === t.id
                  ? "border-emerald-500 text-emerald-700 font-medium bg-emerald-50/40"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")}
            >
              {t["label-de"]}
            </Link>
          ))}
        </nav>
      </header>

      <div className="p-6 max-w-4xl space-y-5">
        {!target && <Intro hasTargets={targets.length > 0} />}
        {gapError && <div className="text-xs text-rose-700 bg-rose-50 rounded-md px-3 py-2">Gap-Fehler: {gapError}</div>}
        {gap && <GapView gap={gap} />}
      </div>
    </div>
  );
}

function Intro({ hasTargets }: { hasTargets: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        Der Advisor löst ein <strong>Workload-Ziel</strong> über die Relation{" "}
        <code className="text-slate-500">voraussetzt</code> in seine benötigten Bausteine auf
        (Dependency-Closure) und zeigt je <strong>Dimension</strong> und <strong>Provider</strong>,
        was es braucht — und damit, was ohne den Sovaia/KIINNO-Stack fehlt.
      </p>
      <p className="text-sm text-slate-500">
        {hasTargets ? "Wähle oben ein Ziel." : "Noch keine Workload-Ziele mit voraussetzt-Kanten in der Referenz gepflegt."}
      </p>
    </div>
  );
}

function GapView({ gap }: { gap: ScenarioGapResponse }) {
  const byId = new Map(gap.required.map((c) => [c.id, c]));
  const dims = Object.keys(gap["by-dimension"]).sort();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{gap.target["label-de"]}</h2>
        {gap.target["summary-de"] && <p className="text-sm text-slate-600 mt-1">{gap.target["summary-de"]}</p>}
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-slate-700">{gap.summary["required-count"]} benötigte Bausteine</span>
        <span className="text-slate-300">·</span>
        {Object.entries(gap.summary["by-status"]).map(([s, n]) => (
          <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[s] ?? "bg-slate-100 text-slate-600"}`}>
            {n}× {s}
          </span>
        ))}
      </div>

      {/* Provider-Übersicht */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Wer liefert (fulfilled-by)</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(gap["by-provider"]).map(([prov, ids]) => (
            <span key={prov} className="text-xs px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
              {PROVIDER_LABEL[prov] ?? prov} <span className="text-slate-400">· {ids.length}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Gruppiert nach Dimension */}
      {dims.map((dim) => (
        <section key={dim}>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            {DIMENSION_LABEL[dim] ?? dim}
            <span className="text-slate-400 font-normal"> · {gap["by-dimension"][dim].length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gap["by-dimension"][dim]
              .map((id) => byId.get(id))
              .filter(Boolean)
              .map((c) => <CapabilityCard key={(c as GapCapability).id} cap={c as GapCapability} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function CapabilityCard({ cap }: { cap: GapCapability }) {
  const sov = cap.sovereignty;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-slate-900">{cap["label-de"]}</div>
        {cap.status && (
          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[cap.status] ?? "bg-slate-100 text-slate-600"}`}>
            {cap.status}
          </span>
        )}
      </div>
      {cap["summary-de"] && <p className="mt-1 text-xs text-slate-500 line-clamp-3">{cap["summary-de"]}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        {cap["fulfilled-by"].map((p) => (
          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
            {PROVIDER_LABEL[p] ?? p}
          </span>
        ))}
      </div>
      {sov && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
          {sov["data-residency"] && <span>Residency: <b className="text-slate-600">{sov["data-residency"].toUpperCase()}</b></span>}
          {sov["needs-own-ai-infra"] === false && <span className="text-emerald-700">keine eigene AI-Infra nötig</span>}
          {sov["trial-available"] && <span>Trial</span>}
          {sov["pilot-available"] && <span>Pilot</span>}
        </div>
      )}
    </div>
  );
}
