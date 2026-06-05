"use client";

import { useState } from "react";
import Link from "next/link";
import type { CanvasBlock, CanvasLayer, InfraDemand, InfraDimension } from "@/lib/modeler-types";

const INFRA_LABEL: Record<InfraDimension, string> = {
  gpu: "GPU",
  memory: "Memory",
  throughput: "Durchsatz",
  persistence: "AI-Persistenz",
  pipeline: "Pipeline",
  realtime: "Realtime",
};
const INFRA_ORDER: InfraDimension[] = ["gpu", "memory", "throughput", "persistence", "pipeline", "realtime"];
const LEVEL_NUM: Record<string, number> = { low: 1, medium: 2, high: 3 };
const LEVEL_STYLE: Record<string, string> = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};
const HEAT_BORDER: Record<number, string> = {
  3: "border-l-rose-400 bg-rose-50/40",
  2: "border-l-amber-400 bg-amber-50/40",
  1: "border-l-slate-300 bg-slate-50",
};
const PRESENCE: Record<string, { dot: string; label: string }> = {
  used: { dot: "bg-emerald-500", label: "in Instanz" },
  available: { dot: "bg-slate-300", label: "verfügbar" },
  sovaia: { dot: "bg-indigo-500", label: "Sovaia" },
};

function maxLevel(d?: InfraDemand): number {
  if (!d) return 0;
  return Math.max(0, ...Object.values(d).map((v) => LEVEL_NUM[v as string] ?? 0));
}

function InfraBadges({ demand }: { demand?: InfraDemand }) {
  if (!demand) return null;
  const dims = INFRA_ORDER.filter((d) => demand[d]);
  if (!dims.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {dims.map((d) => (
        <span key={d} className={`text-[9px] px-1 py-0.5 rounded border ${LEVEL_STYLE[demand[d]!]}`} title={`${INFRA_LABEL[d]}: ${demand[d]}`}>
          {INFRA_LABEL[d]}
        </span>
      ))}
    </span>
  );
}

function BlockCard({
  block,
  overlay,
  expanded,
  toggle,
}: {
  block: CanvasBlock;
  overlay: boolean;
  expanded: Set<string>;
  toggle: (p: string) => void;
}) {
  const isCat = block.kind === "category";
  const hasChildren = block.children.length > 0;
  const open = expanded.has(block.path);
  const heat = overlay ? maxLevel(block["infra-demand"]) : 0;
  const presence = block.presence ? PRESENCE[block.presence] : null;

  return (
    <div>
      <div
        onClick={() => hasChildren && toggle(block.path)}
        className={[
          "rounded-md border border-l-4 px-2.5 py-1.5 flex items-center gap-2 transition-colors",
          hasChildren ? "cursor-pointer hover:bg-slate-50" : "",
          heat ? HEAT_BORDER[heat] : "border-l-slate-200 bg-white",
        ].join(" ")}
      >
        {hasChildren ? (
          <span className={`text-slate-400 text-xs transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        ) : (
          presence && <span className={`inline-block w-2 h-2 rounded-full ${presence.dot}`} title={presence.label} />
        )}
        <span className="text-sm text-slate-900 font-medium">{block["label-de"]}</span>
        {isCat && block["node-count"] ? (
          <span className="text-[10px] text-slate-400">{block["node-count"]}</span>
        ) : null}
        {!isCat && block.status && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{block.status}</span>
        )}
        {overlay && <InfraBadges demand={block["infra-demand"]} />}
        <span className="flex-1" />
        <Link
          href={`/navigator/${block.path}`}
          onClick={(e) => e.stopPropagation()}
          title="Im Navigator öffnen"
          className="text-[11px] text-slate-400 hover:text-emerald-600 px-1"
        >
          ↗
        </Link>
      </div>
      {open && hasChildren && (
        <div className="ml-4 mt-1 pl-2 border-l border-slate-200 space-y-1">
          {block.children.map((c) => (
            <BlockCard key={c.path} block={c} overlay={overlay} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Interaktiver Layered-Stack: Layer-Bänder (Schema), Zoom-Drilldown je Block,
 *  Infra-Demand-Overlay (Heatmap), Übergang zum Navigator (↗). */
export function CanvasStack({ layers }: { layers: CanvasLayer[] }) {
  const [overlay, setOverlay] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (p: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const expandAll = () => {
    const all = new Set<string>();
    const walk = (b: CanvasBlock) => {
      if (b.children.length) {
        all.add(b.path);
        b.children.forEach(walk);
      }
    };
    layers.forEach((l) => l.blocks.forEach(walk));
    setExpanded(all);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setOverlay((v) => !v)}
          className={[
            "px-3 py-1.5 rounded-md border transition-colors",
            overlay ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
          ].join(" ")}
        >
          🔥 Infra-Bedarf {overlay ? "an" : "aus"}
        </button>
        <button type="button" onClick={expandAll} className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
          Alle aufklappen
        </button>
        <button type="button" onClick={() => setExpanded(new Set())} className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
          Einklappen
        </button>
        <span className="text-slate-300">·</span>
        {Object.entries(PRESENCE).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-slate-500">
            <span className={`inline-block w-2 h-2 rounded-full ${v.dot}`} /> {v.label}
          </span>
        ))}
        {overlay && (
          <>
            <span className="text-slate-300">·</span>
            {(["high", "medium", "low"] as const).map((lvl) => (
              <span key={lvl} className="flex items-center gap-1 text-slate-500">
                <span className={`inline-block w-3 h-3 rounded-sm border ${LEVEL_STYLE[lvl]}`} />
                {lvl === "high" ? "hoch" : lvl === "medium" ? "mittel" : "gering"}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Layer-Bänder */}
      <div className="space-y-2">
        {layers.map((layer) => (
          <div key={layer.id} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="w-36 shrink-0">
              <div className="text-sm font-semibold text-slate-700">{layer["label-de"]}</div>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              {layer.blocks.length === 0 ? (
                <div className="text-xs text-slate-400 italic">—</div>
              ) : (
                layer.blocks.map((b) => (
                  <BlockCard key={b.path} block={b} overlay={overlay} expanded={expanded} toggle={toggle} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
