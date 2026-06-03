import { type ChangeEvent } from "react";
import { getDemoPersona, setDemoPersona } from "../api-client";

/**
 * Demo-Persona-Switcher (ADR-100). Erlaubt es (Admin), die Umgebung „als Kunde"
 * einer Branche zu zeigen — das Backend übernimmt den demo-*-Tenant als Sicht
 * (echtes License-Filtering, demo-Guardrail in der AuthMiddleware).
 *
 * Wechsel → Persona in localStorage + Reload, damit alle /v1-Daten mit der neuen
 * Sicht neu geladen werden.
 */
const PERSONAS: { value: string; label: string }[] = [
  { value: "", label: "Intern (Admin) — voller Zugriff" },
  { value: "demo-heim-pflege", label: "Demo: Heim & Pflege (CH)" },
  { value: "demo-logistik", label: "Demo: Logistik" },
  { value: "demo-field-service", label: "Demo: Field-Service / Services" },
  { value: "demo-energie", label: "Demo: Energie & Umwelt" },
];

export function DemoPersonaSwitcher() {
  const current = getDemoPersona();
  const isDemo = current.startsWith("demo-");

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    setDemoPersona(e.target.value);
    window.location.reload();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 16px",
        fontSize: 12,
        background: isDemo ? "#eff6ff" : "#f8fafc",
        borderBottom: `1px solid ${isDemo ? "#bfdbfe" : "#e2e8f0"}`,
        color: "#475569",
      }}
    >
      <span aria-hidden>👁️</span>
      <label htmlFor="demo-persona">Ansicht:</label>
      <select
        id="demo-persona"
        value={current}
        onChange={onChange}
        style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid #cbd5e1" }}
      >
        {PERSONAS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      {isDemo && (
        <span style={{ color: "#1e40af", fontWeight: 600 }}>
          — simulierte Kunden-Lizenz (Demo)
        </span>
      )}
    </div>
  );
}
