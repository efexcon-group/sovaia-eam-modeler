// Typisierter Wrapper um /v1/* der architecture-modeler-api.
// Iteration 0: nur Read-Operationen auf Sovaia-Reference + Stories.

export interface ReferenceNode {
  id: string;
  type: string;
  "label-de": string;
  "label-en"?: string;
  "summary-de"?: string;
  tags?: Record<string, string>;
  /** Bei Cluster-Anchors: relativer Pfad auf das Detail-File. */
  "detail-ref"?: string;
}

export interface ReferenceEdge {
  from: string;
  to: string;
  type: string;
  label?: string;
}

export interface ReferenceModel {
  "reference-version"?: string;
  "cluster-id"?: string;
  "cluster-version"?: string;
  brand?: string;
  industry?: string;
  "view-profile-default"?: string;
  nodes: ReferenceNode[];
  edges: ReferenceEdge[];
}

export interface StoryListItem {
  id: string;
  title: string;
  "industry-tag"?: string;
  "persona-target"?: string;
  "summary-de"?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

const API = "/v1";

export async function getHealth(): Promise<HealthResponse> {
  const r = await fetch(`${API}/health`);
  if (!r.ok) throw new Error(`/v1/health failed: ${r.status}`);
  return r.json();
}

export async function getSovaiaReference(): Promise<ReferenceModel> {
  const r = await fetch(`${API}/reference/sovaia`);
  if (!r.ok) throw new Error(`reference/sovaia failed: ${r.status}`);
  return r.json();
}

export async function getClusterDetail(refPath: string): Promise<ReferenceModel> {
  const safe = refPath.replace(/^\/+/, "");
  const r = await fetch(`${API}/reference/sovaia/${safe}`);
  if (!r.ok) throw new Error(`cluster ${refPath} failed: ${r.status}`);
  return r.json();
}

export async function listStories(): Promise<StoryListItem[]> {
  const r = await fetch(`${API}/reference/stories`);
  if (!r.ok) throw new Error(`stories failed: ${r.status}`);
  return r.json();
}
