import { useEffect, useState, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@efexcon-group/app-shell-theming/react";
import { SOVAIA_THEME } from "@efexcon-group/app-shell-theming";
import CanvasPage from "./canvas/CanvasPage";
import NavigatorPage from "./navigator/NavigatorPage";
import SettingsPage from "./settings/SettingsPage";
import ModelerShell from "./shell/ModelerShell";
import { AUTH_ENABLED, initAuth } from "./auth/keycloak";

/**
 * Erzwingt OIDC-Login bevor die App rendert — aber nur wenn AUTH_ENABLED
 * (VITE_AUTH_ENABLED=true). Sonst sofortiges Rendern wie bisher.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!AUTH_ENABLED);
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    initAuth()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);
  if (!ready) {
    return <div style={{ padding: 40, fontSize: 14, color: "#64748b" }}>Anmeldung …</div>;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider theme={SOVAIA_THEME}>
      <AuthGate>
      <HashRouter>
        <ModelerShell>
          <Routes>
            <Route path="/" element={<Navigate to="/navigator" replace />} />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/navigator/*" element={<NavigatorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/navigator" replace />} />
          </Routes>
        </ModelerShell>
      </HashRouter>
      </AuthGate>
    </ThemeProvider>
  );
}
