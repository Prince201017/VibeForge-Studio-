"""[Claude.A11] Tests for security/file_scanner.py"""

import pytest

from python_service.security.file_scanner import (
    validate_and_scan_upload,
    FileValidationError,
    MAX_FILE_SIZE_BYTES,
)

PNG_MAGIC = bytes.fromhex("89504e470d0a1a0a") + b"\x00" * 100
JPEG_MAGIC = bytes.fromhex("ffd8ffe0") + b"\x00" * 100
PDF_MAGIC = b"%PDF-1.4\n" + b"\x00" * 100
FAKE_EXE_AS_PNG = bytes.fromhex("4d5a900003000000") + b"\x00" * 100  # MZ header (Windows exe)

MALICIOUS_SVG = b"""<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>"""

SAFE_SVG = b"""<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>"""

XXE_SVG = b"""<?xml version="1.0"?>
<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>"""


@pytest.mark.asyncio
async def test_rejects_empty_file():
    with pytest.raises(FileValidationError):
        await validate_and_scan_upload(b"", "image/png", "empty.png")


@pytest.mark.asyncio
async def test_rejects_oversized_file():
    oversized = b"\x00" * (MAX_FILE_SIZE_BYTES + 1)
    with pytest.raises(FileValidationError):
        await validate_and_scan_upload(oversized, "image/png", "big.png")


@pytest.mark.asyncio
async def test_rejects_disallowed_mime_type():
    with pytest.raises(FileValidationError):
        await validate_and_scan_upload(b"data", "application/x-executable", "evil.exe")


@pytest.mark.asyncio
async def test_rejects_mime_type_mismatch_spoofed_extension():
    # Declares PNG but the bytes are actually a Windows executable.
    with pytest.raises(FileValidationError) as exc_info:
        await validate_and_scan_upload(FAKE_EXE_AS_PNG, "image/png", "totally_safe.png")
    assert exc_info.value.code in ("type_mismatch", "signature_unknown")


@pytest.mark.asyncio
async def test_rejects_svg_with_script_tag():
    with pytest.raises(FileValidationError) as exc_info:
        await validate_and_scan_upload(MALICIOUS_SVG, "image/svg+xml", "logo.svg")
    assert exc_info.value.code == "svg_active_content"


@pytest.mark.asyncio
async def test_rejects_svg_with_xxe_payload():
    with pytest.raises(FileValidationError) as exc_info:
        await validate_and_scan_upload(XXE_SVG, "image/svg+xml", "logo.svg")
    assert exc_info.value.code == "svg_active_content"


@pytest.mark.asyncio
async def test_accepts_safe_svg(monkeypatch):
    _bypass_clamav(monkeypatch)
    result = await validate_and_scan_upload(SAFE_SVG, "image/svg+xml", "logo.svg")
    assert result.stored_filename.endswith(".svg")


@pytest.mark.asyncio
async def test_accepts_valid_png(monkeypatch):
    _bypass_clamav(monkeypatch)
    result = await validate_and_scan_upload(PNG_MAGIC, "image/png", "photo.png")
    assert result.detected_mime == "image/png"
    assert result.stored_filename != "photo.png"  # renamed to UUID


@pytest.mark.asyncio
async def test_stored_filename_is_randomized_not_user_controlled(monkeypatch):
    _bypass_clamav(monkeypatch)
    result = await validate_and_scan_upload(PDF_MAGIC, "application/pdf", "../../etc/passwd.pdf")
    assert "/" not in result.stored_filename
    assert ".." not in result.stored_filename


def _bypass_clamav(monkeypatch):
    async def fake_scan(data):
        return True, "OK"

    import python_service.security.file_scanner as fs

    monkeypatch.setattr(fs, "_clamav_scan", fake_scan)
