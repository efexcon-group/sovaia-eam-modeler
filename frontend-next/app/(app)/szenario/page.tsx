import Link from "next/link";
import { getScenarioFlow, getScenarioFlows, getScenarioGap } from "@/lib/api-client";
import type { FlowListItem, ScenarioFlow, ScenarioGapResponse } from "@/lib/modeler-types";
import { FlowDiagram } from "@/components/scenario/FlowDiagram";
import { GapView } from "@/components/scenario/GapView";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ flow?: string }>;
}

/** Szenario-Advisor (ADR-096/098): Ablaufdiagramm (wo sitzt die Infra?) +
 *  darunter die Sovereign-AI-Readiness-Gap-Analyse, falls verknüpft. */
export default async function SzenarioPage({ searchParams }: PageProps) {
  const { flow: flowParam } = await searchParams;
  const flows = await getScenarioFlows()
    .then((r) => r.flows)
    .catch(() => [] as FlowListItem[]);

  const activeId = flows.find((f) => f.id === flowParam)?.id ?? flows[0]?.id;

  let flow: ScenarioFlow | null = null;
  let gap: ScenarioGapResponse | null = null;
  if (activeId) {
    flow = await getScenarioFlow(activeId).catch(() => null);
    if (flow?.target) {
      gap = await getScenarioGap(flow.target).catch(() => null);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 pt-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-slate-900">Szenario-Advisor</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Ablauf & Readiness</span>
        </div>
        <div className="text-xs text-slate-500 mb-2">
          Wie läuft der AI-Prozess — und wo werden GPU, Memory, Pipelines &amp; AI-Persistenz gebraucht? (ADR-096/098)
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-slate-200 pt-1">
          {flows.map((f) => (
            <Link
              key={f.id}
              href={`/szenario?flow=${encodeURIComponent(f.id)}`}
              title={f["summary-de"]}
              className={[
                "px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
                activeId === f.id
                  ? "border-emerald-500 text-emerald-700 font-medium bg-emerald-50/40"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")}
            >
              {f["label-de"]}
            </Link>
          ))}
        </nav>
      </header>

      <div className="p-6 max-w-5xl space-y-6">
        {!flow ? (
          <p className="text-sm text-slate-500">Keine Szenarien verfügbar.</p>
        ) : (
          <>
            <FlowDiagram flow={flow} />
            {gap && (
              <div className="pt-2 border-t border-slate-200">
                <h2 className="text-base font-semibold text-slate-900 mb-1">Sovereign-AI-Readiness — was wird dafür gebraucht?</h2>
                <p className="text-xs text-slate-500 mb-3">
                  Die Bausteine hinter diesem Ablauf (voraussetzt-Closure von{" "}
                  <code className="text-slate-600">{gap.target["label-de"]}</code>), nach Dimension &amp; Provider.
                </p>
                <GapView gap={gap} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
