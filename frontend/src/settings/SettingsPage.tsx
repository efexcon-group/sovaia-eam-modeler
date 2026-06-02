import { useSearchParams } from "react-router-dom";
import TabLizenzUpdate from "./TabLizenzUpdate";

/**
 * Settings-Seite — Tab-Layout nach BLM-Vorbild (ADR-091).
 *
 * Top-Tabs: Allgemein · Benutzer & Rechte · Lizenz & Update · Reference/Tenant.
 * Implementiert: „Lizenz & Update" (konsumiert /v1/me, ADR-090). Die übrigen
 * Tabs sind Platzhalter — „Benutzer & Rechte" kommt über user-core (ADR-061),
 * „Reference/Tenant" als modeler-spezifischer Tab.
 */

type TabKey = "allgemein" | "benutzer-und-rechte" | "lizenz" | "reference";

const TABS: { id: TabKey; label: string }[] = [
  { id: "allgemein", label: "Allgemein" },
  { id: "benutzer-und-rechte", label: "Benutzer & Rechte" },
  { id: "lizenz", label: "Lizenz & Update" },
  { id: "reference", label: "Reference / Tenant" },
];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const active = (params.get("tab") as TabKey) || "lizenz";

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 20px" }}>Einstellungen</h1>

      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 28 }}>
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setParams({ tab: t.id })}
              style={{
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--accent)" : "#64748b",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {active === "lizenz" && <TabLizenzUpdate />}
      {active === "allgemein" && (
        <Placeholder>Allgemeine Einstellungen folgen.</Placeholder>
      )}
      {active === "benutzer-und-rechte" && (
        <Placeholder>
          Benutzerverwaltung, Rollen und Profile — angebunden über user-core (ADR-061).
          Folgt in der nächsten Phase.
        </Placeholder>
      )}
      {active === "reference" && (
        <Placeholder>Reference- und Tenant-Einstellungen folgen.</Placeholder>
      )}
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: "#94a3b8",
        border: "1px dashed #e2e8f0",
        borderRadius: 8,
        padding: "32px 20px",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
