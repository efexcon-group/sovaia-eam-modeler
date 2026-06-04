import Link from "next/link";
import { ModelCanvas } from "@/components/canvas/ModelCanvas";

export const dynamic = "force-dynamic";

/** Architekt-Canvas: interaktiver Graph der Sovaia-Reference (React-Flow). */
export default function CanvasPage() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute top-3 right-3 z-20">
        <Link
          href="/navigator"
          className="rounded-md bg-white shadow-sm border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          ← Stakeholder-Navigator
        </Link>
      </div>
      <ModelCanvas />
    </div>
  );
}
