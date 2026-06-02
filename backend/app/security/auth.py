"""OIDC-Bearer-Validierung + Tenant-Ableitung (ADR-091 Login-Block, SPA-PKCE).

Design (additiv, fail-safe):
  - WENN ein Bearer-Token vorhanden ist, wird es gegen die JWKS des oidc_issuer
    validiert (RS256, audience + issuer geprüft). Der Tenant wird aus dem
    Token-Claim (oidc_tenant_claim) abgeleitet und überschreibt den
    X-EAM-Tenant-Header — ein authentifizierter Client kann den Tenant damit
    nicht mehr spoofen.
  - OHNE Token bleibt das bisherige Verhalten (Header/Default). Bricht weder den
    unauthentifizierten internen Betrieb noch den service-to-service-Call des
    status-sync-agent.
  - EAM_AUTH_REQUIRED=true erzwingt Authentifizierung (außer Health/Docs).

Jeder Validierungsfehler → behandelt wie „kein gültiges Token" (return None),
nie eine Exception nach außen. jose wird lazy importiert, damit das Modul auch
ohne installierte Dependency parst/importiert.
"""
from __future__ import annotations

import logging
import time

import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

log = logging.getLogger(__name__)

# Pfade, die ohne Authentifizierung erreichbar bleiben (auch bei auth_required).
_EXEMPT_PREFIXES = ("/health", "/v1/health", "/docs", "/redoc", "/openapi.json")

_JWKS_TTL_S = 3600.0
_jwks_cache: dict[str, object] = {"keys": None, "fetched": 0.0}


def _jwks_uri(issuer: str) -> str:
    # Keycloak-Konvention: {issuer}/protocol/openid-connect/certs
    return issuer.rstrip("/") + "/protocol/openid-connect/certs"


def _get_jwks(issuer: str, force: bool = False) -> dict:
    now = time.monotonic()
    cached = _jwks_cache.get("keys")
    if not force and cached and (now - float(_jwks_cache["fetched"])) < _JWKS_TTL_S:
        return cached  # type: ignore[return-value]
    with httpx.Client(timeout=10.0) as client:
        r = client.get(_jwks_uri(issuer))
        r.raise_for_status()
        keys = r.json()
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched"] = now
    return keys


def _find_key(jwks: dict, kid: str | None) -> dict | None:
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            return k
    return None


def verify_bearer(token: str, settings) -> dict | None:
    """Validiert ein Bearer-Token. Returnt die Claims oder None (nie Exception)."""
    try:
        from jose import jwt
        from jose.exceptions import JWTError  # noqa: F401

        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        jwks = _get_jwks(settings.oidc_issuer)
        key = _find_key(jwks, kid)
        if key is None:
            # Möglicher Key-Rollover → einmal neu laden.
            jwks = _get_jwks(settings.oidc_issuer, force=True)
            key = _find_key(jwks, kid)
        if key is None:
            return None
        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer,
        )
    except Exception as e:  # noqa: BLE001
        log.warning("Bearer-Validierung fehlgeschlagen: %s", e)
        return None


def _override_tenant_header(request: Request, tenant: str) -> None:
    """Ersetzt X-EAM-Tenant im ASGI-Scope durch den Token-Tenant."""
    name = b"x-eam-tenant"
    headers = [(k, v) for (k, v) in request.scope["headers"] if k.lower() != name]
    headers.append((name, tenant.encode()))
    request.scope["headers"] = headers


class AuthMiddleware(BaseHTTPMiddleware):
    """Validiert Bearer-Token (wenn vorhanden) und setzt den Tenant aus dem Claim."""

    def __init__(self, app, settings):
        super().__init__(app)
        self.settings = settings

    async def dispatch(self, request: Request, call_next):
        auth = request.headers.get("authorization", "")
        token = auth[7:].strip() if auth[:7].lower() == "bearer " else None
        claims = verify_bearer(token, self.settings) if token else None

        if claims:
            request.state.principal = claims
            tenant = claims.get(self.settings.oidc_tenant_claim)
            if tenant:
                _override_tenant_header(request, str(tenant).strip().lower())
        else:
            request.state.principal = None
            path = request.url.path
            exempt = any(path.startswith(p) for p in _EXEMPT_PREFIXES)
            if self.settings.auth_required and not exempt:
                return JSONResponse({"detail": "authentication required"}, status_code=401)

        return await call_next(request)
