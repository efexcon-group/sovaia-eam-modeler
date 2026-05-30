import { useEffect, useState } from "react";
import {
  createClassic,
  patchClassic,
  type ClassicCreatePayload,
  type ClassicPatchPayload,
  type NavigatorNode,
} from "../api-client";

const NODE_TYPES = [
  "anwendung",
  "service",
  "datenraum",
  "dokument",
  "prozess",
  "nutzer-rolle",
  "schnittstelle",
  "touchpoint",
  "faehigkeit",
  "compliance-anker",
  "sicherheits-zone",
  "datenfluss",
  // ki-agent + ai-use-case + mandant absichtlich raus — passt nicht zu Classic.
];

const OP_STATUS = ["in-use-everywhere", "declining", "niche", "obsolete"] as const;

interface Props {
  open: boolean;
  mode: "create" | "edit";
  node?: NavigatorNode;
  defaultPath: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditDrawer({ open, mode, node, defaultPath, onClose, onSaved }: Props) {
  const [type, setType] = useState("anwendung");
  const [labelDe, setLabelDe] = useState("");
  const [summaryDe, setSummaryDe] = useState("");
  const [taxonomyPaths, setTaxonomyPaths] = useState(defaultPath);
  const [opStatus, setOpStatus] = useState<string>("in-use-everywhere");
  const [typicalTools, setTypicalTools] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && node) {
      setType(node.type ?? "anwendung");
      setLabelDe(node["label-de"] ?? "");
      setSummaryDe(node["summary-de"] ?? "");
      setTaxonomyPaths(node.tags?.["taxonomy-paths"] ?? defaultPath);
      setOpStatus(node.tags?.["operational-status"] ?? "in-use-everywhere");
      setTypicalTools(""); // typical-tools nicht im Navigator-Response; nur eingebbar
    } else {
      setType("anwendung");
      setLabelDe("");
      setSummaryDe("");
      setTaxonomyPaths(defaultPath);
      setOpStatus("in-use-everywhere");
      setTypicalTools("");
    }
    setError(null);
  }, [open, mode, node, defaultPath]);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tools = typicalTools
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (mode === "create") {
        const payload: ClassicCreatePayload = {
          type,
          "label-de": labelDe,
          "summary-de": summaryDe || undefined,
          "taxonomy-paths": taxonomyPaths,
          "operational-status": opStatus,
          "typical-tools": tools.length ? tools : undefined,
        };
        await createClassic(payload);
      } else if (node) {
        const payload: ClassicPatchPayload = {
          "label-de": labelDe,
          "summary-de": summaryDe,
          "taxonomy-paths": taxonomyPaths,
          "operational-status": opStatus,
          "typical-tools": tools.length ? tools : undefined,
        };
        await patchClassic(node.id, payload);
      }
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
      <aside className="fixed top-0 right-0 h-screen w-[420px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto z-50 flex flex-col">
        <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">
              {mode === "create" ? "Classic-Knoten anlegen" : "Classic-Knoten bearbeiten"}
            </div>
            <div className="text-xs text-slate-500">{taxonomyPaths || defaultPath}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ×
          </button>
        </header>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col">
          <div className="p-4 space-y-4 flex-1">
            <Field label="Typ">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                disabled={mode === "edit"}
              >
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Label (Deutsch)">
              <input
                type="text"
                value={labelDe}
                onChange={(e) => setLabelDe(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              />
            </Field>

            <Field label="Kurzbeschreibung">
              <textarea
                value={summaryDe}
                onChange={(e) => setSummaryDe(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              />
            </Field>

            <Field label="Taxonomie-Pfade (komma-getrennt)">
              <input
                type="text"
                value={taxonomyPaths}
                onChange={(e) => setTaxonomyPaths(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm font-mono"
              />
            </Field>

            <Field label="Betriebsstatus">
              <select
                value={opStatus}
                onChange={(e) => setOpStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              >
                {OP_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Typische Tools (komma-getrennt)">
              <input
                type="text"
                value={typicalTools}
                onChange={(e) => setTypicalTools(e.target.value)}
                placeholder="z.B. Excel, SAP HR, Outlook"
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              />
            </Field>

            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2">
                {error}
              </div>
            )}
          </div>

          <footer className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
              disabled={submitting}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting || !labelDe}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
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
