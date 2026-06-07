import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  getClusterDetail,
  getSovaiaReference,
  type ReferenceEdge,
  type ReferenceModel,
  type ReferenceNode,
} from "../api-client";
import { autoLayout } from "./layout";
import { ArchNode, type ArchNodeData } from "./nodes/ArchNode";

const NODE_TYPES = { arch: ArchNode };

function toFlowNode(n: ReferenceNode, expanded: boolean): Node<ArchNodeData> {
  return {
    id: n.id,
    type: "arch",
    position: { x: 0, y: 0 },
    data: {
      labelDe: n["label-de"],
      type: n.type,
      summary: n["summary-de"],
      status: n.tags?.status,
      hasDetail: Boolean(n["detail-ref"]),
      externalUrl: n["external-url"],
      expanded,
    },
  };
}

function toFlowEdge(e: ReferenceEdge, idx: number): Edge {
  return {
    id: `${e.from}->${e.to}-${idx}`,
    source: e.from,
    target: e.to,
    label: e.label ?? e.type,
    labelStyle: { fontSize: 10, fill: "#64748b" },
    labelBgStyle: { fill: "#f8fafc" },
    style: { stroke: "#cbd5e1", strokeWidth: 1.5 },
  };
}

interface State {
  models: ReferenceModel[];
  loadedClusters: Set<string>;
  loadingCluster: string | null;
  error: string | null;
}

export function ModelCanvas() {
  const [state, setState] = useState<State>({
    models: [],
    loadedClusters: new Set(),
    loadingCluster: null,
    error: null,
  });

  // Initial Top-Level laden.
  useEffect(() => {
    let alive = true;
    getSovaiaReference()
      .then((m) => {
        if (!alive) return;
        setState((s) => ({ ...s, models: [m] }));
      })
      .catch((e) => alive && setState((s) => ({ ...s, error: String(e) })));
    return () => {
      alive = false;
    };
  }, []);

  // Merge aller geladenen Modelle in einen Graph (Dedup über id).
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, ReferenceNode>();
    const edgeList: ReferenceEdge[] = [];

    for (const m of state.models) {
      for (const n of m.nodes ?? []) {
        // Letzter Gewinnt: Detail-Files können den Cluster-Anchor mit reicherem Inhalt überschreiben.
        nodeMap.set(n.id, { ...nodeMap.get(n.id), ...n });
      }
      for (const e of m.edges ?? []) {
        edgeList.push(e);
      }
    }

    const flowNodes: Node<ArchNodeData>[] = [];
    for (const n of nodeMap.values()) {
      const expanded = Boolean(n["detail-ref"] && state.loadedClusters.has(n["detail-ref"]));
      flowNodes.push(toFlowNode(n, expanded));
    }
    const flowEdges = edgeList.map(toFlowEdge);

    return { nodes: autoLayout(flowNodes, flowEdges, "TB"), edges: flowEdges };
  }, [state.models, state.loadedClusters]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    const d = node.data as ArchNodeData;
    if (!d.hasDetail || d.expanded) return;

    // detail-ref aus der originalen Reference holen.
    const ref = state.models
      .flatMap((m) => m.nodes ?? [])
      .find((n) => n.id === node.id)?.["detail-ref"];
    if (!ref) return;

    setState((s) => ({ ...s, loadingCluster: ref }));
    getClusterDetail(ref)
      .then((detail) => {
        setState((s) => ({
          ...s,
          models: [...s.models, detail],
          loadedClusters: new Set([...s.loadedClusters, ref]),
          loadingCluster: null,
        }));
      })
      .catch((e) =>
        setState((s) => ({ ...s, error: String(e), loadingCluster: null })),
      );
  }, [state.models]);

  if (state.error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>Fehler beim Reference-Load:</strong> {state.error}
        </div>
      </div>
    );
  }

  if (state.models.length === 0) {
    return <div className="p-6 text-sm text-slate-500">Lade Sovaia-Reference…</div>;
  }

  return (
    <div className="h-screen w-screen">
      <div className="absolute top-3 left-3 z-10 rounded-md bg-white shadow-sm border border-slate-200 px-3 py-2 text-xs text-slate-600">
        <div className="font-medium text-slate-900">Sovaia Architecture-Modeler</div>
        <div className="mt-0.5">
          Geladene Cluster: {state.loadedClusters.size}
          {state.loadingCluster && <span className="ml-2 text-amber-600">lade {state.loadingCluster}…</span>}
        </div>
        <div className="mt-0.5 text-slate-400">Klick auf orangenes „Detail laden" um Verticals / Stacks zu öffnen.</div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#e2e8f0" />
        <Controls />
        <MiniMap pannable zoomable nodeStrokeWidth={3} />
      </ReactFlow>
    </div>
  );
}
