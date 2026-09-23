"""Memory-safe Sentinel-2/1 analytical pipeline (DESIGN.md §5).

Permanent fix for `User memory limit exceeded`:
  1. Adaptive pyramidal scale  30 → 60 → 100 m
  2. tileScale = 4             (4 EE worker nodes)
  3. bestEffort = True         (budget guardrail)
  4. Early ROI clipping + band pruning to ['B2','B3','B4','B8'] (+SWIR for indices)
"""
import threading

from ..config import ee, require_ee
from .cache_manager import cached_thumb, thumb_key

ROI_RADIUS_M = 4000
PIXEL_RADIUS_M = 120  # sampling window for /api/pixel readback
BEST_S2 = "COPERNICUS/S2_SR_HARMONIZED"
S1 = "COPERNICUS/S1_GRD"
ROI_BANDS = ["B2", "B3", "B4", "B8"]
INDEX_BANDS = ["B4", "B3", "B8", "B11"]

RESULT_CACHE: dict = {}
RESULT_LOCK = threading.Lock()

INDEX_DEFS = {
    "ndvi": {"pair": ("B8", "B4"), "palette": ["d7301f", "f46d43", "fdae61", "fee08b", "ffffbf", "d9ef8b", "a6d96a", "66bd63", "1a9850", "ffffbf"], "min": -0.3, "max": 0.85},
    "ndwi": {"pair": ("B3", "B8"), "palette": ["08306b", "08519c", "2171b5", "4292c6", "6baed6", "9ecae1", "c6dbef", "deebf7", "f7fbff"], "min": -0.4, "max": 0.4},
    "nbr": {"pair": ("B8", "B11"), "palette": ["08306b", "2171b5", "6baed6", "c6dbef", "ffffbf", "fee08b", "fdae61", "f46d43", "d7301f", "7f0000"], "min": -0.5, "max": 0.9},
}

ADAPTIVE_SCALES = (30, 60, 100)  # DESIGN.md §5.1


def _region(lat: float, lng: float):
    return ee.Geometry.Point([lng, lat]).buffer(ROI_RADIUS_M).bounds()


def _cached(key: str):
    with RESULT_LOCK:
        return RESULT_CACHE.get(key)


def _store(key: str, value):
    with RESULT_LOCK:
        RESULT_CACHE[key] = value


def best_s2_scene(lat: float, lng: float, start: str, end: str):
    point = ee.Geometry.Point([lng, lat])
    col = (
        ee.ImageCollection(BEST_S2)
        .filterBounds(point)
        .filterDate(start, end)
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", 80))
    )
    if col.size().getInfo() == 0:
        col = ee.ImageCollection(BEST_S2).filterBounds(point).filterDate(start, end)
    if col.size().getInfo() == 0:
        raise ValueError(f"No Sentinel-2 imagery found between {start} and {end}.")
    img = col.sort("CLOUDY_PIXEL_PERCENTAGE").first()
    if str(img.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()) == "None":
        raise ValueError("No usable Sentinel-2 imagery in this period.")
    return img


def scene_provenance(img) -> dict:
    """Human-verifiable sensor metadata (DESIGN.md §1.3 / §8)."""
    def _prop(name, default=None):
        try:
            val = img.get(name).getInfo()
            return val if val is not None else default
        except Exception:  # noqa: BLE001 — metadata is best-effort
            return default

    return {
        "sensor": "Sentinel-2 MSI (SR Harmonized)",
        "spacecraft": _prop("SPACECRAFT_NAME", "Sentinel-2"),
        "granule": _prop("MGRS_TILE", ""),
        "processing_baseline": _prop("PROCESSING_BASELINE", ""),
        "correction": "Surface Reflectance (BOA)",
        "sun_elevation_deg": _prop("SUN_ELEVATION"),
        "sun_azimuth_deg": _prop("SUN_AZIMUTH"),
    }


def scene_result(lat: float, lng: float, start: str, end: str, dim: int = 896, fmt: str = "png") -> dict:
    """Best (lowest-cloud) true-colour scene for one date range."""
    require_ee()
    key = thumb_key("scene-json", lat, lng, start, end, dim, fmt)
    if (hit := _cached(key)) is not None:
        return hit
    img = best_s2_scene(lat, lng, start, end)
    region = _region(lat, lng)
    cloud_val = img.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()
    cloud = 100.0 if cloud_val is None else float(cloud_val)
    date = str(img.date().format("yyyy-MM-dd").getInfo())
    scene_id = str(img.id().getInfo())
    vis = img.select(["B4", "B3", "B2"]).visualize(min=0, max=3000, gamma=1.25).clip(region)
    url = vis.getThumbURL({"region": region, "dimensions": f"{dim}x{dim}", "format": fmt})
    result = {
        "scene_id": scene_id,
        "date": date,
        "cloud_pct": round(cloud, 1),
        "provenance": scene_provenance(img),
        "image_url": cached_thumb(thumb_key("scene", scene_id, dim, fmt), url, fmt),
    }
    _store(key, result)
    return result


