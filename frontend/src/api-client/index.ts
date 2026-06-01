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

// ── Taxonomy + Navigator ────────────────────────────────────────────────

export interface Schicht {
  id: string;
  "label-de": string;
  "label-en"?: string;
  "description-de"?: string;
  "tree-file"?: string;
  "cross-cutting"?: boolean;
  order?: number;
}

export interface SchichtenResponse {
  "taxonomy-id": string;
  "taxonomy-version": string;
  schichten: Schicht[];
}

export interface NavigatorImpact {
  "automation-grade"?: number | null;
  "headcount-delta"?: number | null;
  "cost-delta"?: number | null;
  "sample-size"?: number;
}

export interface NavigatorChild {
  id: string;
  "label-de": string;
  "summary-de"?: string;
  path: string;
  "has-children": boolean;
}

export interface NavigatorNode {
  id: string;
  type?: string;
  "label-de": string;
  "summary-de"?: string;
  tags?: Record<string, string>;
  impact?: {
    "automation-grade"?: number;
    "headcount-delta"?: number;
    "cost-delta"?: number;
    "time-to-value"?: string;
    "operational-status"?: string;
    "available-from"?: string;
    evidence?: string;
  };
}

export interface NavigatorMapping {
  id: string;
  "classic-node-ids": string[];   // M:N. Leer = Transformation/Mehrwert.
  "sovaia-node-ids": string[];
  "narrative-de": string;
  vorher?: { capex?: number; "opex-monatlich"?: number; annahmen?: string };
  nachher?: { capex?: number; "opex-monatlich"?: number; annahmen?: string };
  confidence?: number;
  "created-at"?: string;
  "updated-at"?: string;
}

export interface CostAggregate {
  vorher?: { capex?: number | null; "opex-monatlich"?: number | null };
  nachher?: { capex?: number | null; "opex-monatlich"?: number | null };
  "mapping-count"?: number;
}

export interface NavigatorResponse {
  path: string;
  layer: string;
  tenant?: string;
  current: { id: string; "label-de": string; "summary-de"?: string };
  children: NavigatorChild[];
  classic: NavigatorNode[];
  sovaia: NavigatorNode[];
  mappings?: NavigatorMapping[];
  "impact-aggregate": NavigatorImpact;
  "cost-aggregate"?: CostAggregate;
}

export async function getSchichten(): Promise<SchichtenResponse> {
  const r = await fetch(`${API}/taxonomy/schichten`);
  if (!r.ok) throw new Error(`taxonomy/schichten failed: ${r.status}`);
  return r.json();
}

export async function getNavigator(path: string): Promise<NavigatorResponse> {
  const r = await fetch(`${API}/navigator?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`navigator failed: ${r.status} ${await r.text()}`);
  return r.json();
}

// ── Edit + Intake (Iteration 1b) ────────────────────────────────────────

export interface ClassicCreatePayload {
  type: string;
  "label-de": string;
  "summary-de"?: string;
  "taxonomy-paths": string;
  "operational-status"?: string;
  "typical-tools"?: string[];
}

export interface ClassicPatchPayload {
  "label-de"?: string;
  "summary-de"?: string;
  "taxonomy-paths"?: string;
  "operational-status"?: string;
  "available-from"?: string;
  "typical-tools"?: string[];
}

export async function createClassic(payload: ClassicCreatePayload): Promise<NavigatorNode> {
  const r = await fetch(`${API}/edit/classic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`createClassic failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function patchClassic(nodeId: string, payload: ClassicPatchPayload): Promise<void> {
  const r = await fetch(`${API}/edit/classic/${encodeURIComponent(nodeId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`patchClassic failed: ${r.status} ${await r.text()}`);
}

export async function deleteClassic(nodeId: string): Promise<void> {
  const r = await fetch(`${API}/edit/classic/${encodeURIComponent(nodeId)}`, {
    method: "DELETE",
  });
  if (!r.ok && r.status !== 204) {
    throw new Error(`deleteClassic failed: ${r.status} ${await r.text()}`);
  }
}

export interface GenerateClassicResponse {
  added: NavigatorNode[];
  count: number;
}

export async function generateClassic(
  path: string,
  limit = 5,
): Promise<GenerateClassicResponse> {
  const r = await fetch(`${API}/intake/generate-classic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, limit }),
  });
  if (!r.ok) throw new Error(`generateClassic failed: ${r.status} ${await r.text()}`);
  return r.json();
}

// ── Sovaia-Edit (Iteration 1d) ──────────────────────────────────────────

export interface SovaiaImpactPatch {
  "automation-grade"?: number;
  "headcount-delta"?: number;
  "cost-delta"?: number;
  "time-to-value"?: string;
  "operational-status"?: string;
  "available-from"?: string;
  evidence?: string;
}

export interface SovaiaPatchPayload {
  "label-de"?: string;
  "summary-de"?: string;
  impact?: SovaiaImpactPatch;
}

export async function patchSovaia(nodeId: string, payload: SovaiaPatchPayload): Promise<void> {
  const r = await fetch(`${API}/edit/sovaia/${encodeURIComponent(nodeId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`patchSovaia failed: ${r.status} ${await r.text()}`);
}

export async function revertSovaia(nodeId: string): Promise<void> {
  const r = await fetch(`${API}/edit/sovaia/${encodeURIComponent(nodeId)}`, {
    method: "DELETE",
  });
  if (!r.ok && r.status !== 204) {
    throw new Error(`revertSovaia failed: ${r.status} ${await r.text()}`);
  }
}

// ── Per-Card-LLM-Helper ─────────────────────────────────────────────────

export type RefineIntent = "improve" | "expand" | "shorten" | "from-keywords";
export type RefinePersona = "decision-maker" | "architect" | "functional";

export interface RefineRequest {
  "label-de": string;
  "summary-de"?: string;
  intent: RefineIntent;
  persona: RefinePersona;
  "extra-hint"?: string;
}

export interface RefineResponse {
  "label-de": string;
  "summary-de": string;
  model: string;
}

export async function refineDescription(req: RefineRequest): Promise<RefineResponse> {
  const r = await fetch(`${API}/intake/refine-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error(`refineDescription failed: ${r.status} ${await r.text()}`);
  return r.json();
}

// ── Mappings (für C3 — bereits exportiert) ──────────────────────────────

export interface MappingCreatePayload {
  "classic-node-ids": string[];
  "sovaia-node-ids": string[];
  "narrative-de": string;
  vorher?: { capex?: number; "opex-monatlich"?: number; annahmen?: string };
  nachher?: { capex?: number; "opex-monatlich"?: number; annahmen?: string };
  confidence?: number;
}

export interface MappingPatchPayload extends Partial<MappingCreatePayload> {}

export async function createMapping(payload: MappingCreatePayload): Promise<NavigatorMapping> {
  const r = await fetch(`${API}/edit/mappings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`createMapping failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function patchMapping(id: string, payload: MappingPatchPayload): Promise<NavigatorMapping> {
  const r = await fetch(`${API}/edit/mappings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`patchMapping failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function deleteMapping(id: string): Promise<void> {
  const r = await fetch(`${API}/edit/mappings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!r.ok && r.status !== 204) {
    throw new Error(`deleteMapping failed: ${r.status} ${await r.text()}`);
  }
}
