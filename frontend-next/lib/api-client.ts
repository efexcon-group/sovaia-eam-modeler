import { auth } from "./auth";
import type {
  ClassicLibraryResponse,
  MeResponse,
  NavigatorResponse,
  ScenarioGapResponse,
  ScenarioTarget,
  SchichtenResponse,
} from "./modeler-types";

const MODELER_API = process.env.MODELER_API_URL ?? "http://architecture-modeler-api.platform:8000";

/**
 * Server-seitiger Fetch zur FastAPI. Hängt den OIDC-Access-Token (aus der
 * NextAuth-Session) als Bearer an + die Demo-Persona aus dem Cookie (ADR-100).
 * Nur in Server-Components/Actions verwenden — der Token erreicht den Browser nicht.
 */
export async function modelerFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const session = (await auth()) as null | { accessToken?: string };
  const headers = new Headers(opts.headers);
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

  const { cookies } = await import("next/headers");
  const persona = (await cookies()).get("eam-demo-persona")?.value;
  if (persona?.startsWith("demo-")) headers.set("X-EAM-Demo-Persona", persona);

  if (!headers.has("Content-Type") && opts.body) headers.set("Content-Type", "application/json");
  const r = await fetch(`${MODELER_API}/v1${path}`, { ...opts, headers, cache: "no-store" });
  if (!r.ok) {
    throw Object.assign(new Error(`modeler-api ${r.status} on ${path}`), { status: r.status });
  }
  // 204 / leerer Body (DELETE-Endpoints) → undefined statt JSON-Parse-Fehler.
  if (r.status === 204) return undefined as T;
  const text = await r.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Typisierte Read-Helfer (Navigator) ──────────────────────────────────

/** Schichten/Layer der Taxonomie (LayerTabs-Quelle). */
export function getSchichten(): Promise<SchichtenResponse> {
  return modelerFetch<SchichtenResponse>("/taxonomy/schichten");
}

/** Navigator-Drill-Down auf einem Pfad (z.B. "business/healthcare/heim-pflege"). */
export function getNavigator(path: string): Promise<NavigatorResponse> {
  return modelerFetch<NavigatorResponse>(`/navigator?path=${encodeURIComponent(path)}`);
}

/** Aktueller Tenant + effektive Lizenz. */
export function getMe(): Promise<MeResponse> {
  return modelerFetch<MeResponse>("/me");
}

/** Classic-Bausteine als Bibliothek (Katalog) oder Instanz (Kundensicht). */
export function getClassicLibrary(mode: "library" | "instance" = "library"): Promise<ClassicLibraryResponse> {
  return modelerFetch<ClassicLibraryResponse>(`/navigator/classic?mode=${mode}`);
}

/** Wählbare Szenario-Ziele (Workload-Targets mit voraussetzt-Kanten). */
export function getScenarioTargets(): Promise<{ targets: ScenarioTarget[]; count: number }> {
  return modelerFetch("/scenario/targets");
}

/** Sovereign-AI-Readiness-Gap für ein Target (voraussetzt-Closure). */
export function getScenarioGap(target: string): Promise<ScenarioGapResponse> {
  return modelerFetch<ScenarioGapResponse>(`/scenario/gap?target=${encodeURIComponent(target)}`);
}
