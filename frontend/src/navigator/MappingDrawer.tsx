import { useEffect, useState } from "react";
import {
  createMapping,
  deleteMapping,
  patchMapping,
  type MappingCreatePayload,
  type NavigatorMapping,
  type NavigatorNode,
} from "../api-client";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  mapping?: NavigatorMapping;
  classicOptions: NavigatorNode[];
  sovaiaOptions: NavigatorNode[];
  defaultClassicIds?: string[];
  defaultSovaiaIds?: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function MappingDrawer({
  open, mode, mapping, classicOptions, sovaiaOptions,
  defaultClassicIds = [], defaultSovaiaIds = [],
  onClose, onSaved,
}: Props) {
  const [classicIds, setClassicIds] = useState<string[]>([]);
  const [sovaiaIds, setSovaiaIds] = useState<string[]>([]);
  const [narrative, setNarrative] = useState("");
  const [vorherCapex, setVorherCapex] = useState("");
  const [vorherOpex, setVorherOpex] = useState("");
  const [vorherAnn, setVorherAnn] = useState("");
  const [nachherCapex, setNachherCapex] = useState("");
  const [nachherOpex, setNachherOpex] = useState("");
  const [nachherAnn, setNachherAnn] = useState("");
  const [confidence, setConfidence] = useState("0.6");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && mapping) {
      setClassicIds(mapping["classic-node-ids"] ?? []);
      setSovaiaIds(mapping["sovaia-node-ids"] ?? []);
      setNarrative(mapping["narrative-de"] ?? "");
      setVorherCapex(mapping.vorher?.capex?.toString() ?? "");
      setVorherOpex(mapping.vorher?.["opex-monatlich"]?.toString() ?? "");
      setVorherAnn(mapping.vorher?.annahmen ?? "");
      setNachherCapex(mapping.nachher?.capex?.toString() ?? "");
      setNachherOpex(mapping.nachher?.["opex-monatlich"]?.toString() ?? "");
      setNachherAnn(mapping.nachher?.annahmen ?? "");
      setConfidence(mapping.confidence?.toString() ?? "0.6");
    } else {
      setClassicIds(defaultClassicIds);
      setSovaiaIds(defaultSovaiaIds);
      setNarrative("");
      setVorherCapex(""); setVorherOpex(""); setVorherAnn("");
      setNachherCapex(""); setNachherOpex(""); setNachherAnn("");
      setConfidence("0.6");
    }
  }, [open, mode, mapping, defaultClassicIds.join(","), defaultSovaiaIds.join(",")]);

  if (!open) return null;

  const toggleClassic = (id: string) =>
    setClassicIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSovaia = (id: string) =>
    setSovaiaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const buildPayload = (): MappingCreatePayload => {
    const num = (s: string) => (s === "" ? undefined : Number(s));
    const vorher = { capex: num(vorherCapex), "opex-monatlich": num(vorherOpex), annahmen: vorherAnn || undefined };
    const nachher = { capex: num(nachherCapex), "opex-monatlich": num(nachherOpex), annahmen: nachherAnn || undefined };
    const stripUndef = (o: any) => Object.fromEntries(Object.entries(o).filter(([_, v]) => v !== undefined));
    return {
      "classic-node-ids": classicIds,
      "sovaia-node-ids": sovaiaIds,
      "narrative-de": narrative,
      vorher: Object.values(stripUndef(vorher)).length ? stripUndef(vorher) : undefined,
      nachher: Object.values(stripUndef(nachher)).length ? stripUndef(nachher) : undefined,
      confidence: confidence === "" ? undefined : Number(confidence),
    };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) { setError("Narrativ ist Pflicht"); return; }
    if (sovaiaIds.length === 0) { setError("Mindestens ein Sovaia-Target"); return; }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        await createMapping(buildPayload());
      } else if (mapping) {
        await patchMapping(mapping.id, buildPayload());
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!mapping || !confirm("Mapping wirklich löschen?")) return;
    setSubmitting(true);
    try {
      await deleteMapping(mapping.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-[560px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto z-50 flex flex-col">
        <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-900">
            {mode === "create" ? "Mapping anlegen" : "Mapping bearbeiten"}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </header>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col">
          <div className="p-4 space-y-4 flex-1">

            <Field label={`Classic-Quellen (${classicIds.length} ausgewählt — leer = Transformation/Mehrwert)`}>
              <div className="border border-slate-300 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-100">
                {classicOptions.length === 0 && (
                  <div className="p-2 text-xs text-slate-400 italic">Keine Classic-Knoten am Pfad</div>
                )}
                {classicOptions.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={classicIds.includes(c.id)} onChange={() => toggleClassic(c.id)} />
                    <span>{c["label-de"]}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label={`Sovaia-Targets (${sovaiaIds.length} ausgewählt — mindestens 1 Pflicht)`}>
              <div className="border border-slate-300 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-100">
                {sovaiaOptions.length === 0 && (
                  <div className="p-2 text-xs text-slate-400 italic">Keine Sovaia-Knoten am Pfad</div>
                )}
                {sovaiaOptions.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={sovaiaIds.includes(s.id)} onChange={() => toggleSovaia(s.id)} />
                    <span>{s["label-de"]}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Narrativ (warum diese Transformation Sinn macht)">
              <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={4} required
                placeholder="z.B. Mehrere Excel-Listen werden zu einem zentralen AI-Schicht-Optimierer konsolidiert. Schichtbesetzung berücksichtigt Skill, ArG, Bewohner-Kontinuität in Sekunden."
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
            </Field>

            <div className="border border-slate-200 rounded-md p-3 bg-slate-50/50 space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Vorher (klassisch)</div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="CAPEX (CHF, einmalig)">
                  <input type="number" step="100" value={vorherCapex} onChange={(e) => setVorherCapex(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm" />
                </Field>
                <Field label="OPEX (CHF / Monat)">
                  <input type="number" step="100" value={vorherOpex} onChange={(e) => setVorherOpex(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm" />
                </Field>
              </div>
              <Field label="Annahmen / Rechenweg">
                <input type="text" value={vorherAnn} onChange={(e) => setVorherAnn(e.target.value)}
                  placeholder="z.B. Pflegedienstleitung 0.2 FTE bei CHF 75/h × 4 Wochen × 8h"
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm" />
              </Field>
            </div>

            <div className="border border-emerald-200 rounded-md p-3 bg-emerald-50/30 space-y-2">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Nachher (Sovaia)</div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="CAPEX (CHF, einmalig)">
                  <input type="number" step="100" value={nachherCapex} onChange={(e) => setNachherCapex(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm" />
                </Field>
                <Field label="OPEX (CHF / Monat)">
                  <input type="number" step="100" value={nachherOpex} onChange={(e) => setNachherOpex(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm" />
                </Field>
              </div>
              <Field label="Annahmen / Rechenweg">
                <input type="text" value={nachherAnn} onChange={(e) => setNachherAnn(e.target.value)}
                  placeholder="z.B. Subscription CHF 420 + 0.04 FTE Review"
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm" />
              </Field>
            </div>

            <Field label={`Confidence (${confidence})`}>
              <input type="range" min="0" max="1" step="0.05" value={confidence}
                onChange={(e) => setConfidence(e.target.value)} className="w-full" />
            </Field>

            {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2">{error}</div>}
          </div>

          <footer className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
            {mode === "edit" && (
              <button type="button" onClick={onDelete} disabled={submitting}
                className="text-xs text-rose-700 hover:text-rose-900 px-3 py-1.5 rounded">
                Löschen
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md">
              Abbrechen
            </button>
            <button type="submit" disabled={submitting}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
              {submitting ? "Speichern…" : mode === "create" ? "Anlegen" : "Speichern"}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
