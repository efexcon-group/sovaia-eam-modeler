// Geteilte Typen für den Navigator-Read-Pfad (portiert aus der Vite-api-client).
// Nur das, was die Server-Components rendern — Mutationstypen folgen mit der
// Edit-Iteration (Phase B.2).

export type LicenseMode = "open" | "strict" | "preview";
export type LeaseMode = "full" | "demo";
export type LeaseStatus = "ACTIVE" | "GRACE" | "EXPIRED" | "SUSPENDED" | "PENDING" | "NONE";

export interface License {
  version: string;
  mode: LicenseMode;
  "allowed-layers": string[];
  "allowed-paths": string[];
  "lease-mode"?: LeaseMode;
  "lease-status"?: LeaseStatus;
  "renewal-reminder"?: boolean;
  tier?: string | null;
  "valid-until"?: string | null;
  source?: string;
}

export interface MeResponse {
  tenant: string;
  license: License | null;
}

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
  "classic-node-ids": string[];
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

// ── Edit-Payloads (Mutationen, Phase B.2) ────────────────────────────────

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

export interface MappingCreatePayload {
  "classic-node-ids": string[];
  "sovaia-node-ids": string[];
  "narrative-de": string;
  vorher?: { capex?: number; "opex-monatlich"?: number; annahmen?: string };
  nachher?: { capex?: number; "opex-monatlich"?: number; annahmen?: string };
  confidence?: number;
}

export interface GenerateClassicResponse {
  added: NavigatorNode[];
  count: number;
}

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

// ── Classic-Bibliothek (ADR-103) ─────────────────────────────────────────

export interface ClassicLibNode extends NavigatorNode {
  /** True, wenn der Baustein in der Kunden-Instanz übernommen ist. */
  _adopted?: boolean;
  /** True, wenn der Baustein kundeneigen (custom) ist. */
  _custom?: boolean;
}

export interface ClassicLibraryResponse {
  mode: "library" | "instance";
  nodes: ClassicLibNode[];
  count: number;
}

// ── Reference-Modell (Canvas) ────────────────────────────────────────────

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
