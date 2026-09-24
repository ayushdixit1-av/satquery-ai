# SATQUERY

**Industrial Satellite Intelligence Platform — bi-temporal change detection on Sentinel-1/2 via Google Earth Engine.**

SATQUERY is a full-stack geospatial workbench that lets an analyst pick any place on Earth, pull two time-separated satellite observations of the same footprint, and inspect **what changed** — through true-color imagery, spectral heatmaps, pixel-level index probes, a full-scene change raster, and region-wide land-surface water analysis. It pairs a FastAPI + Earth Engine backend with a React 19 / Three.js operational dashboard engineered as a dense, industrial GIS console.

- **Live frontend:** https://ayushdixit1-av.github.io/satquery-ai/
- **Live API:** https://satquery-ai-api-be04.onrender.com
- **Interactive API docs:** `https://satquery-ai-api-be04.onrender.com/docs` (also `/redoc`)

---

## 1. What it does

Given a place and two observation windows (e.g. `2018 Q1` vs `2024 Q1`), SATQUERY:

1. Resolves the place to coordinates (geocoding, or raw `lat,lng`).
2. Selects the **best cloud-free Sentinel-2 scene** for each epoch (L2A Surface Reflectance, true-color TCI).
3. Renders **Epoch 1 (baseline true color)** against **Epoch 2 (NDVI/NDWI/NBR heatmap)** in a swipe or side-by-side comparison console.
4. Detects full-footprint change with **NDVI differencing**, corroborated by **Sentinel-1 SAR** (radar sees through cloud).
5. Computes a **spectral index delta at any clicked point** (`/api/pixel`) with raw band reflectance evidence.
6. Measures **landmass surface-water extent** (`NDWI`) across the entire observed region for both epochs.
7. Visualizes the query on a **Three.js 3D globe** (quaternion camera fly-to, sun-synchronous orbit readout) and logs every result into card-averaged telemetry panels.

Everything is computed server-side in Google Earth Engine; the frontend only displays rasters, numbers, and provenance.

---

## 2. Features

### 2.1 Location & workspaces
- **Place search** — free-text place names or raw `lat,lng` (`Cmd/Ctrl + K` to focus, `Esc` to clear).
- **3D Earth digital twin** — Three.js globe with continental mesh, target reticle anchored at `R × 1.012`, quaternion slerp fly-to, and a Sentinel-2 sun-synchronous polar orbit visualization.
- **Temporal epoch selector** — independent start/end windows for Epoch 1 (baseline) and Epoch 2 (current).

### 2.2 Dual-epoch comparison console
- **SWIPE mode** — hardware-accelerated `clip-path` slider with percentage readout and epoch labels.
- **SIDE-BY-SIDE mode** — synchronized pan/zoom viewports (1×–6×) with a linked crosshair.
- **Pixel Δ-probe** — click any point to query `/api/pixel` and read the NDVI/NDWI/NBR delta plus the underlying NIR (B8) and Red (B4) reflectance values (~120 m aperture).

### 2.3 Analytics cards
| Card | Data source | What it shows |
|---|---|---|
| **Stereo Change Raster** | `/api/change` | Full-footprint NDVI difference map; `changed_km²`, `stable_km²`, `water_km²`, `change_pct`, SAR-evidence flag, auto interpretation |
| **Tabular Metric Matrix** | `/api/change` | Dense property table of the change telemetry |
| **Sentinel-1 SAR Ledger** | `/api/change` | Radar-based corroboration that penetrates cloud (VV/VH backscatter evidence) |
| **Landmass Water** | `/api/water` | Region-wide NDWI stats for both epochs — `water_km²`, percent coverage, deltas per footprint |
| **Satellite Provenance Inspector** | `/api/img` | Scene ID, sensor, spacecraft, granule, processing baseline, correction level, sun elevation/azimuth |

