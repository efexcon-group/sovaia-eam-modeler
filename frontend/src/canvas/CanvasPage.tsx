import { Link } from "react-router-dom";
import { ModelCanvas } from "./ModelCanvas";

export default function CanvasPage() {
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-20">
        <Link
          to="/navigator"
          className="rounded-md bg-white shadow-sm border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          ← Stakeholder-Navigator
        </Link>
      </div>
      <ModelCanvas />
    </div>
  );
}
