import NextAuth from "next-auth";

/**
 * Edge-Middleware: leitet nicht-autorisierte Requests auf /login um.
 * Eigene minimale Auth-Config (Edge-Runtime kann den Node-Provider nicht laden);
 * der Session-Cookie-Check reicht für den Redirect.
 */
const { auth: middlewareAuth } = NextAuth({ trustHost: true, providers: [] });

export default middlewareAuth((req) => {
  const { nextUrl } = req;
  const isPublic =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/favicon");
  if (isPublic) return;

  if (process.env.MOCK_AUTH === "true" && process.env.NODE_ENV !== "production") return;

  if (!req.auth?.user) {
    const url = new URL("/login", nextUrl.origin);
    url.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
