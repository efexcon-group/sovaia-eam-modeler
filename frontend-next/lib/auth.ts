import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

/**
 * NextAuth v5 — direkter Keycloak-Provider (Muster aus erp/web; der
 * app-shell-auth-Wrapper hatte einen Production-Bundle-Bug).
 *
 * Ergänzt um jwt/session-Callback: der OIDC-`access_token` aus Keycloak wird
 * auf die Session gelegt, damit lib/api-client ihn als Bearer an die FastAPI
 * weiterreicht (AuthMiddleware validiert + leitet Tenant aus dem Claim ab).
 *
 * MOCK_AUTH (nur Dev/Test, Hard-Stop im Production-Build) für Playwright.
 */
const MOCK_SESSION = {
  user: { id: "test-user", email: "test@dev.local", name: "Test User" },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export function isMockAuthEnabled(): boolean {
  if (process.env.MOCK_AUTH !== "true") return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error("MOCK_AUTH=true ist im Production-Build nicht erlaubt.");
  }
  return true;
}

const real = NextAuth({
  trustHost: true,
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      (session as { accessToken?: string }).accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});

type AuthFn = typeof real.auth;

const auth = ((...args: unknown[]) => {
  if (isMockAuthEnabled()) return Promise.resolve(MOCK_SESSION);
  return (real.auth as unknown as (...a: unknown[]) => unknown)(...args);
}) as unknown as AuthFn;

export { auth };
export const handlers = real.handlers;
export const signIn = real.signIn;
export const signOut = real.signOut;
