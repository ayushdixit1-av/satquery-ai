"""Telemetry, EE status heartbeat, and worker metrics (DESIGN.md §4)."""
from fastapi import APIRouter

from ..config import EE_ERROR, EE_OK, EE_PROJECT

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health():
    return {
        "ee_ok": EE_OK,
        "ee_error": EE_ERROR,
        "project": EE_PROJECT,
        "status": "ok" if EE_OK else "ee_not_authenticated",
    }