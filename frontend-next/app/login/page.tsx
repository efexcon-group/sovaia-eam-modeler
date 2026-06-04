"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginInner() {
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "/";
  return (
    <main style={{ display: "grid", placeItems: "center", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Architecture Modeler</h1>
        <button
          type="button"
          onClick={() => signIn("keycloak", { callbackUrl })}
          style={{ padding: "10px 24px", fontSize: 15, borderRadius: 8, border: "none", background: "var(--accent, #2563eb)", color: "#fff", cursor: "pointer" }}
        >
          Anmelden
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
