import { useMemo, useState } from "react";
import {
  deleteClassic,
  generateClassic,
  revertSovaia,
  type CostAggregate,
  type NavigatorImpact,
  type NavigatorMapping,
  type NavigatorNode,
} from "../api-client";
import { EditDrawer } from "./EditDrawer";
import { MappingDrawer } from "./MappingDrawer";

interface Props {
  path: string;
  classic: NavigatorNode[];
  sovaia: NavigatorNode[];
  impact: NavigatorImpact;
  mappings?: NavigatorMapping[];
  costAggregate?: CostAggregate;
  onMutate: () => void;
}

type DrawerState =
  | { mode: "create" }
  | { mode: "edit-classic"; node: NavigatorNode }
  | { mode: "edit-sovaia"; node: NavigatorNode };

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    "in-use-everywhere": "bg-slate-200 text-slate-700",
    declining: "bg-amber-100 text-amber-800",
    niche: "bg-slate-100 text-slate-600",
    obsolete: "bg-rose-100 text-rose-800",
    live: "bg-emerald-100 text-emerald-800",
    released: "bg-emerald-100 text-emerald-800",
    beta: "bg-sky-100 text-sky-800",
    planned: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
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
  onEdit,
  onDelete,
  onRevert,
}: {
  node: NavigatorNode;
  side: "classic" | "sovaia";
  mappingCount?: number;
  isTransformation?: boolean;
  onEdit?: (n: NavigatorNode) => void;
  onDelete?: (n: NavigatorNode) => void;
  onRevert?: (n: NavigatorNode) => void;
}) {
  const tags = node.tags ?? {};
  const status =
    side === "classic"
      ? tags["operational-status"]
      : node.impact?.["operational-status"] ?? tags.status;
  const availableFrom = side === "sovaia" ? node.impact?.["available-from"] : undefined;

  return (
    <div className="group rounded-md border border-slate-200 bg-white p-3 relative">
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
      {node["summary-de"] && (
        <p className="mt-1 text-xs text-slate-500">{node["summary-de"]}</p>
      )}
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
      {availableFrom && (
        <div className="mt-1 text-[10px] text-slate-400">verfügbar ab {availableFrom}</div>
      )}
      {(onEdit || onDelete || onRevert) && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1 bg-white/80 rounded">
          {onEdit && (
            <button type="button" onClick={() => onEdit(node)}
              className="text-[10px] px-1.5 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              title="Bearbeiten">✎</button>
          )}
          {onRevert && (
            <button type="button" onClick={() => onRevert(node)}
              className="text-[10px] px-1.5 py-0.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
              title="Overlay verwerfen (Baseline wiederherstellen)">↩</button>
          )}
          {onDelete && (
            <button type="button" onClick={() => onDelete(node)}
              className="text-[10px] px-1.5 py-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
              title="Löschen">✕</button>
          )}
        </div>
      )}
    </div>
  );
}

