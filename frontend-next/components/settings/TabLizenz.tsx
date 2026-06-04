import type { License } from "@/lib/modeler-types";

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

/** Settings-Tab „Lizenz & Update" (read-only, ADR-090/091) — aus /v1/me. */
export function TabLizenz({ license, appVersion }: { license: License | null; appVersion: string }) {
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
    <div className="max-w-xl">
      <h2 className="text-base font-semibold text-slate-900">Lizenz &amp; Software-Update</h2>
      <p className="text-xs text-slate-500 mt-1 mb-6">Lizenzstatus prüfen und Software-Stand einsehen.</p>

      <Section title="Lizenzstatus">
        {!license ? (
          <p className="text-sm text-slate-400">Keine Lizenzinformation verfügbar.</p>
        ) : (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {leaseStatus && <Row k="Status" v={STATUS_LABEL[leaseStatus] ?? leaseStatus} strong />}
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
            </dl>
            {license["renewal-reminder"] && (
              <Note tone="amber">
                {leaseStatus === "EXPIRED" ? "Lizenz abgelaufen" : "Lizenz läuft bald ab"} — die Nutzung
                bleibt vorerst möglich. Bitte rechtzeitig verlängern.
              </Note>
            )}
            {leaseMode === "demo" && (
              <Note tone="rose">
                Lizenz inaktiv — Nur-Lese-Modus. Bitte EFEXCON zur Reaktivierung kontaktieren.
              </Note>
            )}
          </>
        )}
      </Section>

      <Section title="Software-Update">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <Row k="Version" v={appVersion} />
        </dl>
        <Note tone="blue">
          Multi-Tenant-Betrieb (unser Cluster): Updates werden automatisch über den ArgoCD-Image-Updater
          eingespielt. Self-hosted-Betrieb erhält künftig einen kundengesteuerten Update-Pull (ADR-090 Option A).
        </Note>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>
      <div className="rounded-lg border border-slate-200 p-4">{children}</div>
    </div>
  );
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd className={[strong ? "font-semibold" : "", muted ? "text-slate-400" : "text-slate-900"].join(" ")}>{v}</dd>
    </>
  );
}

const NOTE_TONES: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  blue: "bg-blue-50 text-blue-800",
};

function Note({ tone, children }: { tone: keyof typeof NOTE_TONES; children: React.ReactNode }) {
  return <div className={`text-xs px-3 py-2 rounded-md mt-3 ${NOTE_TONES[tone]}`}>{children}</div>;
}
