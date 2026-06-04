import type { CostAggregate, NavigatorImpact } from "@/lib/modeler-types";

interface Props {
  impact?: NavigatorImpact;
  cost?: CostAggregate;
}

const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const fmtChf = (v: number | null | undefined) => (v == null ? "—" : `CHF ${v.toLocaleString("de-CH")}`);

/** Kompakte Aggregat-Metriken — direkt unter den Layer-Reitern eingeblendet,
 *  damit Wirkung/Kosten ohne Scrollen sichtbar sind. Eine ausklappbare
 *  „Annahmen & Berechnung"-Sektion erklärt jede Kennzahl (native <details>). */
export function MetricsBar({ impact, cost }: Props) {
  const hasImpact = !!(impact && impact["sample-size"]);
  const hasCost = !!(cost && cost["mapping-count"]);
  if (!hasImpact && !hasCost) return null;

  return (
    <div className="bg-emerald-50/60 border-b border-emerald-100 text-xs">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2">
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
            <Metric label="OPEX/Mt" value={`${fmtChf(cost!.vorher?.["opex-monatlich"])} → ${fmtChf(cost!.nachher?.["opex-monatlich"])}`} />
            <Metric label="CAPEX" value={`${fmtChf(cost!.vorher?.capex)} → ${fmtChf(cost!.nachher?.capex)}`} />
            <span className="text-emerald-700/60">{cost!["mapping-count"]} Mapping(s)</span>
          </>
        )}
      </div>

      <details className="px-4 pb-2 -mt-0.5 group">
        <summary className="cursor-pointer select-none text-emerald-700/80 hover:text-emerald-900 list-none flex items-center gap-1">
          <span className="transition-transform group-open:rotate-90">▸</span>
          Annahmen &amp; Berechnung
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 text-slate-600 leading-relaxed max-w-4xl">
          {hasImpact && (
            <div className="rounded-md bg-white/70 border border-emerald-100 p-3">
              <div className="font-medium text-slate-800 mb-1">Wirkungs-Metriken (Ø über Sovaia-Module)</div>
              <ul className="space-y-1">
                <li>
                  <b>Automations-Grad ø</b> — arithmetisches Mittel (ungewichtet) des Felds
                  {" "}<code className="text-slate-500">impact.automation-grade</code> aller Sovaia-Module
                  auf diesem Pfad, die einen Wert pflegen. Skala 0–100&nbsp;%.
                </li>
                <li>
                  <b>Personal ø / Cost ø</b> — Mittel des <i>relativen</i> Deltas ggü. dem Classic-Baseline
                  ({" "}<code className="text-slate-500">headcount-delta</code> /{" "}
                  <code className="text-slate-500">cost-delta</code>, z.&nbsp;B. −0,30 = −30&nbsp;%).
                  Negativ = Reduktion.
                </li>
                <li>
                  <b>{impact!["sample-size"]} Sovaia-Module</b> — Anzahl Module mit Impact-Angabe, die in den
                  Schnitt eingehen. Fehlt einer Kennzahl der Wert bei einem Modul, wird es <i>nur für diese
                  Kennzahl</i> ausgelassen (n kann je Kennzahl variieren).
                </li>
              </ul>
            </div>
          )}
          {hasCost && (
            <div className="rounded-md bg-white/70 border border-emerald-100 p-3">
              <div className="font-medium text-slate-800 mb-1">Kosten (Summe über Mappings)</div>
              <ul className="space-y-1">
                <li>
                  <b>OPEX/Mt &amp; CAPEX, vorher → nachher</b> — Summe der je Mapping gepflegten Werte
                  ({" "}<code className="text-slate-500">vorher</code> /{" "}
                  <code className="text-slate-500">nachher</code>) über alle{" "}
                  {cost!["mapping-count"]} Mapping(s) dieses Pfads. CAPEX = einmalig, OPEX = monatlich, CHF.
                </li>
                <li>
                  Nur Mappings mit gepflegtem Betrag tragen zur jeweiligen Summe bei. Die Differenz
                  vorher→nachher ist der erwartete Effekt des Sovaia-Stacks.
                </li>
              </ul>
            </div>
          )}
          <div className="sm:col-span-2 text-[11px] text-slate-500 italic">
            Alle Werte sind <b>kuratierte Annahmen</b> aus der Sovaia/Classic-Referenz bzw. dem Tenant-Overlay —
            Planungsgrößen, keine gemessenen Ist-Werte. Schnitt = arithmetisches Mittel, ungewichtet
            (jedes Modul zählt gleich, unabhängig von Größe). Quelle: <code className="text-slate-400">impact</code>-
            Block je Sovaia-Knoten und <code className="text-slate-400">vorher/nachher</code> je Mapping
            (Feld <code className="text-slate-400">annahmen</code> dokumentiert die Mapping-Annahme).
          </div>
        </div>
      </details>
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