function ImpactFooter({ impact, cost }: { impact: NavigatorImpact; cost?: CostAggregate }) {
  const hasImpact = impact && impact["sample-size"];
  const hasCost = cost && cost["mapping-count"];
  if (!hasImpact && !hasCost) return null;
  const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  const fmtChf = (v: number | null | undefined) => (v == null ? "—" : `CHF ${v.toLocaleString("de-CH")}`);

  return (
    <div className="mt-3 space-y-2">
      {hasImpact && (
        <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-900 flex flex-wrap gap-4">
          <div>
            <span className="text-emerald-700 font-medium">Automations-Grad ø</span>{" "}
            {impact["automation-grade"] != null ? `${impact["automation-grade"]}%` : "—"}
          </div>
          <div><span className="text-emerald-700 font-medium">Personal ø</span> {fmtPct(impact["headcount-delta"])}</div>
          <div><span className="text-emerald-700 font-medium">Cost ø</span> {fmtPct(impact["cost-delta"])}</div>
          <div className="text-emerald-700/70">{impact["sample-size"]} Sovaia-Module</div>
        </div>
      )}
      {hasCost && (
        <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-900">
          <div className="font-medium mb-1">Vorher / Nachher (Summe über {cost["mapping-count"]} Mapping(s))</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div className="text-slate-700">
              <span className="text-slate-500">vorher CAPEX:</span> {fmtChf(cost.vorher?.capex)}
            </div>
            <div className="text-emerald-700">
              <span className="text-slate-500">nachher CAPEX:</span> {fmtChf(cost.nachher?.capex)}
            </div>
            <div className="text-slate-700">
              <span className="text-slate-500">vorher OPEX/Mt:</span> {fmtChf(cost.vorher?.["opex-monatlich"])}
            </div>
            <div className="text-emerald-700">
              <span className="text-slate-500">nachher OPEX/Mt:</span> {fmtChf(cost.nachher?.["opex-monatlich"])}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MappingsList({
  mappings,
  classicById,
  sovaiaById,
  onEdit,
  onAdd,
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
        <h3 className="text-xs uppercase tracking-wide text-slate-500">
          Mappings <span className="text-slate-400">({mappings.length})</span>
        </h3>
        <button onClick={onAdd}
          className="text-[11px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">
          + Mapping
        </button>
      </div>
      {mappings.length === 0 ? (
        <div className="text-xs text-slate-400 italic">
          Noch keine Mappings auf diesem Pfad. „+ Mapping" anlegen, um Classic ↔ Sovaia zu verbinden.
        </div>
      ) : (
        <div className="space-y-2">
          {mappings.map((m) => {
            const cls = m["classic-node-id"] ? classicById.get(m["classic-node-id"]) : null;
            const targets = m["sovaia-node-ids"].map((id) => sovaiaById.get(id)).filter(Boolean) as NavigatorNode[];
            return (
              <button key={m.id} onClick={() => onEdit(m)}
                className="w-full text-left rounded-md border border-slate-200 bg-white p-3 hover:border-indigo-400 transition-colors">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1 flex-wrap">
                  {cls ? (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{cls["label-de"]}</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Transformation (neu)</span>
                  )}
                  <span className="text-slate-400">→</span>
                  {targets.map((t) => (
                    <span key={t.id} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {t["label-de"]}
                    </span>
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
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ComparePanel({
  path, classic, sovaia, impact, mappings = [], costAggregate, onMutate,
}: Props) {
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [mappingDrawer, setMappingDrawer] = useState<{ mode: "create" } | { mode: "edit"; mapping: NavigatorMapping } | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  // LLM-Batch nur sinnvoll wenn Pfad tiefer als Layer-Root ist.
  const canLlmBatch = path.includes("/");

  // Mapping-Beziehungen berechnen (id → mapping-count).
  const { classicMapCount, sovaiaMapCount, classicById, sovaiaById } = useMemo(() => {
    const classicMapCount = new Map<string, number>();
    const sovaiaMapCount = new Map<string, number>();
    const classicById = new Map(classic.map((n) => [n.id, n]));
    const sovaiaById = new Map(sovaia.map((n) => [n.id, n]));
    for (const m of mappings) {
      if (m["classic-node-id"]) {
        classicMapCount.set(m["classic-node-id"], (classicMapCount.get(m["classic-node-id"]) ?? 0) + 1);
      }
      for (const sid of m["sovaia-node-ids"]) {
        sovaiaMapCount.set(sid, (sovaiaMapCount.get(sid) ?? 0) + 1);
      }
    }
    return { classicMapCount, sovaiaMapCount, classicById, sovaiaById };
  }, [classic, sovaia, mappings]);

  const handleDelete = async (n: NavigatorNode) => {
    if (!confirm(`Classic-Knoten "${n["label-de"]}" löschen?`)) return;
    try {
      await deleteClassic(n.id);
      onMutate();
    } catch (e) {
      alert(`Löschen fehlgeschlagen: ${e}`);
    }
  };

  const handleRevertSovaia = async (n: NavigatorNode) => {
    if (!confirm(`Tenant-Override für "${n["label-de"]}" verwerfen und Baseline wiederherstellen?`)) return;
    try {
      await revertSovaia(n.id);
      onMutate();
    } catch (e) {
      alert(`Revert fehlgeschlagen: ${e}`);
    }
  };

  const handleGenerate = async () => {
    if (!canLlmBatch) return;
    setLlmBusy(true);
    setLlmError(null);
    try {
      const r = await generateClassic(path, 5);
      onMutate();
      if (r.count === 0) {
        setLlmError("LLM lieferte 0 Vorschläge.");
      }
    } catch (e) {
      setLlmError(String(e));
    } finally {
      setLlmBusy(false);
    }
  };

  if (classic.length === 0 && sovaia.length === 0) {
    return (
      <section className="px-4 py-4 border-t border-slate-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="text-xs text-slate-500">
            Keine zugeordneten Module auf diesem Pfad.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDrawer({ mode: "create" })}
              className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              + Classic anlegen
            </button>
            {canLlmBatch && (
              <button
                onClick={handleGenerate}
                disabled={llmBusy}
                className="text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {llmBusy ? "LLM …" : "✨ LLM-Vorschläge"}
              </button>
            )}
          </div>
        </div>
        {llmError && <div className="text-xs text-rose-700 mb-2">{llmError}</div>}
        <EditDrawer
          open={!!drawer}
          mode={drawer?.mode ?? "create"}
          node={drawer && drawer.mode !== "create" ? drawer.node : undefined}
          defaultPath={path}
          onClose={() => setDrawer(null)}
          onSaved={onMutate}
        />
      </section>
    );
  }

  return (
    <section className="px-4 py-4 border-t border-slate-200">
      <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
        Classic vs Sovaia AI Stack
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
              Classic Stack
              <span className="text-xs text-slate-400">({classic.length})</span>
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => setDrawer({ mode: "create" })}
                className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                + Neu
              </button>
              {canLlmBatch && (
                <button
                  onClick={handleGenerate}
                  disabled={llmBusy}
                  className="text-[11px] px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {llmBusy ? "LLM …" : "✨ LLM"}
                </button>
              )}
            </div>
          </div>
          {llmError && (
            <div className="text-xs text-rose-700 mb-2 bg-rose-50 border border-rose-200 rounded p-2">
              {llmError}
            </div>
          )}
          <div className="space-y-2">
            {classic.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Noch nicht erfasst.</div>
            ) : (
              classic.map((n) => (
                <NodeCard
                  key={n.id}
                  node={n}
                  side="classic"
                  mappingCount={classicMapCount.get(n.id) ?? 0}
                  onEdit={(node) => setDrawer({ mode: "edit-classic", node })}
                  onDelete={handleDelete}
                />
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
                    onEdit={(node) => setDrawer({ mode: "edit-sovaia", node })}
                    onRevert={handleRevertSovaia}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
      <ImpactFooter impact={impact} cost={costAggregate} />

      <MappingsList
        mappings={mappings}
        classicById={classicById}
        sovaiaById={sovaiaById}
        onEdit={(m) => setMappingDrawer({ mode: "edit", mapping: m })}
        onAdd={() => setMappingDrawer({ mode: "create" })}
      />

      <EditDrawer
        open={!!drawer}
        mode={drawer?.mode ?? "create"}
        node={drawer && drawer.mode !== "create" ? drawer.node : undefined}
        defaultPath={path}
        onClose={() => setDrawer(null)}
        onSaved={onMutate}
      />

      <MappingDrawer
        open={!!mappingDrawer}
        mode={mappingDrawer?.mode ?? "create"}
        mapping={mappingDrawer && mappingDrawer.mode === "edit" ? mappingDrawer.mapping : undefined}
        classicOptions={classic}
        sovaiaOptions={sovaia}
        onClose={() => setMappingDrawer(null)}
        onSaved={onMutate}
      />
    </section>
  );
}
