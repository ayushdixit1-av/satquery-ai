"""Multi-temporal change detection & histogram stats (DESIGN.md §4)."""
from fastapi import APIRouter, HTTPException, Query

from ..services import ee_engine

router = APIRouter(tags=["change"])


@router.get("/api/change")
async def change(
    lat: float,
    lng: float,
    s1: str = Query(...),
    e1: str = Query(...),
    s2: str = Query(...),
    e2: str = Query(...),
):
    try:
        return ee_engine.change_result(lat, lng, s1, e1, s2, e2)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc