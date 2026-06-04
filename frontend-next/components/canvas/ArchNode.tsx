import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getStatusStyle, getTypeStyle } from "@/lib/canvas/typeStyles";

export interface ArchNodeData extends Record<string, unknown> {
  labelDe: string;
  type: string;
  summary?: string;
  status?: string;
  hasDetail: boolean;
  expanded: boolean;
}

export function ArchNode({ data }: NodeProps) {
  const d = data as ArchNodeData;
  const t = getTypeStyle(d.type);
  const s = getStatusStyle(d.status);

  return (
    <div className="group rounded-lg bg-white shadow-sm border border-slate-200 hover:border-slate-400 transition-colors w-[240px]">
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />

      <div className="flex">
        <div className={`w-1.5 rounded-l-lg ${t.accent}`} />
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-sm text-slate-900 leading-snug truncate" title={d.labelDe}>
              {d.labelDe}
            </div>
            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
              {s.label}
            </span>
          </div>

          {d.summary && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2" title={d.summary}>
              {d.summary}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">{t.label}</span>
            {d.hasDetail && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  d.expanded ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-800 group-hover:bg-amber-200"
                }`}
              >
                {d.expanded ? "geladen" : "▸ Detail laden"}
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
    </div>
  );
}
