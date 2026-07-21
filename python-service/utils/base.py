# [V0.A7] Common exporter interface — every format handler implements this.
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class ExportJob:
    job_id: str
    project_id: str
    scene: dict[str, Any]   # scene graph snapshot
    format: str
    options: dict[str, Any]


@dataclass
class ExportResult:
    job_id: str
    file_bytes: bytes
    mime_type: str
    filename: str


class Exporter(ABC):
    format_name: str

    @abstractmethod
    async def export(self, job: ExportJob) -> ExportResult: ...

    def validate_options(self, options: dict[str, Any]) -> None:
        """Override to raise ValueError on bad options; base no-op."""
        return
