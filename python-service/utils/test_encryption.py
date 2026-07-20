"""[Claude.A11] Tests for security/encryption.py"""

import os
import pytest
from cryptography.fernet import Fernet

os.environ.setdefault("ENCRYPTION_KEY", Fernet.generate_key().decode())

from python_service.security import encryption  # noqa: E402


def test_encrypt_decrypt_roundtrip():
    plaintext = "super-secret-api-key"
    ciphertext = encryption.encrypt_field(plaintext)
    assert ciphertext != plaintext
    assert encryption.decrypt_field(ciphertext) == plaintext


def test_encrypt_none_raises():
    with pytest.raises(encryption.EncryptionError):
        encryption.encrypt_field(None)  # type: ignore[arg-type]


def test_decrypt_invalid_token_raises():
    with pytest.raises(encryption.EncryptionError):
        encryption.decrypt_field("not-a-real-token")


def test_hash_for_lookup_is_deterministic():
    a = encryption.hash_for_lookup("value")
    b = encryption.hash_for_lookup("value")
    assert a == b
    assert a != encryption.hash_for_lookup("different-value")


def test_generate_api_key_format_and_uniqueness():
    key1, hash1 = encryption.generate_api_key()
    key2, hash2 = encryption.generate_api_key()
    assert key1.startswith(encryption.API_KEY_PREFIX)
    assert key1 != key2
    assert hash1 != hash2
    # The hash should be reproducible from the plaintext for lookup.
    assert encryption.hash_for_lookup(key1) == hash1


def test_key_rotation_old_ciphertext_still_decrypts(monkeypatch):
    old_key = Fernet.generate_key().decode()
    monkeypatch.setenv("ENCRYPTION_KEY", old_key)
    encryption._multi_fernet = None  # reset cache
    old_ciphertext = encryption.encrypt_field("rotate-me")

    new_key = Fernet.generate_key().decode()
    monkeypatch.setenv("ENCRYPTION_KEY", new_key)
    monkeypatch.setenv("ENCRYPTION_KEY_PREVIOUS", old_key)
    encryption._multi_fernet = None  # force reload with rotated keys

    assert encryption.decrypt_field(old_ciphertext) == "rotate-me"
    # New encryptions should use the new (first) key going forward.
    new_ciphertext = encryption.encrypt_field("fresh-value")
    assert encryption.decrypt_field(new_ciphertext) == "fresh-value"
