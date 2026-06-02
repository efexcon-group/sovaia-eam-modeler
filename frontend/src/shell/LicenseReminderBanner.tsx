import type { ReactNode } from "react";
import type { License } from "../api-client";

/**
 * Lizenz-Hinweisband (ADR-090, weiche Durchsetzung).
 *
 * - lease-mode "demo" (SUSPENDED/NONE) → roter Hinweis, nur Lesezugriff +
 *   Kontakt-CTA zur Reaktivierung.
 * - renewal-reminder true (GRACE/EXPIRED) → gelber Hinweis, Instanz läuft
 *   weiter, Bitte um Verlängerung.
 * - sonst (ACTIVE / Overlay-Source ohne Lease-Felder) → kein Band.
 *
 * Langfristig gehört dieses Band in @efexcon-group/app-shell-react (ADR-087), damit
 * alle Apps denselben Reminder zeigen. Hier bewusst dünn im Modeler gehalten.
 */
export function LicenseReminderBanner({ license }: { license: License | null }): JSX.Element | null {
  if (!license) return null;

  const validUntil = license["valid-until"]
    ? new Date(license["valid-until"]!).toLocaleDateString("de-CH")
    : null;

  if (license["lease-mode"] === "demo") {
    return (
      <Band bg="#fee2e2" fg="#991b1b" border="#fca5a5">
        <strong>Lizenz inaktiv.</strong> Der Modeler läuft im Nur-Lese-Modus
        {license["lease-status"] === "SUSPENDED" ? " (pausiert)" : ""}. Bitte
        kontaktieren Sie EFEXCON zur Reaktivierung.
      </Band>
    );
  }

  if (license["renewal-reminder"]) {
    const expired = license["lease-status"] === "EXPIRED";
    return (
      <Band bg="#fef3c7" fg="#854d0e" border="#fcd34d">
        <strong>{expired ? "Lizenz abgelaufen." : "Lizenz läuft bald ab."}</strong>{" "}
        Die Nutzung bleibt vorerst möglich
        {validUntil ? ` (gültig bis ${validUntil})` : ""}. Bitte verlängern Sie
        rechtzeitig.
      </Band>
    );
  }

  return null;
}

function Band({
  bg,
  fg,
  border,
  children,
}: {
  bg: string;
  fg: string;
  border: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      role="status"
      style={{
        background: bg,
        color: fg,
        borderBottom: `1px solid ${border}`,
        fontSize: 13,
        padding: "8px 16px",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
