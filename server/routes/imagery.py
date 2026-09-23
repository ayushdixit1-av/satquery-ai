"""Geocoding + scene retrieval & satellite layer generation (DESIGN.md §4)."""
from fastapi import APIRouter, HTTPException, Query

from ..services import ee_engine
from ..services.geocoder import geocode

router = APIRouter(tags=["imagery"])


@router.get("/api/search")
async def search(q: str = Query(..., min_length=1, description="Place name or lat,lng")):
    try:
        return geocode(q)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/img")
async def image(lat: float, lng: float, start: str, end: str, fmt: str = "png"):
    try:
        return ee_engine.scene_result(lat, lng, start, end, fmt=fmt)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/api/index")
async def index_layer(lat: float, lng: float, start: str, end: str, type: str = "ndvi", fmt: str = "png"):
    try:
        return ee_engine.index_result(lat, lng, start, end, type, fmt=fmt)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/api/pixel")
async def pixel(
    lat: float,
    lng: float,
    s1: str,
    e1: str,
    s2: str,
    e2: str,
    type: str = "ndvi",
):
    try:
        return ee_engine.pixel_result(lat, lng, s1, e1, s2, e2, type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc