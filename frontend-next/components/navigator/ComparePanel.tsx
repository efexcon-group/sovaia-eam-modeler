import type { NavigatorMapping, NavigatorNode } from "@/lib/modeler-types";

// Read-only-Port der Vite-ComparePanel (Phase B). Edit/Drag&Drop/LLM-Drawer
// folgen mit der Edit-Iteration (Phase B.2) als Client-Components.

const STATUS_STYLES: Record<string, string> = {
  "in-use-everywhere": "bg-slate-200 text-slate-700",
  declining: "bg-amber-100 text-amber-800",
  niche: "bg-slate-100 text-slate-600",
  obsolete: "bg-rose-100 text-rose-800",
  live: "bg-emerald-100 text-emerald-800",
  released: "bg-emerald-100 text-emerald-800",
  beta: "bg-sky-100 text-sky-800",
  planned: "bg-slate-100 text-slate-600",
};

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function SourceBadge({ node }: { node: NavigatorNode }) {
  const seeded = node.tags?.["seeded-by"];
  if (seeded === "llm-generated") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">LLM</span>;
  }
  if (seeded === "user-edit") {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">eigen</span>;
  }
  return null;
}

function NodeCard({
  node,
  side,
  mappingCount = 0,
  isTransformation = false,
}: {
  node: NavigatorNode;
  side: "classic" | "sovaia";
  mappingCount?: number;
  isTransformation?: boolean;
}) {
  const tags = node.tags ?? {};
  const status =
    side === "classic"
      ? tags["operational-status"]
      : node.impact?.["operational-status"] ?? tags.status;
  const availableFrom = side === "sovaia" ? node.impact?.["available-from"] : undefined;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 relative">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-slate-900 flex items-center gap-2 flex-wrap">
          {node["label-de"]}
          <SourceBadge node={node} />
          {mappingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800" title="Mappings">
              ↔ {mappingCount}
            </span>
          )}
          {isTransformation && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="Neue Capability, kein klassisches Pendant">
              Transformation
            </span>
          )}
        </div>
        <StatusPill status={status} />
      </div>
      {node["summary-de"] && <p className="mt-1 text-xs text-slate-500">{node["summary-de"]}</p>}
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
      {availableFrom && <div className="mt-1 text-[10px] text-slate-400">verfügbar ab {availableFrom}</div>}
    </div>
  );
}

function MappingsList({
  mappings,
  classicById,
  sovaiaById,
}: {
  mappings: NavigatorMapping[];
  classicById: Map<string, NavigatorNode>;
  sovaiaById: Map<string, NavigatorNode>;
}) {
  return (
    <section className="px-4 py-3 border-t border-slate-200 bg-slate-50/40">
      <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
        Mappings <span className="text-slate-400">({mappings.length})</span>
      </h3>
      {mappings.length === 0 ? (
        <div className="text-xs text-slate-400 italic">Noch keine Mappings auf diesem Pfad.</div>
      ) : (
        <div className="space-y-2">
          {mappings.map((m) => {
            const sources = (m["classic-node-ids"] ?? [])
              .map((id) => classicById.get(id))
              .filter(Boolean) as NavigatorNode[];
            const targets = m["sovaia-node-ids"].map((id) => sovaiaById.get(id)).filter(Boolean) as NavigatorNode[];
            return (
              <div key={m.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1 flex-wrap">
                  {sources.length === 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Transformation (neu)</span>
                  ) : (
                    sources.map((s) => (
                      <span key={s.id} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{s["label-de"]}</span>
                    ))
                  )}
                  <span className="text-slate-400">→</span>
                  {targets.map((t) => (
                    <span key={t.id} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">{t["label-de"]}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-700 line-clamp-2">{m["narrative-de"]}</p>
                {(m.vorher?.["opex-monatlich"] != null || m.nachher?.["opex-monatlich"] != null) && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    OPEX/Mt: <span className="text-slate-700">CHF {m.vorher?.["opex-monatlich"] ?? "—"}</span>
                    {" → "}
                    <span className="text-emerald-700 font-medium">CHF {m.nachher?.["opex-monatlich"] ?? "—"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Roadmap/Timeline (reine Ableitung — kein Hook nötig) ─────────────────

function parseAvailableFrom(raw?: string | null): { sortKey: number; display: string } {
  if (!raw) return { sortKey: 9999, display: "Zeitpunkt offen" };
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "immediately") return { sortKey: 0, display: "sofort verfügbar" };
  const q = s.match(/^(\d{4})-Q([1-4])$/i);
  if (q) {
    const year = Number(q[1]);
    const quarter = Number(q[2]);
    return { sortKey: year + (quarter - 1) * 0.25, display: `${year} Q${quarter}` };
  }
  const dm = s.match(/^(\d{4})-(\d{2})/);
  if (dm) {
    const year = Number(dm[1]);
    const month = Number(dm[2]);
    return { sortKey: year + (month - 1) / 12, display: `${dm[1]}-${dm[2]}` };
  }
  return { sortKey: 9999, display: s };
}

interface TimelineEntry {
  kind: "sovaia" | "mapping";
  id: string;
  label: string;
  sortKey: number;
  display: string;
  status?: string;
}

function TimelinePanel({ sovaia, mappings }: { sovaia: NavigatorNode[]; mappings: NavigatorMapping[] }) {
  const sovaiaById = new Map(sovaia.map((n) => [n.id, n]));
  const entries: TimelineEntry[] = [];

  for (const n of sovaia) {
    const af = n.impact?.["available-from"];
    if (!af) continue;
    const parsed = parseAvailableFrom(af);
    entries.push({
      kind: "sovaia",
      id: n.id,
      label: n["label-de"],
      sortKey: parsed.sortKey,
      display: parsed.display,
      status: n.impact?.["operational-status"] ?? n.tags?.status,
    });
  }
  for (const m of mappings) {
    const targets = m["sovaia-node-ids"].map((id) => sovaiaById.get(id)).filter(Boolean) as NavigatorNode[];
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
    entries.push({
      kind: "mapping",
      id: m.id,
      label: m["narrative-de"].split(/[.!?]/)[0].slice(0, 80),
      sortKey: maxKey,
      display: maxDisplay,
    });
  }

  const bucketsMap = new Map<string, { key: string; label: string; items: TimelineEntry[] }>();
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
      const qn = Math.round((e.sortKey - year) * 4) + 1;
      bucketKey = `${year}-Q${qn}`;
      bucketLabel = `${year} Q${qn}`;
    }
    if (!bucketsMap.has(bucketKey)) bucketsMap.set(bucketKey, { key: bucketKey, label: bucketLabel, items: [] });
    bucketsMap.get(bucketKey)!.items.push(e);
  }
  const buckets = Array.from(bucketsMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  if (buckets.length === 0) return null;

  return (
    <section className="px-4 py-3 border-t border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Roadmap / Verfügbarkeit</h3>
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

interface Props {
  classic: NavigatorNode[];
  sovaia: NavigatorNode[];
  mappings?: NavigatorMapping[];
}

export function ComparePanel({ classic, sovaia, mappings = [] }: Props) {
  const classicById = new Map(classic.map((n) => [n.id, n]));
  const sovaiaById = new Map(sovaia.map((n) => [n.id, n]));
  const classicMapCount = new Map<string, number>();
  const sovaiaMapCount = new Map<string, number>();
  for (const m of mappings) {
    for (const cid of m["classic-node-ids"] ?? []) classicMapCount.set(cid, (classicMapCount.get(cid) ?? 0) + 1);
    for (const sid of m["sovaia-node-ids"]) sovaiaMapCount.set(sid, (sovaiaMapCount.get(sid) ?? 0) + 1);
  }

  if (classic.length === 0 && sovaia.length === 0) {
    return (
      <section className="px-4 py-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">Keine zugeordneten Module auf diesem Pfad.</div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4 border-t border-slate-200">
      <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Classic vs Sovaia AI Stack</h2>
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
              classic.map((n) => (
                <NodeCard key={n.id} node={n} side="classic" mappingCount={classicMapCount.get(n.id) ?? 0} />
              ))
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
              sovaia.map((n) => {
                const count = sovaiaMapCount.get(n.id) ?? 0;
                return (
                  <NodeCard
                    key={n.id}
                    node={n}
                    side="sovaia"
                    mappingCount={count}
                    isTransformation={count === 0 && mappings.length > 0}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <TimelinePanel sovaia={sovaia} mappings={mappings} />
      <MappingsList mappings={mappings} classicById={classicById} sovaiaById={sovaiaById} />
    </section>
  );
}
