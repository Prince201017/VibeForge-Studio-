"""
[Claude.A11] Core authentication logic — Clerk JWT verification
File: python-service/auth.py

Verifies Clerk-issued session JWTs using their published JWKS, extracts
claims into a typed CurrentUser, and exposes session bookkeeping used by
session.py-style consumers.
"""

from __future__ import annotations

import os
import time
import logging
from dataclasses import dataclass
from typing import Optional

import httpx
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError

logger = logging.getLogger("forgeos.auth")

CLERK_ISSUER = os.environ.get("CLERK_ISSUER", "")  # e.g. https://your-app.clerk.accounts.dev
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", f"{CLERK_ISSUER}/.well-known/jwks.json")
CLERK_AUDIENCE = os.environ.get("CLERK_AUDIENCE")  # optional, if configured in Clerk
JWKS_CACHE_TTL_SECONDS = 3600

_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}


class AuthError(Exception):
    """Raised for any authentication failure. Caught by auth_middleware."""

    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: Optional[str]
    session_id: Optional[str]
    org_id: Optional[str]
    claims: dict


async def _get_jwks() -> dict:
    """Fetches and caches Clerk's JWKS. Refreshes every JWKS_CACHE_TTL_SECONDS."""
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < JWKS_CACHE_TTL_SECONDS:
        return _jwks_cache

    if not CLERK_JWKS_URL:
        raise AuthError("Server misconfiguration: CLERK_ISSUER not set", status_code=500)

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(CLERK_JWKS_URL)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("Failed to fetch JWKS from Clerk: %s", exc)
            # If we have a stale cache, prefer serving from it over hard-failing.
            if _jwks_cache["keys"]:
                return _jwks_cache
            raise AuthError("Unable to verify credentials at this time", status_code=503) from exc

    data = resp.json()
    _jwks_cache["keys"] = data.get("keys", [])
    _jwks_cache["fetched_at"] = now
    return _jwks_cache


def _find_key(jwks: dict, kid: str) -> Optional[dict]:
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


async def verify_token(token: str) -> CurrentUser:
    """
    Verifies a Clerk session JWT (RS256) against Clerk's JWKS.
    Raises AuthError on any failure — expired, malformed, wrong issuer, etc.
    """
    if not token:
        raise AuthError("Missing bearer token")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise AuthError("Malformed token") from exc

    kid = unverified_header.get("kid")
    if not kid:
        raise AuthError("Token missing key id")

    jwks = await _get_jwks()
    key = _find_key(jwks, kid)
    if key is None:
        # Key rotation may have happened — force a refresh once.
        _jwks_cache["fetched_at"] = 0.0
        jwks = await _get_jwks()
        key = _find_key(jwks, kid)
        if key is None:
            raise AuthError("Unknown signing key")

    options = {"verify_aud": bool(CLERK_AUDIENCE)}
    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=CLERK_AUDIENCE if CLERK_AUDIENCE else None,
            issuer=CLERK_ISSUER if CLERK_ISSUER else None,
            options=options,
        )
    except ExpiredSignatureError as exc:
        raise AuthError("Session expired, please sign in again") from exc
    except JWTError as exc:
        raise AuthError("Invalid token") from exc

    subject = claims.get("sub")
    if not subject:
        raise AuthError("Token missing subject claim")

    return CurrentUser(
        id=subject,
        email=claims.get("email"),
        session_id=claims.get("sid"),
        org_id=claims.get("org_id"),
        claims=claims,
    )


def extract_bearer_token(authorization_header: Optional[str]) -> str:
    """Pulls the raw token out of an `Authorization: Bearer <token>` header."""
    if not authorization_header:
        raise AuthError("Missing Authorization header")
    parts = authorization_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthError("Authorization header must be in the form: Bearer <token>")
    return parts[1].strip()
