"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteClassic, generateClassic, revertSovaia } from "@/app/(app)/navigator/actions";
import type { NavigatorMapping, NavigatorNode } from "@/lib/modeler-types";
import { EditDrawer } from "./EditDrawer";
import { MappingDrawer } from "./MappingDrawer";

const DND_MIME = "application/x-eam-node";

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
  if (seeded === "llm-generated") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">LLM</span>;
  if (seeded === "user-edit") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">eigen</span>;
  return null;
}

function NodeCard({
  node, side, mappingCount = 0, isTransformation = false, onEdit, onDelete, onRevert, onMap, onCrossDrop,
}: {
  node: NavigatorNode;
  side: "classic" | "sovaia";
  mappingCount?: number;
  isTransformation?: boolean;
  onEdit?: (n: NavigatorNode) => void;
  onDelete?: (n: NavigatorNode) => void;
  onRevert?: (n: NavigatorNode) => void;
  onMap?: (n: NavigatorNode) => void;
  onCrossDrop?: (receivingSide: "classic" | "sovaia", draggedSide: "classic" | "sovaia", draggedId: string) => void;
}) {
  const tags = node.tags ?? {};
  const status = side === "classic" ? tags["operational-status"] : node.impact?.["operational-status"] ?? tags.status;
  const availableFrom = side === "sovaia" ? node.impact?.["available-from"] : undefined;
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={[
        "group rounded-md border bg-white p-3 relative cursor-grab active:cursor-grabbing transition-all",
        dragOver ? "border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50/30" : "border-slate-200",
      ].join(" ")}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData(DND_MIME, `${side}:${node.id}`); e.dataTransfer.effectAllowed = "link"; }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DND_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "link";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const data = e.dataTransfer.getData(DND_MIME);
        if (!data) return;
        const [otherSide, otherId] = data.split(":");
        if (!otherSide || !otherId || otherSide === side) return;
        onCrossDrop?.(side, otherSide as "classic" | "sovaia", otherId);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-slate-900 flex items-center gap-2 flex-wrap">
          {node["label-de"]}
          <SourceBadge node={node} />
          {mappingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800" title="Mappings">↔ {mappingCount}</span>
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
            <div className="text-slate-500">Automation <span className="text-emerald-700 font-medium">{node.impact["automation-grade"]}%</span></div>
          )}
          {node.impact["headcount-delta"] !== undefined && (
            <div className="text-slate-500">Personal <span className="text-emerald-700 font-medium">{(node.impact["headcount-delta"] * 100).toFixed(0)}%</span></div>
          )}
          {node.impact["cost-delta"] !== undefined && (
            <div className="text-slate-500">Cost <span className="text-emerald-700 font-medium">{(node.impact["cost-delta"] * 100).toFixed(0)}%</span></div>
          )}
        </div>
      )}
      {availableFrom && <div className="mt-1 text-[10px] text-slate-400">verfügbar ab {availableFrom}</div>}
      {(onEdit || onDelete || onRevert || onMap) && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1 bg-white/80 rounded">
          {onMap && <button type="button" onClick={() => onMap(node)} className="text-[10px] px-1.5 py-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded" title="Verknüpfen">↔</button>}
          {onEdit && <button type="button" onClick={() => onEdit(node)} className="text-[10px] px-1.5 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded" title="Bearbeiten">✎</button>}
          {onRevert && <button type="button" onClick={() => onRevert(node)} className="text-[10px] px-1.5 py-0.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded" title="Overlay verwerfen">↩</button>}
          {onDelete && <button type="button" onClick={() => onDelete(node)} className="text-[10px] px-1.5 py-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded" title="Löschen">✕</button>}
        </div>
      )}
    </div>
  );
}

