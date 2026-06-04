"use client";

import { useState } from "react";
import { refineDescription } from "@/app/(app)/navigator/actions";
import type { RefineIntent, RefinePersona, RefineResponse } from "@/lib/modeler-types";

interface Props {
  labelDe: string;
  summaryDe: string;
  defaultPersona?: RefinePersona;
  onApply: (label: string, summary: string) => void;
  onClose: () => void;
}

const INTENTS: { value: RefineIntent; label: string }[] = [
  { value: "improve", label: "Verbessern (bestehendes feilen)" },
  { value: "expand", label: "Erweitern (mehr Tiefe)" },
  { value: "shorten", label: "Kürzen (auf Kernaussage)" },
  { value: "from-keywords", label: "Aus Stichworten (neu schreiben)" },
];

const PERSONAS: { value: RefinePersona; label: string }[] = [
  { value: "decision-maker", label: "C-Level / Decision-Maker" },
  { value: "architect", label: "Architekt" },
  { value: "functional", label: "Funktional" },
];

export function LLMHelperPopover({
  labelDe,
  summaryDe,
  defaultPersona = "decision-maker",
  onApply,
  onClose,
}: Props) {
  const [intent, setIntent] = useState<RefineIntent>("improve");
  const [persona, setPersona] = useState<RefinePersona>(defaultPersona);
  const [hint, setHint] = useState("");
  const [suggestion, setSuggestion] = useState<RefineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await refineDescription({
        "label-de": labelDe,
        "summary-de": summaryDe || undefined,
        intent,
        persona,
        "extra-hint": hint || undefined,
      });
      setSuggestion(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-900">✨ LLM-Beschreibung</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </header>

        <div className="p-4 space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Intent</div>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value as RefineIntent)}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            >
              {INTENTS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Persona</div>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as RefinePersona)}
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            >
              {PERSONAS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {(intent === "from-keywords" || intent === "expand") && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Extra-Hinweis (optional)</div>
              <textarea
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                rows={2}
                placeholder="z.B. 'Fokus auf KVG-Konformität' oder 'Stichworte: Auto-Disposition, Mobile-Erfassung'"
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
          )}

          <button
            onClick={fetchSuggestion}
            disabled={loading || !labelDe}
            className="w-full bg-violet-600 text-white rounded-md px-3 py-2 text-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "LLM denkt …" : "Vorschlag holen"}
          </button>

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2">{error}</div>
          )}

          {suggestion && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/30 p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-emerald-700">Vorschlag</div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Label</div>
                <div className="text-sm font-medium text-slate-900">{suggestion["label-de"]}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Beschreibung</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{suggestion["summary-de"]}</div>
              </div>
              <div className="text-[10px] text-slate-400">via {suggestion.model}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onApply(suggestion["label-de"], suggestion["summary-de"]); onClose(); }}
                  className="flex-1 bg-emerald-600 text-white rounded-md px-3 py-1.5 text-xs hover:bg-emerald-700"
                >
                  Übernehmen
                </button>
                <button
                  onClick={() => setSuggestion(null)}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
