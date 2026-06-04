import Link from "next/link";
import { getSchichten } from "@/lib/api-client";

export const dynamic = "force-dynamic";

const DIMENSIONS = [
  { key: "data", label: "Daten" },
  { key: "tech", label: "Technologie" },
  { key: "ops", label: "Betrieb" },
  { key: "infra", label: "Infrastruktur" },
  { key: "governance", label: "Governance" },
];

/** Szenario-Advisor (ADR-096) — Einstieg/Konzept. Die Gap-Analyse-Pipeline
 *  (voraussetzt/fulfilled-by übers Graph + LLM) ist noch nicht im Backend;
 *  diese Seite rahmt den Advisor ehrlich und verlinkt in den Navigator. */
export default async function SzenarioPage() {
  const schichten = await getSchichten()
    .then((r) => r.schichten)
    .catch(() => null);

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-slate-900">Szenario-Advisor</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">in Vorbereitung</span>
        </div>
        <div className="text-xs text-slate-500">
          Architektur-Gaps in Entscheider-Sprache übersetzen (ADR-096)
        </div>
      </header>

      <div className="p-6 max-w-3xl space-y-6">
        <p className="text-sm text-slate-700">
          Der Szenario-Advisor beantwortet <strong>„Was wäre wenn?"</strong>: ausgehend von der
          Kunden-Situation (Classic-Stack) zeigt er, <strong>was der Sovaia-Stack ermöglicht</strong> und
          <strong> was ohne ihn fehlt</strong> — als Lücken-Analyse über das Ontologie-Modell, nicht als
          technische Architektur-Übung.
        </p>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">So funktioniert die Gap-Analyse</div>
          <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
            <li>
              Ein Ziel-Baustein wird über die Relation <code className="text-slate-500">voraussetzt</code>{" "}
              auf seine Vorbedingungen aufgelöst (Dependency-Closure).
            </li>
            <li>
              Pro Vorbedingung prüft der Advisor via <code className="text-slate-500">fulfilled-by</code>,
              ob der Kunden-Stack sie erfüllt — offen bleibt eine <strong>Lücke</strong>.
            </li>
            <li>
              Lücken werden je <strong>Dimension</strong> gruppiert und vom LLM in Entscheider-Sprache
              (Wirkung, Risiko, Aufwand) erklärt.
            </li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DIMENSIONS.map((d) => (
              <span key={d.key} className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600">
                {d.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="text-sm font-semibold text-slate-800 mb-1">Bis dahin: Vergleich im Navigator</div>
          <p className="text-sm text-slate-600 mb-3">
            Der Classic-vs-Sovaia-Vergleich mit Wirkungs-Metriken ist bereits im{" "}
            <strong>Stakeholder-Navigator</strong> verfügbar. Wähle eine Schicht als Einstieg:
          </p>
          {schichten ? (
            <div className="flex flex-wrap gap-2">
              {schichten
                .slice()
                .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
                .map((s) => (
                  <Link
                    key={s.id}
                    href={`/navigator/${s.id}`}
                    className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    {s["label-de"]} →
                  </Link>
                ))}
            </div>
          ) : (
            <Link href="/navigator" className="text-sm text-emerald-700 hover:underline">
              Zum Navigator →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
