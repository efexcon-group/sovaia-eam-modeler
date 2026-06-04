"use server";

import { modelerFetch } from "@/lib/api-client";
import type {
  ClassicCreatePayload,
  ClassicPatchPayload,
  GenerateClassicResponse,
  MappingCreatePayload,
  NavigatorMapping,
  NavigatorNode,
  RefineRequest,
  RefineResponse,
  SovaiaPatchPayload,
} from "@/lib/modeler-types";

// Navigator-Mutationen als Server Actions (Phase B.2). Signaturen identisch
// zum bisherigen Vite-api-client, damit die Drawer fast 1:1 portieren. Die
// UI ruft nach Erfolg router.refresh() → Server-Component lädt frische Daten.

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

// ── Classic ──────────────────────────────────────────────────────────────

export async function createClassic(payload: ClassicCreatePayload): Promise<NavigatorNode> {
  return modelerFetch<NavigatorNode>("/edit/classic", json(payload));
}

export async function patchClassic(nodeId: string, payload: ClassicPatchPayload): Promise<void> {
  await modelerFetch(`/edit/classic/${encodeURIComponent(nodeId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteClassic(nodeId: string): Promise<void> {
  await modelerFetch(`/edit/classic/${encodeURIComponent(nodeId)}`, { method: "DELETE" });
}

// ── Sovaia (Tenant-Overlay) ───────────────────────────────────────────────

export async function patchSovaia(nodeId: string, payload: SovaiaPatchPayload): Promise<void> {
  await modelerFetch(`/edit/sovaia/${encodeURIComponent(nodeId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function revertSovaia(nodeId: string): Promise<void> {
  await modelerFetch(`/edit/sovaia/${encodeURIComponent(nodeId)}`, { method: "DELETE" });
}

// ── Mappings ───────────────────────────────────────────────────────────────

export async function createMapping(payload: MappingCreatePayload): Promise<NavigatorMapping> {
  return modelerFetch<NavigatorMapping>("/edit/mappings", json(payload));
}

export async function patchMapping(id: string, payload: Partial<MappingCreatePayload>): Promise<NavigatorMapping> {
  return modelerFetch<NavigatorMapping>(`/edit/mappings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteMapping(id: string): Promise<void> {
  await modelerFetch(`/edit/mappings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Intake (LLM) ───────────────────────────────────────────────────────────

export async function generateClassic(path: string, limit = 5): Promise<GenerateClassicResponse> {
  return modelerFetch<GenerateClassicResponse>("/intake/generate-classic", json({ path, limit }));
}

export async function refineDescription(req: RefineRequest): Promise<RefineResponse> {
  return modelerFetch<RefineResponse>("/intake/refine-description", json(req));
}
