import { useEffect, useState } from "react";
import {
  createClassic,
  patchClassic,
  patchSovaia,
  type ClassicCreatePayload,
  type ClassicPatchPayload,
  type NavigatorNode,
  type RefinePersona,
  type SovaiaPatchPayload,
} from "../api-client";
import { LLMHelperPopover } from "./LLMHelperPopover";

const NODE_TYPES = [
  "anwendung", "service", "datenraum", "dokument", "prozess",
  "nutzer-rolle", "schnittstelle", "touchpoint", "faehigkeit",
  "compliance-anker", "sicherheits-zone", "datenfluss",
];

const CLASSIC_OP_STATUS = ["in-use-everywhere", "declining", "niche", "obsolete"] as const;
const SOVAIA_OP_STATUS = ["planned", "beta", "released", "live", "deprecated"] as const;
const TIME_TO_VALUE = ["short", "medium", "long"] as const;

interface Props {
  open: boolean;
  mode: "create" | "edit-classic" | "edit-sovaia";
  node?: NavigatorNode;
  defaultPath: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditDrawer({ open, mode, node, defaultPath, onClose, onSaved }: Props) {
  // shared fields
  const [labelDe, setLabelDe] = useState("");
  const [summaryDe, setSummaryDe] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmOpen, setLlmOpen] = useState(false);

  // classic fields
  const [type, setType] = useState("anwendung");
  const [taxonomyPaths, setTaxonomyPaths] = useState(defaultPath);
  const [classicOp, setClassicOp] = useState<string>("in-use-everywhere");
  const [typicalTools, setTypicalTools] = useState("");

