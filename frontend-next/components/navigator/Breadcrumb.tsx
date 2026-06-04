import Link from "next/link";

interface Props {
  segments: { id: string; label: string }[];
}

/** Breadcrumb über die Drill-Pfad-Segmente. */
export function Breadcrumb({ segments }: Props) {
  if (segments.length === 0) return null;
  return (
    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
      <ol className="flex flex-wrap items-center gap-1">
        {segments.map((s, i) => {
          const href = "/navigator/" + segments.slice(0, i + 1).map((x) => x.id).join("/");
          const last = i === segments.length - 1;
          return (
            <li key={href} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300">›</span>}
              {last ? (
                <span className="text-slate-900 font-medium">{s.label}</span>
              ) : (
                <Link href={href} className="text-slate-500 hover:text-slate-900">
                  {s.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