def index_result(lat: float, lng: float, start: str, end: str, index: str = "ndvi", dim: int = 896, fmt: str = "png") -> dict:
    """NDVI / NDWI / NBR heatmap composite for a date range."""
    if index not in INDEX_DEFS:
        raise ValueError(f"Unknown index '{index}'. Use: ndvi, ndwi, nbr.")
    require_ee()
    key = thumb_key("index-json", lat, lng, start, end, index, dim, fmt)
    if (hit := _cached(key)) is not None:
        return hit
    region = _region(lat, lng)
    composite = (
        ee.ImageCollection(BEST_S2)
        .filterBounds(ee.Geometry.Point([lng, lat]))
        .filterDate(start, end)
        .select(INDEX_BANDS)          # band pruning (DESIGN.md §5.4)
        .median()
        .clip(region)                  # early spatial clipping
    )
    spec = INDEX_DEFS[index]
    idx = composite.normalizedDifference(spec["pair"]).rename(index)
    vis = idx.visualize(palette=spec["palette"], min=spec["min"], max=spec["max"])
    url = vis.getThumbURL({"region": region, "dimensions": f"{dim}x{dim}", "format": fmt})
    result = {
        "index": index,
        "date": f"{start} → {end}",
        "image_url": cached_thumb(thumb_key("index", lat, lng, start, end, index, dim, fmt), url, fmt),
    }
    _store(key, result)
    return result


def safe_planetary_histogram(classified, region) -> tuple[dict, int]:
    """Adaptive-scale change histogram honoring EE worker memory quotas."""
    for scale in ADAPTIVE_SCALES:
        try:
            hist = (
                classified.reduceRegion(
                    reducer=ee.Reducer.frequencyHistogram(),
                    geometry=region,
                    scale=scale,
                    maxPixels=1e8,
                    tileScale=4,        # DESIGN.md §5.2
                    bestEffort=True,    # DESIGN.md §5.3
                )
                .get("class")
            )
            hist = ee.Dictionary(hist).getInfo() or {}
            if hist:
                return hist, scale
        except Exception as exc:  # noqa: BLE001
            if "memory" in str(exc).lower():
                continue
            raise
    raise ValueError(
        "Earth Engine aggregation failed for this area. "
        "Try smaller date ranges or a different location."
    )


def pixel_result(lat: float, lng: float, s1: str, e1: str, s2: str, e2: str, index: str = "ndvi"):
    """Point read-back of a spectral index + Band-8 NIR / Band-4 Red reflectance (§7.3)."""
    if index not in INDEX_DEFS:
        raise ValueError(f"Unknown index '{index}'. Use: ndvi, ndwi, nbr.")
    require_ee()
    key = thumb_key("pixel-json-v2", lat, lng, s1, e1, s2, e2, index)
    if (hit := _cached(key)) is not None:
        return hit
    point = ee.Geometry.Point([lng, lat])
    sample = point.buffer(PIXEL_RADIUS_M).bounds()
    pair = INDEX_DEFS[index]["pair"]

    def values(start, end):
        col = (
            ee.ImageCollection(BEST_S2)
            .filterBounds(point)
            .filterDate(start, end)
            .select(INDEX_BANDS)
        )
        if col.size().getInfo() == 0:
            raise ValueError(f"No Sentinel-2 imagery between {start} and {end}.")
        comp = col.median().clip(sample)
        comp = comp.addBands(comp.select(["B4", "B8"]).rename(["red", "nir"]))
        nd = comp.normalizedDifference(pair).rename(index)
        out = comp.select(["red", "nir"]).addBands(nd)
        return (
            out.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=sample,
                scale=30,
                maxPixels=1e6,
                tileScale=4,
                bestEffort=True,
            )
            .getInfo()
        )

    def gv(d):
        v = d.get(index)
        return None if v is None else round(float(v), 3)

    def raw(d, band):
        v = d.get(band)
        return None if v is None else round(float(v) / 10000.0, 3)

    try:
        d1 = values(s1, e1)
        d2 = values(s2, e2)
    except ValueError:
        raise

    value_a = gv(d1)
    value_b = gv(d2)
    delta = None if (value_a is None or value_b is None) else round(value_b - value_a, 3)
    note = "No usable pixel data." if delta is None else (
        f"{index.upper()} rose by {abs(delta * 100):.1f} pts — regrowth / gain."
        if delta > 0.05
        else f"{index.upper()} fell by {abs(delta * 100):.1f} pts — vegetation loss."
        if delta < -0.05
        else f"{index.upper()} stable within +/- 5 pts."
    )
    result = {
        "index": index,
        "lat": lat,
        "lng": lng,
        "value_epochA": value_a,
        "value_epochB": value_b,
        "delta": delta,
        "nir_reflectance_epochA": raw(d1, "nir"),
        "nir_reflectance_epochB": raw(d2, "nir"),
        "red_reflectance_epochA": raw(d1, "red"),
        "red_reflectance_epochB": raw(d2, "red"),
        "interpretation": note,
    }
    _store(key, result)
    return result


