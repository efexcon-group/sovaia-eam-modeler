import type { CostAggregate, NavigatorImpact } from "@/lib/modeler-types";

interface Props {
  impact?: NavigatorImpact;
  cost?: CostAggregate;
}

const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const fmtChf = (v: number | null | undefined) => (v == null ? "—" : `CHF ${v.toLocaleString("de-CH")}`);

/** Kompakte Aggregat-Metriken — direkt unter den Layer-Reitern eingeblendet,
 *  damit Wirkung/Kosten ohne Scrollen sichtbar sind (statt am Seitenende). */
export function MetricsBar({ impact, cost }: Props) {
  const hasImpact = !!(impact && impact["sample-size"]);
  const hasCost = !!(cost && cost["mapping-count"]);
  if (!hasImpact && !hasCost) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 bg-emerald-50/60 border-b border-emerald-100 text-xs">
      {hasImpact && (
        <>
          <Metric label="Automations-Grad ø" value={impact!["automation-grade"] != null ? `${impact!["automation-grade"]}%` : "—"} />
          <Metric label="Personal ø" value={fmtPct(impact!["headcount-delta"])} />
          <Metric label="Cost ø" value={fmtPct(impact!["cost-delta"])} />
          <span className="text-emerald-700/60">{impact!["sample-size"]} Sovaia-Module</span>
        </>
      )}
      {hasImpact && hasCost && <span className="h-3 w-px bg-emerald-200" />}
      {hasCost && (
        <>
          <Metric
            label="OPEX/Mt"
            value={`${fmtChf(cost!.vorher?.["opex-monatlich"])} → ${fmtChf(cost!.nachher?.["opex-monatlich"])}`}
          />
          <Metric
            label="CAPEX"
            value={`${fmtChf(cost!.vorher?.capex)} → ${fmtChf(cost!.nachher?.capex)}`}
          />
          <span className="text-emerald-700/60">{cost!["mapping-count"]} Mapping(s)</span>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-emerald-900">
      <span className="text-emerald-700 font-medium">{label}</span> {value}
    </span>
  );
}
