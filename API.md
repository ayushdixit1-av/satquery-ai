# SatQuery API

Sentinel-1/2 Earth Engine change-detection backend. FastAPI + uvicorn, one process.

- **Base URL:** `http://localhost:8000`
- **Interactive docs (auto):** `http://localhost:8000/docs` (Swagger) and `/redoc`
- **Auth:** authenticated Earth Engine account. If `GET /api/health` reports `ee_ok:false`, run `earthengine authenticate` and restart.

## Run

```bash
pip install -r requirements.txt
py server.py            # or: python server.py   →  http://localhost:8000
```

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | uvicorn listen port |
| `EE_PROJECT` | `coastal-height-467710-k8` | Earth Engine cloud project |

Imagery is downsampled client-side via Earth Engine's `getThumbURL` (`.clip(ROI)`, band pruning, adaptive `tileScale`). Scenes are cached under `data/cache/<sha256>.<ext>` and served from `/thumb`.

## Endpoints

### `GET /api/health`
Engine + project status.

```json
{"ee_ok": true, "ee_error": "", "project": "coastal-height-467710-k8", "status": "ok"}
```

### `GET /api/search?q=<place or lat,lng>`
Resolve a place name or coordinate to a location.

- `200` → `{"name": "Kanpur", "lat": 26.4499, "lng": 80.3319, "display_name": "…"}`
- `404` → `{"detail": "not found"}`

### `GET /api/img?lat=<y>&lng=<x>&start=<YYYY-MM-DD>&end=<YYYY-MM-DD>&fmt=png|jpg`
Best Sentinel-2 RGB scene (TCI) in the range, default format `png`.

```json
{
  "scene_id": "20231120T053109_20231120T053112_T43RGM",
  "date": "2023-11-20",
  "cloud_pct": 0.0,
  "provenance": {
    "sensor": "Sentinel-2 MSI (SR Harmonized)",
    "spacecraft": "Sentinel-2B",
    "granule": "43RGM",
    "processing_baseline": "05.09",
    "correction": "Surface Reflectance (BOA)",
    "sun_elevation_deg": null,
    "sun_azimuth_deg": null
  },
  "image_url": "/thumb/<sha256>.png"
}
```

### `GET /api/index?lat=&lng=&start=&end=&type=ndvi|ndwi|nbr&fmt=png|jpg`
Single-band index heatmap for the range.

```json
{"index": "ndvi", "date": "2023-11-01 – 2023-11-30", "image_url": "/thumb/<sha256>.png"}
```

### `GET /api/pixel?lat=&lng=&s1=&e1=&s2=&e2=&type=ndvi|ndwi|nbr`
NDVI-style index delta between two epochs at one point (APERTURE ~120 m).

```json
{
  "index": "ndvi", "lat": 28.6139, "lng": 77.209,
  "value_epochA": 0.277, "value_epochB": 0.306, "delta": 0.029,
  "nir_reflectance_epochA": 0.244, "nir_reflectance_epochB": 0.256,
  "red_reflectance_epochA": 0.087, "red_reflectance_epochB": 0.082,
  "interpretation": "NDVI stable within +/- 5 pts."
}
```

> `nir_red_reflectance_*` are Sentinel-2 L2A SR (B8 NIR / B4 Red, ÷10000, APERTURE ~120 m) — the raw spectral evidence behind each index delta. Cached as `pixel-json-v2`.

### `GET /api/change?lat=&lng=&s1=&e1=&s2=&e2=`
Full scene change detection (NDVI difference + Sentinel-1 SAR corroboration) between two epochs.

```json
{
  "image_url": "/thumb/<sha256>.png",
  "changed_km2": 5.65, "stable_km2": 67.0, "water_km2": 0.02,
  "total_km2": 72.67, "change_pct": 7.8, "sar_evidence": true,
  "date": "2023-11-01 – 2024-11-30", "interpretation": "…"
}
```

### `GET /thumb/<file>`
Cached image binary (`image/png` / `image/jpeg`). Same-origin with the API.

## Errors

- `422` — invalid params / no imagery in range (`{"detail": "<msg>"}`)
- `500` — Earth Engine failure (auth, quota, network)
- `404` — unknown path or unresolved place

## Tests

```bash
pip install -r requirements.txt pytest
py -m pytest server/tests -q    # 7 unit tests
```