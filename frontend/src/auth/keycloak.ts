import Keycloak from "keycloak-js";

/**
 * OIDC-Login via keycloak-js (SPA-PKCE, ADR-091 Login-Block).
 *
 * Additiv & nicht-brechend: standardmäßig AUS (VITE_AUTH_ENABLED ≠ "true").
 * Dann läuft die App wie bisher (kein Login, kein Bearer). Erst wenn der
 * Keycloak-Client existiert und VITE_AUTH_ENABLED=true gesetzt ist, wird der
 * Login-Flow erzwungen und der Bearer-Token an alle /v1-Requests gehängt
 * (siehe api-client.apiFetch). Symmetrisch zu EAM_AUTH_REQUIRED im Backend.
 */

export const AUTH_ENABLED = (import.meta.env.VITE_AUTH_ENABLED ?? "false") === "true";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "https://keycloak.int.efexcon.com",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "efexcon-group",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "architecture-modeler",
});

let started = false;

/** Initialisiert den Login-Flow. No-op (returnt false) wenn AUTH_ENABLED aus. */
export async function initAuth(): Promise<boolean> {
  if (!AUTH_ENABLED) return false;
  if (started) return keycloak.authenticated ?? false;
  started = true;
  const ok = await keycloak.init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });
  if (ok) {
    // Token regelmäßig erneuern; bei Fehlschlag erneut anmelden.
    setInterval(() => {
      keycloak.updateToken(60).catch(() => keycloak.login());
    }, 30_000);
  }
  return ok;
}

/** Aktueller Access-Token (für Authorization-Header) oder undefined. */
export function getToken(): string | undefined {
  return AUTH_ENABLED ? keycloak.token : undefined;
}

/** Logout via Keycloak (Redirect auf App-Origin). */
export function logout(): void {
  if (AUTH_ENABLED) keycloak.logout({ redirectUri: window.location.origin });
}

/** Identität aus dem geparsten Token (für das App-Shell-UserMenu). */
export function getAuthUser(): { id: string; name: string; email?: string } | undefined {
  const p = keycloak.tokenParsed as
    | { sub?: string; name?: string; preferred_username?: string; email?: string }
    | undefined;
  if (!p?.sub) return undefined;
  return { id: p.sub, name: p.name ?? p.preferred_username ?? p.email ?? p.sub, email: p.email };
}
