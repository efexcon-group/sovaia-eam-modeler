import { useMemo } from "react";
import type { NavigatorMapping, NavigatorNode } from "../api-client";

interface Props {
  sovaia: NavigatorNode[];
  mappings: NavigatorMapping[];
}

interface TimelineEntry {
  kind: "sovaia" | "mapping";
  id: string;
  label: string;
  sortKey: number;            // 0 = immediately, 2026.5 = 2026-Q3, …
  display: string;             // "verfügbar ab 2026-Q3" o.ä.
  status?: string;
  /** Für Mappings: an wen ist es geknüpft (zur visuellen Gruppierung). */
  linkedSovaiaIds?: string[];
}

/** Wandelt 'immediately' | '2026-Q3' | 'YYYY-MM-DD' | undefined in eine
 *  sortierbare Float-Zahl. 'immediately' = sehr klein, undefiniert = sehr groß. */
function parseAvailableFrom(raw?: string | null): { sortKey: number; display: string } {
  if (!raw) return { sortKey: 9999, display: "Zeitpunkt offen" };
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "immediately") {
    return { sortKey: 0, display: "sofort verfügbar" };
  }
  // YYYY-Q[1-4]
  const q = s.match(/^(\d{4})-Q([1-4])$/i);
  if (q) {
    const year = Number(q[1]);
    const quarter = Number(q[2]);
    return { sortKey: year + (quarter - 1) * 0.25, display: `${year} Q${quarter}` };
  }
  // YYYY-MM-DD
  const dm = s.match(/^(\d{4})-(\d{2})/);
  if (dm) {
    const year = Number(dm[1]);
    const month = Number(dm[2]);
    return { sortKey: year + (month - 1) / 12, display: `${dm[1]}-${dm[2]}` };
  }
  return { sortKey: 9999, display: s };
}

function pickSovaiaEntries(sovaia: NavigatorNode[]): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  for (const n of sovaia) {
    const af = n.impact?.["available-from"];
    if (!af) continue;
    const parsed = parseAvailableFrom(af);
    out.push({
      kind: "sovaia",
      id: n.id,
      label: n["label-de"],
      sortKey: parsed.sortKey,
      display: parsed.display,
      status: n.impact?.["operational-status"] ?? n.tags?.status,
    });
  }
  return out;
}

function pickMappingEntries(
  mappings: NavigatorMapping[],
  sovaiaById: Map<string, NavigatorNode>,
): TimelineEntry[] {
  // Mapping-Verfügbarkeit = spätestes available-from aller Target-Sovaias
  // (Annahme: Mapping ist erst wirksam wenn ALLE Sovaia-Module live sind).
  const out: TimelineEntry[] = [];
  for (const m of mappings) {
    const targets = m["sovaia-node-ids"]
      .map((id) => sovaiaById.get(id))
      .filter(Boolean) as NavigatorNode[];
    if (!targets.length) continue;
    let maxKey = -1;
    let maxDisplay = "sofort verfügbar";
    for (const t of targets) {
      const parsed = parseAvailableFrom(t.impact?.["available-from"]);
      if (parsed.sortKey > maxKey) {
        maxKey = parsed.sortKey;
        maxDisplay = parsed.display;
      }
    }
    out.push({
      kind: "mapping",
      id: m.id,
      label: m["narrative-de"].split(/[.!?]/)[0].slice(0, 80),
      sortKey: maxKey,
      display: maxDisplay,
      linkedSovaiaIds: m["sovaia-node-ids"],
    });
  }
  return out;
}

function buildBuckets(entries: TimelineEntry[]): { key: string; label: string; items: TimelineEntry[] }[] {
  // Buckets: sofort | per Quartal | offen
  const buckets = new Map<string, { key: string; label: string; items: TimelineEntry[] }>();
  for (const e of entries) {
    let bucketKey: string;
    let bucketLabel: string;
    if (e.sortKey === 0) {
      bucketKey = "0-sofort";
      bucketLabel = "Sofort";
    } else if (e.sortKey >= 9999) {
      bucketKey = "9999-offen";
      bucketLabel = "Zeitpunkt offen";
    } else {
      const year = Math.floor(e.sortKey);
      const q = Math.round((e.sortKey - year) * 4) + 1;
      bucketKey = `${year}-Q${q}`;
      bucketLabel = `${year} Q${q}`;
    }
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, { key: bucketKey, label: bucketLabel, items: [] });
    buckets.get(bucketKey)!.items.push(e);
  }
  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function TimelinePanel({ sovaia, mappings }: Props) {
  const buckets = useMemo(() => {
    const sovaiaById = new Map(sovaia.map((n) => [n.id, n]));
    const all = [...pickSovaiaEntries(sovaia), ...pickMappingEntries(mappings, sovaiaById)];
    return buildBuckets(all);
  }, [sovaia, mappings]);

  if (buckets.length === 0) {
    return null;
  }

  return (
    <section className="px-4 py-3 border-t border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">
          Roadmap / Verfügbarkeit
        </h3>
        <span className="text-[10px] text-slate-400">
          {buckets.reduce((sum, b) => sum + b.items.length, 0)} Einträge
        </span>
      </div>
      <div className="space-y-3">
        {buckets.map((b) => (
          <div key={b.key} className="flex gap-3 items-start">
            <div className="w-24 shrink-0 text-xs font-medium text-slate-700">{b.label}</div>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {b.items.map((it) => {
                const color =
                  it.kind === "mapping"
                    ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                    : it.status === "live" || it.status === "released"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-50 text-slate-700 border-slate-200";
                const icon = it.kind === "mapping" ? "↔" : "●";
                return (
                  <span
                    key={`${it.kind}:${it.id}`}
                    className={`text-[11px] px-2 py-1 rounded border ${color}`}
                    title={`${it.kind === "mapping" ? "Mapping" : "Sovaia-Modul"}: ${it.label} — ${it.display}`}
                  >
                    <span className="mr-1 opacity-60">{icon}</span>
                    {it.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
