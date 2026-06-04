import { modelerFetch } from "@/lib/api-client";

/** Landing — beweist die Auth→Token→FastAPI-Kette (Phase A). */
export default async function HomePage() {
  let tenant = "—";
  try {
    const me = await modelerFetch<{ tenant: string }>("/me");
    tenant = me.tenant;
  } catch {
    tenant = "(API nicht erreichbar)";
  }
  return (
    <div style={{ padding: 28, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Architecture Modeler — Next.js (Phase A)</h1>
      <p style={{ marginTop: 8 }}>
        Angemeldet · Tenant: <strong>{tenant}</strong>
      </p>
      <p style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
        Navigator · Canvas · Bibliothek · Szenario · Einstellungen folgen (Phase B–D, ADR-104).
      </p>
    </div>
  );
}
