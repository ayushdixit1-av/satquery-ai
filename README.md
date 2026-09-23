# SATQUERY AI — Satellite Change Explorer

Compare `before` / `after` Sentinel-2 imagery and a NDVI change-detection map for any place on Earth.

- **Frontend**: `static/` (served by the backend, or separately via GitHub Pages)
- **Backend**: `server.py` — Python + Google Earth Engine (requires an EE project + auth)

## Run the backend

```bash
export EE_PROJECT=your-earth-engine-project-id
py server.py
# -> http://localhost:8000
```

## API

| Endpoint | Description |
|---|---|
| `/api/search?q=<place>` | Geocode a place name |
| `/api/img?lat=&lng=&start=&end=` | Best (lowest-cloud) Sentinel-2 scene in the date range |
| `/api/change?lat=&lng=&s1=&e1=&s2=&e2=` | NDVI change map + stats between two periods |

## GitHub Pages

The static frontend can be hosted on GitHub Pages, but the API endpoints need the Python
backend set up separately. Point the frontend host accordingly if you split it.