def change_result(lat: float, lng: float, s1: str, e1: str, s2: str, e2: str, dim: int = 896, fmt: str = "png") -> dict:
    """Multi-temporal NDVI/NDWI change classification + histogram stats."""
    require_ee()
    key = thumb_key("change-json", lat, lng, s1, e1, s2, e2, dim, fmt)
    if (hit := _cached(key)) is not None:
        return hit
    region = _region(lat, lng)
    point = ee.Geometry.Point([lng, lat])

    def composite(start, end):
        col = (
            ee.ImageCollection(BEST_S2)
            .filterBounds(point)
            .filterDate(start, end)
            .select(INDEX_BANDS)
        )
        if col.size().getInfo() == 0:
            raise ValueError(f"No Sentinel-2 imagery between {start} and {end}.")
        return col.median().clip(region)

    c1, c2 = composite(s1, e1), composite(s2, e2)

    ndvi1 = c1.normalizedDifference(["B8", "B4"]).rename("ndvi")
    ndvi2 = c2.normalizedDifference(["B8", "B4"]).rename("ndvi")
    ndwi2 = c2.normalizedDifference(["B3", "B8"]).rename("ndwi")
    diff = ndvi2.subtract(ndvi1).rename("diff")

    water = ndwi2.gt(0.0)
    changed = diff.abs().gt(0.12)

    classified = ee.Image.constant(0).rename("class")
    classified = classified.where(water, 3).where(changed, 1).where(water.Not().And(changed.Not()), 2)
    pal = classified.visualize(palette=["e8a13d", "2f9e44", "1f78b4"], min=1, max=3)

    hist, scale = safe_planetary_histogram(classified, region)
    px_area = (scale * scale) / 1e6
    total = sum(float(v) for v in hist.values()) or 1
    changed_px = float(hist.get("1", 0))
    stable_px = float(hist.get("2", 0))
    water_km2 = float(hist.get("3", 0)) * px_area
    changed_km2 = changed_px * px_area
    stable_km2 = stable_px * px_area

    def s1_exists(start, end):
        return ee.ImageCollection(S1).filterBounds(point).filterDate(start, end).size().getInfo() > 0

    sar_evidence = s1_exists(s1, e1) and s1_exists(s2, e2)
    change_pct = changed_px / (changed_px + stable_px or 1) * 100

    if change_pct > 25:
        note = "Rapid land-cover transition detected across a large share of the area."
    elif change_pct > 10:
        note = "Moderate land-cover change, likely built-up or agricultural expansion."
    else:
        note = "Limited change detected; area is largely stable over the period."

    result = {
        "image_url": cached_thumb(
            thumb_key("change", lat, lng, s1, e1, s2, e2, dim, fmt),
            pal.getThumbURL({"region": region, "dimensions": f"{dim}x{dim}", "format": fmt}),
            fmt,
        ),
        "changed_km2": round(changed_km2, 2),
        "stable_km2": round(stable_km2, 2),
        "water_km2": round(water_km2, 2),
        "total_km2": round(total * px_area, 2),
        "change_pct": round(change_pct, 1),
        "sar_evidence": sar_evidence,
        "confidence": round(max(60.0, 90.0 - change_pct * 0.5), 1),
        "interpretation": note,
        "hist_scale_m": scale,
    }
    _store(key, result)
    return result