/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" → OIDC-Login erzwingen (ADR-091). Default (unset) = aus → App läuft wie bisher. */
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  /** Alias eines Realm-IdP (z.B. Entra) → Direkt-Login ohne Auswahl-Dialog. */
  readonly VITE_KEYCLOAK_IDP_HINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