  // sovaia impact fields
  const [autoGrade, setAutoGrade] = useState<string>("");
  const [headcountDelta, setHeadcountDelta] = useState<string>("");
  const [costDelta, setCostDelta] = useState<string>("");
  const [timeToValue, setTimeToValue] = useState<string>("short");
  const [sovaiaOp, setSovaiaOp] = useState<string>("planned");
  const [availableFrom, setAvailableFrom] = useState<string>("");
  const [evidence, setEvidence] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLlmOpen(false);
    if ((mode === "edit-classic" || mode === "edit-sovaia") && node) {
      setLabelDe(node["label-de"] ?? "");
      setSummaryDe(node["summary-de"] ?? "");
      const tags = node.tags ?? {};
      setType(node.type ?? "anwendung");
      setTaxonomyPaths(tags["taxonomy-paths"] ?? defaultPath);
      if (mode === "edit-classic") {
        setClassicOp(tags["operational-status"] ?? "in-use-everywhere");
        setTypicalTools("");
      } else {
        const impact = node.impact ?? {};
        setAutoGrade(impact["automation-grade"]?.toString() ?? "");
        setHeadcountDelta(impact["headcount-delta"]?.toString() ?? "");
        setCostDelta(impact["cost-delta"]?.toString() ?? "");
        setTimeToValue(impact["time-to-value"] ?? "short");
        setSovaiaOp(impact["operational-status"] ?? tags.status ?? "planned");
        setAvailableFrom(impact["available-from"] ?? "");
        setEvidence(impact.evidence ?? "");
      }
    } else {
      // create-classic
      setLabelDe("");
      setSummaryDe("");
      setType("anwendung");
      setTaxonomyPaths(defaultPath);
      setClassicOp("in-use-everywhere");
      setTypicalTools("");
    }
  }, [open, mode, node, defaultPath]);

  if (!open) return null;

  const llmPersona: RefinePersona =
    mode === "edit-sovaia" ? "architect" : "decision-maker";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        const tools = typicalTools.split(",").map((s) => s.trim()).filter(Boolean);
        const payload: ClassicCreatePayload = {
          type,
          "label-de": labelDe,
          "summary-de": summaryDe || undefined,
          "taxonomy-paths": taxonomyPaths,
          "operational-status": classicOp,
          "typical-tools": tools.length ? tools : undefined,
        };
        await createClassic(payload);
      } else if (mode === "edit-classic" && node) {
        const tools = typicalTools.split(",").map((s) => s.trim()).filter(Boolean);
        const payload: ClassicPatchPayload = {
          "label-de": labelDe,
          "summary-de": summaryDe,
          "taxonomy-paths": taxonomyPaths,
          "operational-status": classicOp,
          "typical-tools": tools.length ? tools : undefined,
        };
        await patchClassic(node.id, payload);
      } else if (mode === "edit-sovaia" && node) {
        const impact: SovaiaPatchPayload["impact"] = {};
        if (autoGrade !== "")        impact["automation-grade"] = Number(autoGrade);
        if (headcountDelta !== "")   impact["headcount-delta"] = Number(headcountDelta);
        if (costDelta !== "")        impact["cost-delta"] = Number(costDelta);
        if (timeToValue)             impact["time-to-value"] = timeToValue;
        if (sovaiaOp)                impact["operational-status"] = sovaiaOp;
        if (availableFrom)           impact["available-from"] = availableFrom;
        if (evidence)                impact.evidence = evidence;
        const payload: SovaiaPatchPayload = {
          "label-de": labelDe,
          "summary-de": summaryDe,
          impact: Object.keys(impact).length ? impact : undefined,
        };
        await patchSovaia(node.id, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const headerLabel =
    mode === "create" ? "Classic-Knoten anlegen" :
    mode === "edit-classic" ? "Classic-Knoten bearbeiten" :
    "Sovaia-Knoten bearbeiten (Tenant-Overlay)";

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-[460px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto z-50 flex flex-col">
        <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">{headerLabel}</div>
            <div className="text-xs text-slate-500">{taxonomyPaths || defaultPath}</div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </header>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col">
          <div className="p-4 space-y-4 flex-1">

            {mode === "create" && (
              <Field label="Typ">
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                  {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            )}

            <Field label="Label (Deutsch)" llmButton={() => setLlmOpen(true)}>
              <input type="text" value={labelDe} onChange={(e) => setLabelDe(e.target.value)} required
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
            </Field>

            <Field label="Kurzbeschreibung" llmButton={() => setLlmOpen(true)}>
              <textarea value={summaryDe} onChange={(e) => setSummaryDe(e.target.value)} rows={4}
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
            </Field>

            {/* CLASSIC-spezifische Felder */}
            {(mode === "create" || mode === "edit-classic") && (
              <>
                <Field label="Taxonomie-Pfade (komma-getrennt)">
                  <input type="text" value={taxonomyPaths} onChange={(e) => setTaxonomyPaths(e.target.value)} required
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm font-mono" />
                </Field>
                <Field label="Betriebsstatus">
                  <select value={classicOp} onChange={(e) => setClassicOp(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                    {CLASSIC_OP_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Typische Tools (komma-getrennt)">
                  <input type="text" value={typicalTools} onChange={(e) => setTypicalTools(e.target.value)}
                    placeholder="z.B. Excel, SAP HR, Outlook"
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                </Field>
              </>
            )}

            {/* SOVAIA-spezifische Felder (Impact-Block) */}
            {mode === "edit-sovaia" && (
              <>
                <h3 className="text-xs uppercase tracking-wide text-slate-500 pt-2 border-t border-slate-200">
                  Wirkung (Impact)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Automation-Grad (0-100)">
                    <input type="number" min="0" max="100" value={autoGrade} onChange={(e) => setAutoGrade(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                  </Field>
                  <Field label="Time-to-Value">
                    <select value={timeToValue} onChange={(e) => setTimeToValue(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                      {TIME_TO_VALUE.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Headcount-Δ (-1 … +1)">
                    <input type="number" step="0.05" min="-1" max="1" value={headcountDelta} onChange={(e) => setHeadcountDelta(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                  </Field>
                  <Field label="Cost-Δ (-1 … +1)">
                    <input type="number" step="0.05" min="-1" max="1" value={costDelta} onChange={(e) => setCostDelta(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                  </Field>
                </div>
                <Field label="Operational-Status">
                  <select value={sovaiaOp} onChange={(e) => setSovaiaOp(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm">
                    {SOVAIA_OP_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Verfügbar ab (z.B. immediately, 2026-Q4)">
                  <input type="text" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                </Field>
                <Field label="Evidence (Pilot-Referenz, Customer-Case)">
                  <input type="text" value={evidence} onChange={(e) => setEvidence(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
                </Field>
                <p className="text-[11px] text-slate-500 italic">
                  Edits landen als Tenant-Overlay über der Baseline. Reset über
                  „Revert"-Aktion am Knoten möglich.
                </p>
              </>
            )}

            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2">
                {error}
              </div>
            )}
          </div>

          <footer className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
              disabled={submitting}>
              Abbrechen
            </button>
            <button type="submit" disabled={submitting || !labelDe}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
              {submitting ? "Speichern…" : mode === "create" ? "Anlegen" : "Speichern"}
            </button>
          </footer>
        </form>
      </aside>

      {llmOpen && (
        <LLMHelperPopover
          labelDe={labelDe}
          summaryDe={summaryDe}
          defaultPersona={llmPersona}
          onApply={(l, s) => { setLabelDe(l); setSummaryDe(s); }}
          onClose={() => setLlmOpen(false)}
        />
      )}
    </>
  );
}

function Field({ label, llmButton, children }: { label: string; llmButton?: () => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
        {llmButton && (
          <button type="button" onClick={llmButton}
            className="text-[10px] text-violet-600 hover:text-violet-800 px-1.5 py-0.5 rounded hover:bg-violet-50"
            title="LLM-Vorschlag holen">
            ✨ LLM
          </button>
        )}
      </div>
      {children}
    </label>
  );
}
