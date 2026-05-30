import type { NavigatorImpact, NavigatorNode } from "../api-client";

interface Props {
  classic: NavigatorNode[];
  sovaia: NavigatorNode[];
  impact: NavigatorImpact;
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    "in-use-everywhere": "bg-slate-200 text-slate-700",
    declining: "bg-amber-100 text-amber-800",
    niche: "bg-slate-100 text-slate-600",
    obsolete: "bg-rose-100 text-rose-800",
    live: "bg-emerald-100 text-emerald-800",
    released: "bg-emerald-100 text-emerald-800",
    beta: "bg-sky-100 text-sky-800",
    planned: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function NodeCard({ node, side }: { node: NavigatorNode; side: "classic" | "sovaia" }) {
  const tags = node.tags ?? {};
  const status =
    side === "classic"
      ? tags["operational-status"]
      : node.impact?.["operational-status"] ?? tags.status;
  const availableFrom = side === "sovaia" ? node.impact?.["available-from"] : undefined;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-slate-900">{node["label-de"]}</div>
        <StatusPill status={status} />
      </div>
      {node["summary-de"] && (
        <p className="mt-1 text-xs text-slate-500">{node["summary-de"]}</p>
      )}
      {side === "sovaia" && node.impact && (
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
          {node.impact["automation-grade"] !== undefined && (
            <div className="text-slate-500">
              Automation <span className="text-emerald-700 font-medium">{node.impact["automation-grade"]}%</span>
            </div>
          )}
          {node.impact["headcount-delta"] !== undefined && (
            <div className="text-slate-500">
              Personal <span className="text-emerald-700 font-medium">{(node.impact["headcount-delta"] * 100).toFixed(0)}%</span>
            </div>
          )}
          {node.impact["cost-delta"] !== undefined && (
            <div className="text-slate-500">
              Cost <span className="text-emerald-700 font-medium">{(node.impact["cost-delta"] * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}
      {availableFrom && (
        <div className="mt-1 text-[10px] text-slate-400">verfügbar ab {availableFrom}</div>
      )}
    </div>
  );
}

function ImpactFooter({ impact }: { impact: NavigatorImpact }) {
  const has = impact && impact["sample-size"];
  if (!has) return null;
  const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  return (
    <div className="mt-3 rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-900 flex flex-wrap gap-4">
      <div>
        <span className="text-emerald-700 font-medium">Automations-Grad ø</span>{" "}
        {impact["automation-grade"] != null ? `${impact["automation-grade"]}%` : "—"}
      </div>
      <div>
        <span className="text-emerald-700 font-medium">Personal ø</span> {fmtPct(impact["headcount-delta"])}
      </div>
      <div>
        <span className="text-emerald-700 font-medium">Cost ø</span> {fmtPct(impact["cost-delta"])}
      </div>
      <div className="text-emerald-700/70">{impact["sample-size"]} Sovaia-Module</div>
    </div>
  );
}

export function ComparePanel({ classic, sovaia, impact }: Props) {
  if (classic.length === 0 && sovaia.length === 0) {
    return (
      <section className="px-4 py-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Keine zugeordneten Module auf diesem Pfad. LLM-Befüllung folgt in Iteration 1b.
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4 border-t border-slate-200">
      <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
        Classic vs Sovaia AI Stack
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
            Classic Stack
            <span className="text-xs text-slate-400">({classic.length})</span>
          </h3>
          <div className="space-y-2">
            {classic.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Noch nicht erfasst.</div>
            ) : (
              classic.map((n) => <NodeCard key={n.id} node={n} side="classic" />)
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Sovaia AI Stack
            <span className="text-xs text-emerald-400">({sovaia.length})</span>
          </h3>
          <div className="space-y-2">
            {sovaia.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Keine zugeordneten Sovaia-Module.</div>
            ) : (
              sovaia.map((n) => <NodeCard key={n.id} node={n} side="sovaia" />)
            )}
          </div>
        </div>
      </div>
      <ImpactFooter impact={impact} />
    </section>
  );
}
