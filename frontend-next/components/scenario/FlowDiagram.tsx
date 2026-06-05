import type { FlowStep, InfraDimension, InfraLevel, ScenarioFlow } from "@/lib/modeler-types";

const INFRA_LABEL: Record<InfraDimension, string> = {
  gpu: "GPU",
  memory: "Memory",
  throughput: "Durchsatz",
  persistence: "AI-Persistenz",
  pipeline: "Pipeline",
  realtime: "Realtime",
};

const INFRA_ORDER: InfraDimension[] = ["gpu", "memory", "throughput", "persistence", "pipeline", "realtime"];

const LEVEL_STYLE: Record<InfraLevel, string> = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const KIND_GLYPH: Record<string, string> = {
  source: "▣",
  process: "⚙",
  model: "✦",
  store: "▤",
  query: "?",
  output: "▶",
};

/** Ablaufdiagramm eines Szenarios: Phasen → Schritte als Prozesskette, jeder
 *  Schritt mit Infra-Demand-Badges. Macht sichtbar, wo GPU/Memory/Pipeline/
 *  Persistenz/Realtime verbraucht werden (Investitions-Begründung). */
export function FlowDiagram({ flow }: { flow: ScenarioFlow }) {
  // Infra-Schwerpunkt über alle Schritte (für die Kernbotschaft).
  const allSteps = flow.phases.flatMap((p) => p.steps);
  const heat: Partial<Record<InfraDimension, number>> = {};
  for (const s of allSteps) {
    for (const [dim, lvl] of Object.entries(s["infra-demand"] ?? {})) {
      if (lvl === "high") heat[dim as InfraDimension] = (heat[dim as InfraDimension] ?? 0) + 1;
    }
  }
  const heatList = INFRA_ORDER.filter((d) => heat[d]).map((d) => `${INFRA_LABEL[d]} ×${heat[d]}`);

  return (
    <div className="space-y-5">
      {flow["summary-de"] && <p className="text-sm text-slate-600">{flow["summary-de"]}</p>}

      {/* Legende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="uppercase tracking-wide">Infra-Bedarf:</span>
        {(["high", "medium", "low"] as InfraLevel[]).map((lvl) => (
          <span key={lvl} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded-sm border ${LEVEL_STYLE[lvl]}`} />
            {lvl === "high" ? "hoch" : lvl === "medium" ? "mittel" : "gering"}
          </span>
        ))}
      </div>

      {/* Phasen → Prozesskette */}
      {flow.phases.map((phase) => (
        <section key={phase.id}>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">{phase["label-de"]}</h3>
          <div className="flex flex-wrap items-stretch gap-2">
            {phase.steps.map((step, i) => (
              <div key={step.id} className="flex items-stretch gap-2">
                <StepCard step={step} />
                {i < phase.steps.length - 1 && (
                  <span className="self-center text-slate-300 text-lg">→</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Kernbotschaft */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-900">
        <b>Wo die Investition sitzt:</b> der Chat / das Ergebnis ist der <i>letzte</i> Schritt —
        der Großteil von Rechenlast und Wert liegt davor.
        {heatList.length > 0 && (
          <div className="mt-1 text-xs text-indigo-800/80">
            Hoher Infra-Bedarf: {heatList.join(" · ")}.
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ step }: { step: FlowStep }) {
  const demand = step["infra-demand"] ?? {};
  const dims = INFRA_ORDER.filter((d) => demand[d]);
  const isEndpoint = step.kind === "source" || step.kind === "query" || step.kind === "output";
  return (
    <div
      className={[
        "w-44 shrink-0 rounded-lg border p-2.5 flex flex-col",
        isEndpoint ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <span>{KIND_GLYPH[step.kind] ?? "•"}</span>
        <span className="uppercase tracking-wide">{step.kind}</span>
      </div>
      <div className="font-medium text-sm text-slate-900 leading-snug mt-0.5">{step["label-de"]}</div>
      {step["summary-de"] && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-3">{step["summary-de"]}</p>}
      {dims.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {dims.map((d) => (
            <span key={d} className={`text-[9px] px-1 py-0.5 rounded border ${LEVEL_STYLE[demand[d]!]}`} title={`${INFRA_LABEL[d]}: ${demand[d]}`}>
              {INFRA_LABEL[d]}
            </span>
          ))}
        </div>
      )}
      {step["note-de"] && <p className="mt-1.5 text-[10px] italic text-rose-600/80 leading-snug">{step["note-de"]}</p>}
    </div>
  );
}
