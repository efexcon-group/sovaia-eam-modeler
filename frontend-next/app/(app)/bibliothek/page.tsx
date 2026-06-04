import Link from "next/link";
import { getClassicLibrary } from "@/lib/api-client";
import type { ClassicLibraryResponse } from "@/lib/modeler-types";
import { LibraryGrid } from "@/components/library/LibraryGrid";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ mode?: string }>;
}

/** Classic-Bibliothek (ADR-103): Katalog aller Bausteine vs adoptierte Kunden-Instanz. */
export default async function BibliothekPage({ searchParams }: PageProps) {
  const { mode: rawMode } = await searchParams;
  const mode: "library" | "instance" = rawMode === "instance" ? "instance" : "library";

  let data: ClassicLibraryResponse | null = null;
  let error: string | null = null;
  try {
    data = await getClassicLibrary(mode);
  } catch (e) {
    error = String(e);
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 pt-3">
          <div className="text-base font-semibold text-slate-900">Bibliothek</div>
          <div className="text-xs text-slate-500">
            Classic-Bausteine — Katalog vs Kunden-Instanz (ADR-103)
          </div>
        </div>
        <nav className="flex gap-1 border-b border-slate-200 px-4 pt-3">
          <Tab href="/bibliothek?mode=library" label="Bibliothek (Katalog)" active={mode === "library"} />
          <Tab href="/bibliothek?mode=instance" label="Kunden-Instanz" active={mode === "instance"} />
        </nav>
      </header>

      {error ? (
        <div className="px-4 py-3 text-xs text-rose-700 bg-rose-50">Bibliothek-Fehler: {error}</div>
      ) : data && data.nodes.length > 0 ? (
        <LibraryGrid nodes={data.nodes} mode={mode} />
      ) : (
        <div className="px-4 py-8 text-sm text-slate-500">
          {mode === "instance"
            ? "Noch keine Bausteine in der Kunden-Instanz übernommen."
            : "Keine Classic-Bausteine im Katalog."}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
        active
          ? "border-emerald-500 text-emerald-700 font-medium bg-emerald-50/40"
          : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
