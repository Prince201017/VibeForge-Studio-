"""
[Claude.A11] Data encryption at rest
File: python-service/security/encryption.py

Fernet (AES-128-CBC + HMAC) for field-level encryption of sensitive data
(API keys, OAuth tokens, etc. stored in Postgres). Supports key rotation
via a versioned multi-key setup: new data is always encrypted with the
newest key, but old ciphertexts remain decryptable with retired keys.
"""

from __future__ import annotations

import os
import base64
import hashlib
import logging
from typing import Optional

from cryptography.fernet import Fernet, MultiFernet, InvalidToken

logger = logging.getLogger("forgeos.encryption")


class EncryptionError(Exception):
    pass


def _load_keys() -> list[Fernet]:
    """
    ENCRYPTION_KEY holds the active key. ENCRYPTION_KEY_PREVIOUS (optional,
    comma-separated) holds retired keys still needed to decrypt old data
    during a rotation window.
    """
    active = os.environ.get("ENCRYPTION_KEY")
    if not active:
        raise EncryptionError("ENCRYPTION_KEY is not configured")

    keys = [Fernet(active)]

    previous = os.environ.get("ENCRYPTION_KEY_PREVIOUS", "")
    for raw in previous.split(","):
        raw = raw.strip()
        if raw:
            keys.append(Fernet(raw))

    return keys


_multi_fernet: Optional[MultiFernet] = None


def _get_cipher() -> MultiFernet:
    global _multi_fernet
    if _multi_fernet is None:
        _multi_fernet = MultiFernet(_load_keys())
    return _multi_fernet


def encrypt_field(plaintext: str) -> str:
    """Encrypts a string field for storage. Always uses the newest (first) key."""
    if plaintext is None:
        raise EncryptionError("Cannot encrypt None")
    cipher = _get_cipher()
    token = cipher.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_field(ciphertext: str) -> str:
    """Decrypts a field. Transparently tries all configured keys (rotation-safe)."""
    cipher = _get_cipher()
    try:
        return cipher.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        logger.error("Failed to decrypt field — token invalid or key rotated out")
        raise EncryptionError("Unable to decrypt value") from exc


def hash_for_lookup(value: str) -> str:
    """
    One-way hash for values we need to look up by equality (e.g. API key
    prefixes, session token hashes) but never need to reverse. SHA-256 is
    sufficient here since these are high-entropy generated tokens, not
    user passwords (see hash_password below for that case).
    """
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def generate_key() -> str:
    """Utility for ops: generates a new Fernet key for rotation. Run offline."""
    return Fernet.generate_key().decode("utf-8")


# ---------------------------------------------------------------------------
# Password hashing (only relevant if we ever store credentials outside Clerk,
# e.g. for API keys / service accounts)
# ---------------------------------------------------------------------------

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError

    _hasher = PasswordHasher()

    def hash_secret(secret: str) -> str:
        return _hasher.hash(secret)

    def verify_secret(secret: str, hashed: str) -> bool:
        try:
            _hasher.verify(hashed, secret)
            return True
        except VerifyMismatchError:
            return False

except ImportError:  # pragma: no cover - argon2-cffi optional at import time
    logger.warning("argon2-cffi not installed; hash_secret/verify_secret unavailable")

    def hash_secret(secret: str) -> str:
        raise EncryptionError("argon2-cffi is required for hash_secret")

    def verify_secret(secret: str, hashed: str) -> bool:
        raise EncryptionError("argon2-cffi is required for verify_secret")


# ---------------------------------------------------------------------------
# API key generation (scoped, prefixed, hashed at rest)
# ---------------------------------------------------------------------------

import secrets

API_KEY_PREFIX = "fos_"


def generate_api_key() -> tuple[str, str]:
    """
    Returns (plaintext_key, lookup_hash). The plaintext is shown to the user
    exactly once; only the hash is persisted. Lookup uses hash_for_lookup so
    we can find the row without decrypting anything.
    """
    raw = secrets.token_urlsafe(32)
    plaintext = f"{API_KEY_PREFIX}{raw}"
    return plaintext, hash_for_lookup(plaintext)
