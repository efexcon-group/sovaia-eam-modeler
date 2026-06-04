import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

// Knoten-Geometrie für das Layout. Halte das synchron mit der ArchNode-Card.
const NODE_W = 240;
const NODE_H = 96;

export function autoLayout(nodes: Node[], edges: Edge[], rankdir: "TB" | "LR" = "TB"): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 40, ranksep: 90, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
  });
}
