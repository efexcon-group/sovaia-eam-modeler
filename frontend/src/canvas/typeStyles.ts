// Visual-Mapping pro Node-Typ (15 Sovaia-C-Level-Typen aus schema.yaml).
// Farben: Tailwind-Slot-Klassen. Bewusst gedämpft (C-Level-Tonalität).

export interface TypeStyle {
  /** Tailwind-Klasse für die linke Akzent-Leiste der Knoten-Karte. */
  accent: string;
  /** Kurzes Typ-Label (Deutsch) — wird im Node-Footer angezeigt. */
  label: string;
}

const DEFAULT: TypeStyle = { accent: "bg-slate-400", label: "Element" };

const STYLES: Record<string, TypeStyle> = {
  anwendung:        { accent: "bg-sky-500",       label: "Anwendung" },
  service:          { accent: "bg-indigo-500",    label: "Service" },
  "ki-agent":       { accent: "bg-violet-500",    label: "KI-Agent" },
  datenraum:        { accent: "bg-amber-500",     label: "Datenraum" },
  dokument:         { accent: "bg-yellow-500",    label: "Dokument" },
  prozess:          { accent: "bg-rose-500",      label: "Prozess" },
  "nutzer-rolle":   { accent: "bg-pink-500",      label: "Rolle" },
  mandant:          { accent: "bg-emerald-600",   label: "Mandant" },
  schnittstelle:    { accent: "bg-cyan-500",      label: "Schnittstelle" },
  touchpoint:       { accent: "bg-fuchsia-500",   label: "Touchpoint" },
  faehigkeit:       { accent: "bg-teal-500",      label: "Fähigkeit" },
  "ai-use-case":    { accent: "bg-purple-500",    label: "AI-Use-Case" },
  "compliance-anker": { accent: "bg-slate-700",   label: "Compliance" },
  "sicherheits-zone": { accent: "bg-zinc-600",    label: "Security" },
  datenfluss:       { accent: "bg-orange-500",    label: "Datenfluss" },
};

export function getTypeStyle(type: string): TypeStyle {
  return STYLES[type] ?? DEFAULT;
}

// Status-Badges (visible on every node).
export function getStatusStyle(status?: string): { bg: string; text: string; label: string } {
  switch (status) {
    case "live":       return { bg: "bg-emerald-100", text: "text-emerald-800", label: "live" };
    case "released":   return { bg: "bg-sky-100",     text: "text-sky-800",     label: "released" };
    case "planned":    return { bg: "bg-slate-100",   text: "text-slate-600",   label: "planned" };
    case "deprecated": return { bg: "bg-rose-100",    text: "text-rose-800",    label: "deprecated" };
    default:           return { bg: "bg-slate-50",    text: "text-slate-500",   label: status ?? "—" };
  }
}
