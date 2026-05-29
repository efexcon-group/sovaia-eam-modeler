import { useEffect, useState } from "react";

interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/v1/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Sovaia Architecture-Modeler
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Iteration 0 — Foundation
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-3">Backend-Status</h2>
        {error ? (
          <p className="text-red-600 text-sm">Fehler: {error}</p>
        ) : health ? (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Service</dt>
            <dd className="font-mono">{health.service}</dd>
            <dt className="text-slate-500">Version</dt>
            <dd className="font-mono">{health.version}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd className="font-mono text-emerald-600">{health.status}</dd>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Lade Backend-Status…</p>
        )}
      </section>

      <footer className="mt-8 text-xs text-slate-400">
        ADR-082 · React-Flow-Canvas, Story-Player und Chat-Sidekick folgen in
        Phase B.
      </footer>
    </div>
  );
}
