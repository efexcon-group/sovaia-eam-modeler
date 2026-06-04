import { auth } from "./auth";

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
  return r.json() as Promise<T>;
}
