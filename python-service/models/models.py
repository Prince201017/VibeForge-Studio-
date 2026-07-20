"""
[Claude.DB] SQLAlchemy 2.0 declarative models for the ForgeOS schema.

These mirror db/migrations/*.sql exactly. They are used for:
  - type-safe query building via `queries.py` / `db_service.py` where SQLAlchemy
    Core expression language is preferred over raw SQL
  - editor tooling / autocomplete
  - optional Alembic autogeneration diffing against the hand-written migrations

Raw asyncpg is still used for the hot-path CRUD in `services/db_service.py`
for performance; these models are the canonical schema description.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """[Claude.DB] Shared declarative base for all ORM models."""
    pass


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )


# =============================================================
# [Claude.DB] Users & Authentication
# =============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String)
    avatar_url: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    email_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")

    projects: Mapped[list["Project"]] = relationship(back_populates="owner")
    sessions: Mapped[list["Session"]] = relationship(back_populates="user")

    __table_args__ = (
        Index("idx_users_email", "email"),
    )


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="sessions")

    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        Index("idx_sessions_expires_at", "expires_at"),
    )


# =============================================================
# [Claude.DB] Projects
# =============================================================

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = _uuid_pk()
    owner_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String)
    is_public: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    view_count: Mapped[int] = mapped_column(Integer, server_default="0")
    total_layers: Mapped[int] = mapped_column(Integer, server_default="0")
    total_size: Mapped[int] = mapped_column(BigInteger, server_default="0")

    owner: Mapped["User"] = relationship(back_populates="projects")
    layers: Mapped[list["Layer"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    collaborators: Mapped[list["ProjectCollaborator"]] = relationship(back_populates="project")

    __table_args__ = (
        Index("idx_projects_owner_id", "owner_id"),
        Index("idx_projects_created_at", "created_at"),
        CheckConstraint("btrim(name) <> ''", name="ck_projects_name_not_blank"),
    )


# =============================================================
# [Claude.DB] Collaboration
# =============================================================

RoleType = Enum(
    "owner", "editor", "viewer", "commenter",
    name="role_type", create_type=False,
)


class ProjectCollaborator(Base):
    __tablename__ = "project_collaborators"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(RoleType, nullable=False)
    invited_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    invited_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project: Mapped["Project"] = relationship(back_populates="collaborators")

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_collaborators"),
    )


class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(RoleType, nullable=False)
    token: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    access_count: Mapped[int] = mapped_column(Integer, server_default="0")


# =============================================================
# [Claude.DB] Layers & Canvas Data
# =============================================================

LayerTypeEnum = Enum(
    "group", "shape", "image", "text", "vector", "video", "model_3d", "particle", "component",
    name="layer_type", create_type=False,
)


class Layer(Base):
    __tablename__ = "layers"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    parent_layer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("layers.id", ondelete="CASCADE")
    )
    layer_type: Mapped[str] = mapped_column(LayerTypeEnum, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    display_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, server_default="true")
    is_locked: Mapped[bool] = mapped_column(Boolean, server_default="false")
    opacity: Mapped[float] = mapped_column(Float, server_default="1.0")
    blend_mode: Mapped[str] = mapped_column(String, server_default="normal")
    transform_matrix: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    properties: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    project: Mapped["Project"] = relationship(back_populates="layers")
    children: Mapped[list["Layer"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    parent: Mapped[Optional["Layer"]] = relationship(
        back_populates="children", remote_side="Layer.id"
    )
    animations: Mapped[list["Animation"]] = relationship(back_populates="layer")

    __table_args__ = (
        Index("idx_layers_project_id", "project_id"),
        Index("idx_layers_parent_id", "parent_layer_id"),
        Index("idx_layers_display_order", "project_id", "parent_layer_id", "display_index"),
        CheckConstraint("opacity >= 0 AND opacity <= 1", name="ck_layers_opacity_range"),
    )


# =============================================================
# [Claude.DB] Animations & Keyframes
# =============================================================

class Animation(Base):
    __tablename__ = "animations"

    id: Mapped[uuid.UUID] = _uuid_pk()
    layer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("layers.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    property_name: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    delay_ms: Mapped[int] = mapped_column(Integer, server_default="0")
    easing_type: Mapped[str] = mapped_column(String, nullable=False)
    loop_count: Mapped[int] = mapped_column(Integer, server_default="1")
    yoyo: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    layer: Mapped["Layer"] = relationship(back_populates="animations")
    keyframes: Mapped[list["Keyframe"]] = relationship(
        back_populates="animation", cascade="all, delete-orphan", order_by="Keyframe.time_ms"
    )

    __table_args__ = (
        CheckConstraint("duration_ms > 0", name="ck_animations_duration_positive"),
    )


class Keyframe(Base):
    __tablename__ = "keyframes"

    id: Mapped[uuid.UUID] = _uuid_pk()
    animation_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("animations.id", ondelete="CASCADE"), nullable=False
    )
    time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    value: Mapped[Any] = mapped_column(JSONB, nullable=False)
    easing: Mapped[Optional[str]] = mapped_column(String)
    interpolation: Mapped[str] = mapped_column(String, server_default="linear")

    animation: Mapped["Animation"] = relationship(back_populates="keyframes")

    __table_args__ = (
        Index("idx_keyframes_animation", "animation_id", "time_ms"),
    )


# =============================================================
# [Claude.DB] Geometry Operations
# =============================================================

class GeometryOperation(Base):
    __tablename__ = "geometry_operations"

    id: Mapped[uuid.UUID] = _uuid_pk()
    layer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("layers.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    operation_type: Mapped[str] = mapped_column(String, nullable=False)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    sort_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_geom_ops_layer", "layer_id", "sort_index"),
    )


# =============================================================
# [Claude.DB] Particle Systems
# =============================================================

class ParticleSystem(Base):
    __tablename__ = "particle_systems"

    id: Mapped[uuid.UUID] = _uuid_pk()
    layer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("layers.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    emitter_type: Mapped[str] = mapped_column(String, nullable=False)
    particle_count: Mapped[int] = mapped_column(Integer, server_default="1000")
    lifetime_ms: Mapped[int] = mapped_column(Integer, server_default="2000")
    physics_config: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("particle_count > 0", name="ck_particle_count_positive"),
    )


# =============================================================
# [Claude.DB] History & Versions
# =============================================================

class Operation(Base):
    __tablename__ = "operations"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    operation_index: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    operation_type: Mapped[str] = mapped_column(String, nullable=False)
    operation_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    parent_operation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("operations.id")
    )
    lamport_time: Mapped[Optional[int]] = mapped_column(Integer)

    __table_args__ = (
        UniqueConstraint("project_id", "operation_index", name="idx_operation_index"),
        Index("idx_operations_timestamp", "project_id", "timestamp"),
    )


class Version(Base):
    __tablename__ = "versions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[Optional[str]] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    operation_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    is_auto_save: Mapped[bool] = mapped_column(Boolean, server_default="false")

    __table_args__ = (
        Index("idx_versions_project", "project_id", "created_at"),
    )


# =============================================================
# [Claude.DB] Comments & Annotations
# =============================================================

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    layer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("layers.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    parent_comment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE")
    )
    resolved: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_comments_layer", "layer_id", "created_at"),
    )


class CommentMention(Base):
    __tablename__ = "comment_mentions"

    comment_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), primary_key=True
    )
    mentioned_user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


# =============================================================
# [Claude.DB] Assets
# =============================================================

class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = _uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    asset_type: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    file_url: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, server_default="{}")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), server_default="{}")
    description: Mapped[Optional[str]] = mapped_column(Text)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    usage_count: Mapped[int] = mapped_column(Integer, server_default="0")

    __table_args__ = (
        Index("idx_assets_project", "project_id"),
        Index("idx_assets_type", "project_id", "asset_type"),
    )


# =============================================================
# [Claude.DB] Notifications
# =============================================================

NotificationTypeEnum = Enum(
    "comment", "mention", "share", "permission", "join", "export",
    name="notification_type", create_type=False,
)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    notification_type: Mapped[str] = mapped_column(NotificationTypeEnum, nullable=False)
    related_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id")
    )
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    is_read: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_notifications_user", "user_id", "created_at"),
    )


# =============================================================
# [Claude.DB] Audit Logging
# =============================================================

AuditActionEnum = Enum(
    "create", "update", "delete", "share", "permission_change",
    name="audit_action", create_type=False,
)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    resource_type: Mapped[str] = mapped_column(String, nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(AuditActionEnum, nullable=False)
    changes: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_audit_resource", "resource_type", "resource_id", "created_at"),
    )
