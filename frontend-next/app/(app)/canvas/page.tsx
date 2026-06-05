import Link from "next/link";
import { getCanvas } from "@/lib/api-client";
import type { CanvasResponse } from "@/lib/modeler-types";
import { CanvasStack } from "@/components/canvas/CanvasStack";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ scheme?: string }>;
}

/** Canvas-Layered-Stack (ADR-099): die Ontologie als geschichtetes, zoombares
 *  Blockbild — Schema-Toggle TOGAF/OSI, Infra-Overlay, Übergang zum Navigator. */
export default async function CanvasPage({ searchParams }: PageProps) {
  const { scheme: schemeParam } = await searchParams;

  let data: CanvasResponse | null = null;
  let error: string | null = null;
  try {
    data = await getCanvas(schemeParam === "osi" ? "osi" : "togaf");
  } catch (e) {
    error = String(e);
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-base font-semibold text-slate-900">Architektur-Stack</div>
            <div className="text-xs text-slate-500">
              Geschichteter Block-Stack — Drill-down je Baustein, Infra-Bedarf einblendbar (ADR-099)
            </div>
          </div>
          <Link
            href="/navigator"
            className="rounded-md bg-white shadow-sm border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            Stakeholder-Navigator →
          </Link>
        </div>
        {/* Schema-Toggle */}
        <nav className="flex gap-1 border-b border-slate-200 pt-3">
          {(data?.schemes ?? [{ id: "togaf", "label-de": "TOGAF-Schichten" }, { id: "osi", "label-de": "ISO/OSI-Layer" }]).map((s) => (
            <Link
              key={s.id}
              href={`/canvas?scheme=${s.id}`}
              className={[
                "px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
                (data?.scheme ?? "togaf") === s.id
                  ? "border-emerald-500 text-emerald-700 font-medium bg-emerald-50/40"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")}
            >
              {s["label-de"]}
            </Link>
          ))}
        </nav>
      </header>

      <div className="p-4">
        {error ? (
          <div className="text-xs text-rose-700 bg-rose-50 rounded-md px-3 py-2">Canvas-Fehler: {error}</div>
        ) : data ? (
          <CanvasStack layers={data.layers} />
        ) : (
          <div className="text-sm text-slate-500">Lade Stack…</div>
        )}
      </div>
    </div>
  );
}
