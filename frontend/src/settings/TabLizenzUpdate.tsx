import { useEffect, useState } from "react";
import { getMe, type License } from "../api-client";

/**
 * Settings-Tab „Lizenz & Update" — Layout nach BLM TabLizenz (ADR-091).
 *
 * Lizenzstatus aus /v1/me (resolved License, ADR-090): mode/lease-mode,
 * lease-status, tier, gültig-bis, Zugriff. Plus Update-Sektion, die beide
 * Mechaniken abbildet (multi-tenant ArgoCD-Image-Updater vs self-hosted
 * Lease-Self-Update — Letzteres folgt mit ADR-090 Option A).
 */

const APP_VERSION = "0.1.0";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktiv",
  GRACE: "Kulanzfenster",
  EXPIRED: "Abgelaufen",
  SUSPENDED: "Deaktiviert",
  PENDING: "Ausstehend",
  NONE: "Keine Lizenz",
};

const MODE_LABEL: Record<string, string> = {
  open: "voller Zugriff (intern/Dev)",
  strict: "lizenziert",
  preview: "Preview",
};

export default function TabLizenzUpdate() {
  const [license, setLicense] = useState<License | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((me) => mounted && setLicense(me.license))
      .catch(() => {})
      .finally(() => mounted && setLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  const leaseMode = license?.["lease-mode"];
  const leaseStatus = license?.["lease-status"];
  const validUntil = license?.["valid-until"]
    ? new Date(license["valid-until"]!).toLocaleDateString("de-CH")
    : null;
  const modusText = leaseMode
    ? leaseMode === "full"
      ? "Vollversion"
      : "Demo (read-only)"
    : license
      ? MODE_LABEL[license.mode] ?? license.mode
      : "—";

  return (
    <div style={{ maxWidth: 620 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
        Lizenz &amp; Software-Update
      </h2>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 24px" }}>
        Lizenzstatus prüfen und Software-Stand einsehen.
      </p>

      {/* ── Lizenzstatus ── */}
      <Section title="Lizenzstatus">
        {!loaded ? (
          <Muted>Lädt …</Muted>
        ) : !license ? (
          <Muted>Keine Lizenzinformation verfügbar.</Muted>
        ) : (
          <>
            <Grid>
              {leaseStatus && (
                <Row k="Status" v={STATUS_LABEL[leaseStatus] ?? leaseStatus} strong />
              )}
              <Row k="Modus" v={modusText} />
              {license.tier && <Row k="Tier" v={license.tier} />}
              {validUntil && <Row k="Gültig bis" v={validUntil} />}
              <Row
                k="Zugriff"
                v={
                  license.mode === "open"
                    ? "alle Ebenen"
                    : `${license["allowed-paths"]?.length ?? 0} Pfad(e), ${license["allowed-layers"]?.length ?? 0} Layer`
                }
              />
              {license.source && <Row k="Quelle" v={license.source} muted />}
            </Grid>

            {license["renewal-reminder"] && (
              <Note bg="#fef3c7" fg="#854d0e">
                {leaseStatus === "EXPIRED" ? "Lizenz abgelaufen" : "Lizenz läuft bald ab"} —
                die Nutzung bleibt vorerst möglich. Bitte rechtzeitig verlängern.
              </Note>
            )}
            {leaseMode === "demo" && (
              <Note bg="#fee2e2" fg="#991b1b">
                Lizenz inaktiv — Nur-Lese-Modus. Bitte EFEXCON zur Reaktivierung kontaktieren.
              </Note>
            )}
          </>
        )}
      </Section>

      {/* ── Software-Update ── */}
      <Section title="Software-Update">
        <Grid>
          <Row k="Version" v={APP_VERSION} />
        </Grid>
        <Note bg="#eff6ff" fg="#1e40af">
          Multi-Tenant-Betrieb (unser Cluster): Updates werden automatisch über den
          ArgoCD-Image-Updater eingespielt. Self-hosted-Betrieb erhält künftig einen
          kundengesteuerten Update-Pull (ADR-090 Option A).
        </Note>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#334155" }}>{title}</div>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 13 }}>
      {children}
    </div>
  );
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <>
      <span style={{ color: "#64748b" }}>{k}</span>
      <span style={{ fontWeight: strong ? 600 : 400, color: muted ? "#94a3b8" : "#0f172a" }}>{v}</span>
    </>
  );
}

function Note({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, color: fg, fontSize: 12, padding: "8px 12px", borderRadius: 6, marginTop: 12 }}>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "#94a3b8" }}>{children}</div>;
}
