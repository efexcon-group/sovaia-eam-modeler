import Link from "next/link";
import type { Schicht } from "@/lib/modeler-types";

interface Props {
  schichten: Schicht[];
  active?: string;
}

/** Layer-Reiter (Business / Application / … ) — Einstieg in den Drill-Down. */
export function LayerTabs({ schichten, active }: Props) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-4 pt-3">
      {schichten
        .slice()
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
        .map((s) => {
          const isActive = active === s.id;
          const isCross = s["cross-cutting"];
          return (
            <Link
              key={s.id}
              href={`/navigator/${s.id}`}
              title={s["description-de"]}
              className={[
                "px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-emerald-500 text-emerald-700 font-medium bg-emerald-50/40"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                isCross ? "italic" : "",
              ].join(" ")}
            >
              {s["label-de"]}
              {isCross && <span className="ml-1 text-[10px] text-slate-400">cross-cutting</span>}
            </Link>
          );
        })}
    </nav>
  );
}