function MappingsList({
  mappings, classicById, sovaiaById, onEdit, onAdd,
}: {
  mappings: NavigatorMapping[];
  classicById: Map<string, NavigatorNode>;
  sovaiaById: Map<string, NavigatorNode>;
  onEdit: (m: NavigatorMapping) => void;
  onAdd: () => void;
}) {
  return (
    <section className="px-4 py-3 border-t border-slate-200 bg-slate-50/40">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Mappings <span className="text-slate-400">({mappings.length})</span></h3>
        <button onClick={onAdd} className="text-[11px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">+ Mapping</button>
      </div>
      {mappings.length === 0 ? (
        <div className="text-xs text-slate-400 italic">Noch keine Mappings auf diesem Pfad. „+ Mapping" anlegen.</div>
      ) : (
        <div className="space-y-2">
          {mappings.map((m) => {
            const sources = (m["classic-node-ids"] ?? []).map((id) => classicById.get(id)).filter(Boolean) as NavigatorNode[];
            const targets = m["sovaia-node-ids"].map((id) => sovaiaById.get(id)).filter(Boolean) as NavigatorNode[];
            return (
              <button key={m.id} onClick={() => onEdit(m)} className="w-full text-left rounded-md border border-slate-200 bg-white p-3 hover:border-indigo-400 transition-colors">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1 flex-wrap">
                  {sources.length === 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Transformation (neu)</span>
                  ) : (
                    sources.map((s) => <span key={s.id} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{s["label-de"]}</span>)
                  )}
                  <span className="text-slate-400">→</span>
                  {targets.map((t) => <span key={t.id} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">{t["label-de"]}</span>)}
                </div>
                <p className="text-xs text-slate-700 line-clamp-2">{m["narrative-de"]}</p>
                {(m.vorher?.["opex-monatlich"] != null || m.nachher?.["opex-monatlich"] != null) && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    OPEX/Mt: <span className="text-slate-700">CHF {m.vorher?.["opex-monatlich"] ?? "—"}</span>
                    {" → "}
                    <span className="text-emerald-700 font-medium">CHF {m.nachher?.["opex-monatlich"] ?? "—"}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Roadmap/Timeline (reine Ableitung) ───────────────────────────────────

function parseAvailableFrom(raw?: string | null): { sortKey: number; display: string } {
  if (!raw) return { sortKey: 9999, display: "Zeitpunkt offen" };
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "immediately") return { sortKey: 0, display: "sofort verfügbar" };
  const q = s.match(/^(\d{4})-Q([1-4])$/i);
  if (q) return { sortKey: Number(q[1]) + (Number(q[2]) - 1) * 0.25, display: `${q[1]} Q${q[2]}` };
  const dm = s.match(/^(\d{4})-(\d{2})/);
  if (dm) return { sortKey: Number(dm[1]) + (Number(dm[2]) - 1) / 12, display: `${dm[1]}-${dm[2]}` };
  return { sortKey: 9999, display: s };
}

interface TimelineEntry { kind: "sovaia" | "mapping"; id: string; label: string; sortKey: number; display: string; status?: string; }

function TimelinePanel({ sovaia, mappings }: { sovaia: NavigatorNode[]; mappings: NavigatorMapping[] }) {
  const sovaiaById = new Map(sovaia.map((n) => [n.id, n]));
  const entries: TimelineEntry[] = [];
  for (const n of sovaia) {
    const af = n.impact?.["available-from"];
    if (!af) continue;
    const p = parseAvailableFrom(af);
    entries.push({ kind: "sovaia", id: n.id, label: n["label-de"], sortKey: p.sortKey, display: p.display, status: n.impact?.["operational-status"] ?? n.tags?.status });
  }
  for (const m of mappings) {
    const targets = m["sovaia-node-ids"].map((id) => sovaiaById.get(id)).filter(Boolean) as NavigatorNode[];
    if (!targets.length) continue;
    let maxKey = -1, maxDisplay = "sofort verfügbar";
    for (const t of targets) {
      const p = parseAvailableFrom(t.impact?.["available-from"]);
      if (p.sortKey > maxKey) { maxKey = p.sortKey; maxDisplay = p.display; }
    }
    entries.push({ kind: "mapping", id: m.id, label: m["narrative-de"].split(/[.!?]/)[0].slice(0, 80), sortKey: maxKey, display: maxDisplay });
  }
  const bucketsMap = new Map<string, { key: string; label: string; items: TimelineEntry[] }>();
  for (const e of entries) {
    let bucketKey: string, bucketLabel: string;
    if (e.sortKey === 0) { bucketKey = "0-sofort"; bucketLabel = "Sofort"; }
    else if (e.sortKey >= 9999) { bucketKey = "9999-offen"; bucketLabel = "Zeitpunkt offen"; }
    else { const year = Math.floor(e.sortKey); const qn = Math.round((e.sortKey - year) * 4) + 1; bucketKey = `${year}-Q${qn}`; bucketLabel = `${year} Q${qn}`; }
    if (!bucketsMap.has(bucketKey)) bucketsMap.set(bucketKey, { key: bucketKey, label: bucketLabel, items: [] });
    bucketsMap.get(bucketKey)!.items.push(e);
  }
  const buckets = Array.from(bucketsMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  if (buckets.length === 0) return null;
  return (
    <section className="px-4 py-3 border-t border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Roadmap / Verfügbarkeit</h3>
        <span className="text-[10px] text-slate-400">{buckets.reduce((s, b) => s + b.items.length, 0)} Einträge</span>
      </div>
      <div className="space-y-3">
        {buckets.map((b) => (
          <div key={b.key} className="flex gap-3 items-start">
            <div className="w-24 shrink-0 text-xs font-medium text-slate-700">{b.label}</div>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {b.items.map((it) => {
                const color = it.kind === "mapping" ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                  : it.status === "live" || it.status === "released" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-50 text-slate-700 border-slate-200";
                return (
                  <span key={`${it.kind}:${it.id}`} className={`text-[11px] px-2 py-1 rounded border ${color}`} title={`${it.kind === "mapping" ? "Mapping" : "Sovaia-Modul"}: ${it.label} — ${it.display}`}>
                    <span className="mr-1 opacity-60">{it.kind === "mapping" ? "↔" : "●"}</span>{it.label}
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

// ── ComparePanel (interaktiv) ────────────────────────────────────────────

type DrawerState =
  | { mode: "create" }
  | { mode: "edit-classic"; node: NavigatorNode }
  | { mode: "edit-sovaia"; node: NavigatorNode };

type MappingDrawerState =
  | { mode: "create"; defaultClassicIds?: string[]; defaultSovaiaIds?: string[] }
  | { mode: "edit"; mapping: NavigatorMapping };

interface Props {
  path: string;
  classic: NavigatorNode[];
  sovaia: NavigatorNode[];
  mappings?: NavigatorMapping[];
}

export function ComparePanel({ path, classic, sovaia, mappings = [] }: Props) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [mappingDrawer, setMappingDrawer] = useState<MappingDrawerState | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  const canLlmBatch = path.includes("/");

  const { classicMapCount, sovaiaMapCount, classicById, sovaiaById } = useMemo(() => {
    const classicMapCount = new Map<string, number>();
    const sovaiaMapCount = new Map<string, number>();
    const classicById = new Map(classic.map((n) => [n.id, n]));
    const sovaiaById = new Map(sovaia.map((n) => [n.id, n]));
    for (const m of mappings) {
      for (const cid of m["classic-node-ids"] ?? []) classicMapCount.set(cid, (classicMapCount.get(cid) ?? 0) + 1);
      for (const sid of m["sovaia-node-ids"]) sovaiaMapCount.set(sid, (sovaiaMapCount.get(sid) ?? 0) + 1);
    }
    return { classicMapCount, sovaiaMapCount, classicById, sovaiaById };
  }, [classic, sovaia, mappings]);

  const handleDelete = async (n: NavigatorNode) => {
    if (!confirm(`Classic-Knoten "${n["label-de"]}" löschen?`)) return;
    try { await deleteClassic(n.id); refresh(); } catch (e) { alert(`Löschen fehlgeschlagen: ${e}`); }
  };
  const handleRevertSovaia = async (n: NavigatorNode) => {
    if (!confirm(`Tenant-Override für "${n["label-de"]}" verwerfen und Baseline wiederherstellen?`)) return;
    try { await revertSovaia(n.id); refresh(); } catch (e) { alert(`Revert fehlgeschlagen: ${e}`); }
  };
  const handleGenerate = async () => {
    if (!canLlmBatch) return;
    setLlmBusy(true); setLlmError(null);
    try {
      const r = await generateClassic(path, 5);
      refresh();
      if (r.count === 0) setLlmError("LLM lieferte 0 Vorschläge.");
    } catch (e) { setLlmError(String(e)); } finally { setLlmBusy(false); }
  };

  const drawerNode = drawer && drawer.mode !== "create" ? drawer.node : undefined;

  return (
    <section className="px-4 py-4 border-t border-slate-200">
      <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Classic vs Sovaia AI Stack</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
              Classic Stack <span className="text-xs text-slate-400">({classic.length})</span>
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setDrawer({ mode: "create" })} className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">+ Neu</button>
              {canLlmBatch && (
                <button onClick={handleGenerate} disabled={llmBusy} className="text-[11px] px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                  {llmBusy ? "LLM …" : "✨ LLM"}
                </button>
              )}
            </div>
          </div>
          {llmError && <div className="text-xs text-rose-700 mb-2 bg-rose-50 border border-rose-200 rounded p-2">{llmError}</div>}
          <div className="space-y-2">
            {classic.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Noch nicht erfasst.</div>
            ) : (
              classic.map((n) => (
                <NodeCard
                  key={n.id} node={n} side="classic" mappingCount={classicMapCount.get(n.id) ?? 0}
                  onEdit={(node) => setDrawer({ mode: "edit-classic", node })}
                  onDelete={handleDelete}
                  onMap={(node) => setMappingDrawer({ mode: "create", defaultClassicIds: [node.id] })}
                  onCrossDrop={(_r, draggedSide, draggedId) => {
                    if (draggedSide === "sovaia") setMappingDrawer({ mode: "create", defaultClassicIds: [n.id], defaultSovaiaIds: [draggedId] });
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Sovaia AI Stack <span className="text-xs text-emerald-400">({sovaia.length})</span>
          </h3>
          <div className="space-y-2">
            {sovaia.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Keine zugeordneten Sovaia-Module.</div>
            ) : (
              sovaia.map((n) => {
                const count = sovaiaMapCount.get(n.id) ?? 0;
                return (
                  <NodeCard
                    key={n.id} node={n} side="sovaia" mappingCount={count}
                    isTransformation={count === 0 && mappings.length > 0}
                    onEdit={(node) => setDrawer({ mode: "edit-sovaia", node })}
                    onRevert={handleRevertSovaia}
                    onMap={(node) => setMappingDrawer({ mode: "create", defaultSovaiaIds: [node.id] })}
                    onCrossDrop={(_r, draggedSide, draggedId) => {
                      if (draggedSide === "classic") setMappingDrawer({ mode: "create", defaultClassicIds: [draggedId], defaultSovaiaIds: [n.id] });
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <TimelinePanel sovaia={sovaia} mappings={mappings} />
      <MappingsList
        mappings={mappings} classicById={classicById} sovaiaById={sovaiaById}
        onEdit={(m) => setMappingDrawer({ mode: "edit", mapping: m })}
        onAdd={() => setMappingDrawer({ mode: "create" })}
      />

      <EditDrawer
        open={!!drawer} mode={drawer?.mode ?? "create"} node={drawerNode}
        defaultPath={path} onClose={() => setDrawer(null)} onSaved={refresh}
      />
      <MappingDrawer
        open={!!mappingDrawer} mode={mappingDrawer?.mode ?? "create"}
        mapping={mappingDrawer && mappingDrawer.mode === "edit" ? mappingDrawer.mapping : undefined}
        classicOptions={classic} sovaiaOptions={sovaia}
        defaultClassicIds={mappingDrawer && mappingDrawer.mode === "create" ? mappingDrawer.defaultClassicIds : undefined}
        defaultSovaiaIds={mappingDrawer && mappingDrawer.mode === "create" ? mappingDrawer.defaultSovaiaIds : undefined}
        onClose={() => setMappingDrawer(null)} onSaved={refresh}
      />
    </section>
  );
}
