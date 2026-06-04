import Link from "next/link";
import type { NavigatorChild } from "@/lib/modeler-types";

interface Props {
  items: NavigatorChild[];
  emptyHint?: string;
}

/** Drill-Kacheln für die Kinder des aktuellen Pfads. */
export function TaxonomyTiles({ items, emptyHint }: Props) {
  if (items.length === 0) {
    return emptyHint ? (
      <div className="px-4 py-6 text-sm text-slate-500">{emptyHint}</div>
    ) : null;
  }
  return (
    <section className="px-4 py-4">
      <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Drill weiter</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((c) => (
          <Link
            key={c.path}
            href={`/navigator/${c.path}`}
            className="group rounded-lg border border-slate-200 bg-white p-3 hover:border-emerald-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm text-slate-900">{c["label-de"]}</div>
              <span className="text-slate-300 group-hover:text-emerald-500">→</span>
            </div>
            {c["summary-de"] && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{c["summary-de"]}</p>
            )}
            <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
              {c["has-children"] ? "weiter drillbar" : "Detail-Ebene"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
