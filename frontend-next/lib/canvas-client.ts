"use client";

import type { ReferenceModel } from "./modeler-types";

// Client-seitige Fetches gegen die Next-Proxy-Route (same-origin). Der Bearer
// wird server-seitig in der Proxy-Route angehängt — hier kein Token nötig.

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} failed: ${r.status}`);
  return r.json() as Promise<T>;
}

/** Top-Level-Sovaia-Reference. */
export function getSovaiaReference(): Promise<ReferenceModel> {
  return getJson<ReferenceModel>("/api/reference/sovaia");
}

/** Cluster-/Detail-File (detail-ref, z.B. "verticals/heim-pflege.yaml"). */
export function getClusterDetail(refPath: string): Promise<ReferenceModel> {
  const safe = refPath.replace(/^\/+/, "");
  return getJson<ReferenceModel>(`/api/reference/sovaia/${safe}`);
}
