/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" → OIDC-Login erzwingen (ADR-091). Default (unset) = aus → App läuft wie bisher. */
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
