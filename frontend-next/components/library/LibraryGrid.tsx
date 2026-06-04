"use client";

import { useMemo, useState, useTransition } from "react";
import type { ClassicLibNode } from "@/lib/modeler-types";
import { adoptClassic, unadoptClassic } from "@/app/(app)/bibliothek/actions";

interface Props {
  nodes: ClassicLibNode[];
  /** "library" zeigt Adopted-Status-Filter; "instance" = reine Kundensicht. */
  mode: "library" | "instance";
}

type AdoptedFilter = "all" | "adopted" | "library-only";

/** Filterbare Karten-Bibliothek der Classic-Bausteine (ADR-103, Google-Photos-
 *  Muster) mit Multi-Select „Übernehmen / Aus Instanz entfernen" (Phase B.2). */
export function LibraryGrid({ nodes, mode }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [adopted, setAdopted] = useState<AdoptedFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const types = useMemo(
    () => Array.from(new Set(nodes.map((n) => n.type).filter(Boolean) as string[])).sort(),
    [nodes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes.filter((n) => {
      if (type && n.type !== type) return false;
      if (mode === "library" && adopted === "adopted" && !n._adopted) return false;
      if (mode === "library" && adopted === "library-only" && n._adopted) return false;
      if (q) {
        const hay = `${n["label-de"]} ${n["summary-de"] ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [nodes, query, type, adopted, mode]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runAction = (fn: (ids: string[]) => Promise<void>) => {
    const ids = Array.from(selected);
    setError(null);
    startTransition(async () => {
      try {
        await fn(ids);
        setSelected(new Set());
      } catch (e) {
        setError(String(e));
      }
    });
  };

  return (
    <div className="px-4 py-4 pb-20">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche Baustein…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
        >
          <option value="">Alle Typen</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {mode === "library" && (
          <select
            value={adopted}
            onChange={(e) => setAdopted(e.target.value as AdoptedFilter)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
          >
            <option value="all">Alle</option>
            <option value="adopted">In Kunden-Instanz</option>
            <option value="library-only">Nur Bibliothek</option>
          </select>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} / {nodes.length} Bausteine
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-slate-500 py-8">Keine Bausteine für diese Filter.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((n) => (
            <LibraryCard
              key={n.id}
              node={n}
              mode={mode}
              selected={selected.has(n.id)}
              onToggle={() => toggle(n.id)}
            />
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:left-60 z-20 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] px-4 py-2.5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-700 font-medium">{selected.size} ausgewählt</span>
          {error && <span className="text-xs text-rose-600">{error}</span>}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={pending}
              className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Abwählen
            </button>
            {mode === "library" && (
              <button
                type="button"
                onClick={() => runAction(adoptClassic)}
                disabled={pending}
                className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? "…" : "In Instanz übernehmen"}
              </button>
            )}
            <button
              type="button"
              onClick={() => runAction(unadoptClassic)}
              disabled={pending}
              className="text-xs px-3 py-1.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              {pending ? "…" : "Aus Instanz entfernen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryCard({
  node,
  mode,
  selected,
  onToggle,
}: {
  node: ClassicLibNode;
  mode: "library" | "instance";
  selected: boolean;
  onToggle: () => void;
}) {
  const status = node.tags?.["operational-status"];
  return (
    <div
      onClick={onToggle}
      className={[
        "rounded-lg border bg-white p-3 flex flex-col cursor-pointer transition-colors",
        selected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:border-slate-300",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 accent-emerald-600"
          />
          <div className="font-medium text-sm text-slate-900 leading-snug">{node["label-de"]}</div>
        </div>
        {node._custom && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">eigen</span>
        )}
      </div>
      {node["summary-de"] && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-3 flex-1">{node["summary-de"]}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{node.type}</span>
        <div className="flex items-center gap-1">
          {status && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{status}</span>
          )}
          {mode === "library" &&
            (node._adopted ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">in Instanz</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">nur Bibliothek</span>
            ))}
        </div>
      </div>
    </div>
  );
}
