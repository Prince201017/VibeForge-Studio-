"""
[Claude.A11] Audit logging
File: python-service/security/audit_logger.py

Append-only audit trail. Every write goes through log_event(), which is
fire-and-forget (queued to a background task) so audit logging never adds
latency to the request path, while still guaranteeing the write happens
before the process exits (flushed on shutdown).

Non-repudiation: rows are never updated or deleted by application code —
only inserted. Retention/deletion is a separate offline job (1 year min,
per spec), not something exposed via the API.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger("forgeos.audit")

_db = None
_queue: "asyncio.Queue[AuditEvent]" = asyncio.Queue(maxsize=10_000)
_worker_task: Optional[asyncio.Task] = None


@dataclass
class AuditEvent:
    action: str
    user_id: Optional[str]
    ip_address: str
    user_agent: str
    metadata: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def bind_database(db) -> None:
    global _db
    _db = db


async def log_event(
    action: str,
    user_id: Optional[str],
    ip_address: str,
    user_agent: str,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """
    Non-blocking: enqueues the event and returns immediately. If the queue
    is full (backpressure from a DB outage), falls back to synchronous
    structured logging so the event isn't silently dropped.
    """
    event = AuditEvent(
        action=action,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent[:500],
        metadata=metadata or {},
    )
    try:
        _queue.put_nowait(event)
    except asyncio.QueueFull:
        logger.error("Audit queue full — writing synchronously to logs: %s", _serialize(event))


def _serialize(event: AuditEvent) -> str:
    return json.dumps(
        {
            "action": event.action,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "metadata": event.metadata,
            "timestamp": event.timestamp.isoformat(),
        }
    )


async def _worker() -> None:
    while True:
        event = await _queue.get()
        try:
            if _db is not None:
                await _db.execute(
                    """
                    INSERT INTO audit_logs (action, user_id, ip_address, user_agent, metadata, created_at)
                    VALUES ($1, $2, $3, $4, $5::jsonb, $6)
                    """,
                    event.action,
                    event.user_id,
                    event.ip_address,
                    event.user_agent,
                    json.dumps(event.metadata),
                    event.timestamp,
                )
            else:
                logger.info("AUDIT %s", _serialize(event))
        except Exception:
            logger.exception("Failed to persist audit event, dumping to logs: %s", _serialize(event))
        finally:
            _queue.task_done()


async def start_audit_worker() -> None:
    """Call once at app startup (e.g. FastAPI lifespan handler)."""
    global _worker_task
    if _worker_task is None:
        _worker_task = asyncio.create_task(_worker())
        logger.info("Audit log worker started")


async def stop_audit_worker() -> None:
    """Call at shutdown — drains the queue before the process exits."""
    await _queue.join()
    if _worker_task is not None:
        _worker_task.cancel()


# ---------------------------------------------------------------------------
# Convenience wrappers for the most common event types
# ---------------------------------------------------------------------------

AUDIT_ACTIONS = {
    "auth.login",
    "auth.logout",
    "auth.failed",
    "auth.mfa_enabled",
    "project.created",
    "project.updated",
    "project.deleted",
    "project.shared",
    "permission.changed",
    "permission.denied",
    "permission.revoked",
    "asset.uploaded",
    "asset.deleted",
    "export.created",
    "api_key.created",
    "api_key.revoked",
}


async def log_action(action: str, user_id: str, ip_address: str, user_agent: str, **metadata) -> None:
    if action not in AUDIT_ACTIONS:
        logger.warning("Unrecognized audit action '%s' — logging anyway", action)
    await log_event(action=action, user_id=user_id, ip_address=ip_address, user_agent=user_agent, metadata=metadata)


async def export_audit_logs(user_id: str, start: datetime, end: datetime) -> list[dict]:
    """Admin/owner-only export used by the compliance export endpoint."""
    if _db is None:
        raise RuntimeError("audit_logger.bind_database() must be called at startup")

    rows = await _db.fetch(
        """
        SELECT action, user_id, ip_address, user_agent, metadata, created_at
        FROM audit_logs
        WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC
        """,
        user_id,
        start,
        end,
    )
    return [dict(r) for r in rows]