### 2.4 Operator UX
- Industrial charcoal/slate surface system (no glassmorphism on data), mono telemetry numerals, left-aligned density.
- Keyboard shortcuts (`1`/`2`/`3` band select, `S` mode toggle, `R` camera reset, `⌘K` search).
- Progressive loading shimmer with live elapsed timer, network-loss banner, and `EE Cloud: Offline` health pill.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│  GitHub Pages (client/ SPA, React 19 + Vite)                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  TopCommandBar · EarthGlobe (Three.js) · CompareCard (swipe/side)   │   │
│  │  ChangeRaster · MetricMatrix · SarLedger · LandmassWater            │   │
│  │  ProvenanceInspector · StatusDock · SidebarStations                 │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │  HTTPS (CORS: *)  /api/*  +  /thumb/*
┌──────────────────────────────────┼──────────────────────────────────────────┐
│  Render (server/ — FastAPI + uvicorn)                                          │
│  /api/search → geocoder        /api/img  → scene_result (best TCI)          │
│  /api/index → index_result     /api/pixel→ pixel_result (Δ index)           │
│  /api/change→ change_result    /api/water→ water_result (NDWI stats)        │
│  /thumb/*  → cached raster files (data/cache)                                │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │  Earth Engine (ee.Initialize, project)
┌──────────────────────────────────┼──────────────────────────────────────────┐
│  Google Earth Engine — Sentinel-2 MSI (L2A SR) + Sentinel-1 SAR              │
│  cloud-masked best-scene selection · getThumbURL downsampling               │
│  NDVI/NDWI/NBR reducers · adaptive tileScale (30→60→100 m)                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

The client never touches Earth Engine directly. The backend authenticates once (long-lived OAuth via `earthengine authenticate` locally, or `EE_CREDENTIALS_B64` headless bootstrap on Render), vends pre-computed rasters and statistics, and caches everything under `data/cache/<sha256>.<ext>` served from `/thumb`.

---

## 4. Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13 · FastAPI · uvicorn |
| Geospatial engine | Google Earth Engine Python API (`earthengine-api`) |
| Imagery | Sentinel-2 MSI L2A Surface Reflectance (TCI RGB), Sentinel-1 SAR (corroboration) |
| Spectral indices | NDVI `(B8-B4)/(B8+B4)` · NDWI `(B3-B8)/(B3+B8)` · NBR `(B8-B12)/(B8+B12)` |
| Frontend | React 19 · Vite 6 · Tailwind 3 · Framer Motion · GSAP · lucide-react |
| 3D | Three.js 0.170 (single WebGL context, quaternion camera) |
| Tests | pytest (backend · 7 tests) · Vitest + Testing Library (frontend · 9 tests) |
| Hosting | Render (API, free web service, auto-deploy from `main`) · GitHub Pages (SPA from `gh-pages` branch) |

---

## 5. Repository layout

```
satproject/
├── server.py              # Legacy launcher → uvicorn server.app:app
├── requirements.txt       # earthengine-api, fastapi, uvicorn
├── render.yaml            # Render Blueprint (web service definition)
├── API.md                 # Endpoint reference
├── DESIGN.md              # Full frontend architecture specification (v4.0)
├── server/
│   ├── app.py             # FastAPI app + router mounting + CORS
│   ├── config.py          # EE auth bootstrap (EE_CREDENTIALS_B64), project init
│   ├── routes/
│   │   ├── health.py      # GET /api/health
│   │   ├── imagery.py     # /api/search · /api/img · /api/index · /api/pixel · /api/water
│   │   └── change.py      # /api/change
│   ├── services/
│   │   ├── ee_engine.py   # all Earth Engine computation + thumbnail caching
│   │   ├── geocoder.py    # place-name → lat/lng
│   │   └── cache_manager.py
│   └── tests/test_unit.py # backend unit tests
├── client/
│   ├── vite.config.js     # @ alias, /api + /thumb dev proxy, chunk splitting
│   ├── package.json
│   └── src/
│       ├── App.jsx        # workspace layout, state orchestration
│       ├── hooks/useEarthEngine.js   # all /api fetching + API_BASE resolution
│       ├── hooks/useKeyboard.js
│       ├── components/3d/EarthGlobe.jsx
│       ├── components/comparison/    # SwipeSlider, DualCanvas, ChangeRaster, CompareCard
│       ├── components/analytics/     # MetricMatrix, SarLedger, LandmassWater, ProvenanceInspector
│       ├── components/layout/        # TopCommandBar, SidebarStations, StatusDock
│       └── components/common/        # PanelHeader, SatImg, WaitShimmer
├── data/cache/            # generated raster cache (thumbnails)
└── render.env             # LOCAL ONLY (gitignored) — Render API key / cloud keys
```

---

## 6. Quickstart (local development)

### Prerequisites
- Python 3.11+ (`py` or `python3`)
- Node.js 18+ and npm
- An Earth Engine account with a cloud project (default project referenced: `coastal-height-467710-k8`)

### Backend

```bash
pip install -r requirements.txt

# Authenticate Earth Engine once (interactive browser flow)
earthengine authenticate

# Start the API
py server.py                    # → http://localhost:8000  (Swagger at /docs)
```

Verify with:

```bash
curl http://localhost:8000/api/health
# {"ee_ok":true,"ee_error":"","project":"coastal-height-467710-k8","status":"ok"}
```

If `ee_ok` is `false`, re-run `earthengine authenticate`.

### Frontend

```bash
cd client
npm install
npm run dev                     # → http://localhost:5173
```

The Vite dev server proxies `/api` and `/thumb` to `localhost:8000`, so the SPA reaches the backend without CORS configuration. Open the site, search a place (e.g. `Kanpur`), pick two epochs, and all cards populate.

---

## 7. Running tests

```bash
# Backend (from repo root)
py -m pytest server/tests -q                # 7 tests

# Frontend
cd client
npm test                                    # 9 tests (Vitest + Testing Library)
```

---

## 8. Production deployment

Two artifacts are deployed separately — they are independent and share no build.

### 8.1 Backend → Render (HTTP API)

The repo includes `render.yaml` (free web service, Python runtime, auto-deploy on `main`). Critical environment variables:

| Variable | Purpose |
|---|---|
| `EE_PROJECT` | Earth Engine cloud project (e.g. `coastal-height-467710-k8`) |
| `EE_CREDENTIALS_B64` | Base64 of the `~/.config/earthengine/credentials` JSON — `config.py` restores it on boot for headless auth |
| `PORT` | Render injects the assigned port (uvicorn reads it) |

Deployment via the Render API (pattern used in this project):

```powershell
# create the web service
Invoke-WebRequest -Uri "https://api.render.com/v1/services" `
  -Headers @{Authorization="Bearer $RENDER_API_KEY"; "Content-Type"="application/json"} `
  -Method Post -Body $body

# set env vars (body is a top-level JSON ARRAY — replaces ALL vars)
$body = @(
  @{ key = "EE_PROJECT"; value = "coastal-height-467710-k8" },
  @{ key = "EE_CREDENTIALS_B64"; value = $b64 }
) | ConvertTo-Json
Invoke-WebRequest -Uri "https://api.render.com/v1/services/$SERVICE_ID/env-vars" `
  -Headers @{Authorization="Bearer $RENDER_API_KEY"; "Content-Type"="application/json"} `
  -Method Put -Body $body
```

Pushing to `main` auto-deploys (`autoDeploy` on). The service exposes `/api/health`, `/api/search`, `/api/img`, `/api/index`, `/api/pixel`, `/api/change`, `/api/water`, and `/thumb/*` with `Access-Control-Allow-Origin: *`.

> **Note:** the Render free tier has an ephemeral disk — `data/cache` is re-populated after each cold boot. Rasters regenerate on first request per footprint (expect slower first calls, sub-second cached calls after).

### 8.2 Frontend → GitHub Pages

```bash
cd client
# point the SPA at the live API
$env:VITE_API_URL = "https://satquery-ai-api-be04.onrender.com"
npm run build -- --base=./          # relative base → works under /satquery-ai/

# publish the dist/ tree onto the orphan gh-pages branch
# (pattern: copy dist into a temp dir, git init + push HEAD:gh-pages --force)
```

Then enable Pages for the repo (branch `gh-pages`, root). The SPA reads `API_BASE` from `import.meta.env.VITE_API_URL` (or the app's origin) and normalizes `/thumb/...` paths to absolute URLs via `absUrl()`.

---

## 9. API reference

Base URL: `https://satquery-ai-api-be04.onrender.com` (local: `http://localhost:8000`). Full detail + examples in [`API.md`](./API.md).

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Earth Engine auth + project status |
| `GET /api/search?q=<place or lat,lng>` | Geocode a place or coordinate |
| `GET /api/img?lat=&lng=&start=&end=&fmt=` | Best Sentinel-2 true-color scene in range (with provenance) |
| `GET /api/index?lat=&lng=&start=&end=&type=ndvi\|ndwi\|nbr&fmt=` | Spectral-index heatmap for a range |
| `GET /api/pixel?lat=&lng=&s1=&e1=&s2=&e2=&type=` | Index delta at one point + raw NIR/Red reflectance (~120 m aperture) |
| `GET /api/change?lat=&lng=&s1=&e1=&s2=&e2=` | Full-footprint NDVI-difference change detection + SAR corroboration |
| `GET /api/water?lat=&lng=&s1=&e1=&s2=&e2=` | Landmass surface-water extent (NDWI) for both epochs |
| `GET /thumb/<file>` | Cached raster binary (PNG/JPEG) |

All imagery is downsampled client-side via Earth Engine `getThumbURL` (`.clip(ROI)`, band pruning, adaptive `tileScale`), so results stream as compact viewport-sized rasters rather than full GeoTIFFs.

---

## 10. Keyboard shortcuts

| Key | Action |
|---|---|
| `Cmd/Ctrl + K` | Focus location search |
| `1` / `2` / `3` | Select NDVI / NDWI / NBR spectral band |
| `S` | Toggle SWIPE ↔ SIDE-BY-SIDE |
| `R` | Reset 3D globe camera |
| `Esc` | Clear search / dismiss overlay |

---

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `/api/health` returns `ee_ok:false` | Earth Engine not authenticated → run `earthengine authenticate` (local) or refresh `EE_CREDENTIALS_B64` (Render) |
| `422` from `/api/img` | No Sentinel-2 scene in that window / invalid params → widen the date range |
| `500` from any `/api/*` | EE quota, auth expiry, or network → check server logs |
| Images load but cards stay empty | Cold boot cache cold → request the same footprint again; first calls are slower |
| CORS errors in browser | Frontend `API_BASE` not pointing to the Render URL → rebuild with the correct `VITE_API_URL` |
| Slow first image | Earth Engine `getThumbURL` computes downsampled raster on demand; subsequent `sha256`-keyed cache hits are fast |

---

## 12. Security notes

- `render.env` (Render API key / any cloud keys) is **gitignored** — never commit it.
- `EE_CREDENTIALS_B64` is a secret; it is set through the Render dashboard/API as a secret value, never written to the repo.
- CORS is wide-open (`*`) on the API to serve the GitHub-Pages origin; the endpooints are read-only geo-intelligence queries with no write paths, so no additional auth layer is currently enforced.

---

*SATQUERY · Sentinel-2/1 bi-temporal change detection on Google Earth Engine · FastAPI + React 19.*