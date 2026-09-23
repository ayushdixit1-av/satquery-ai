import hashlib
import json
import math
import os
import threading
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import ee

EE_PROJECT = os.environ.get("EE_PROJECT", "coastal-height-467710-k8")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
THUMB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "thumbs")
os.makedirs(THUMB_DIR, exist_ok=True)

RESULT_CACHE = {}
RESULT_CACHE_KEY = threading.Lock()

ee.Initialize(project=EE_PROJECT)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

ROI_RADIUS_M = 4000
BEST_S2 = "COPERNICUS/S2_SR_HARMONIZED"
S1 = "COPERNICUS/S1_GRD"


def geocode(query: str) -> dict:
    query = query.strip()
    if "," in query:
        parts = [p.strip() for p in query.split(",")]
        if len(parts) == 2:
            try:
                return {
                    "name": query,
                    "lat": float(parts[0]),
                    "lng": float(parts[1]),
                }
            except ValueError:
                pass
    params = urllib.parse.urlencode({
        "q": query,
        "format": "json",
        "limit": 1,
        "addressdetails": 0,
    })
    req = urllib.request.Request(
        f"{NOMINATIM_URL}?{params}",
        headers={"User-Agent": "SATQUERY-AI/1.0 (satquery-demo)"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if not data:
        raise ValueError("Location not found")
    return {
        "name": data[0].get("display_name", query),
        "lat": float(data[0]["lat"]),
        "lng": float(data[0]["lon"]),
    }


def _region_for(lat: float, lng: float):
    return ee.Geometry.Point([lng, lat]).buffer(ROI_RADIUS_M).bounds()


def _s2_collection(lat, lng, start, end, max_cloud=80):
    col = (
        ee.ImageCollection(BEST_S2)
        .filterBounds(ee.Geometry.Point([lng, lat]))
        .filterDate(start, end)
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", max_cloud))
    )
    return col


def best_s2_scene(lat, lng, start, end):
    col = _s2_collection(lat, lng, start, end)
    relaxed = col
    count = relaxed.size()
    if count.getInfo() == 0:
        relaxed = (
            ee.ImageCollection(BEST_S2)
            .filterBounds(ee.Geometry.Point([lng, lat]))
            .filterDate(start, end)
        )
    img = relaxed.sort("CLOUDY_PIXEL_PERCENTAGE").first()
    if img is None or str(img.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()) == "None":
        raise ValueError("No Sentinel-2 imagery in this period")
    return img


def cached_thumb(key, thumb_url):
    fname = f"{key}.png"
    path = os.path.join(THUMB_DIR, fname)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return f"/thumb/{fname}"
    req = urllib.request.Request(
        thumb_url, headers={"User-Agent": "SATQUERY-AI/1.0 (satquery-demo)"}
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
    with open(path, "wb") as fh:
        fh.write(data)
    return f"/thumb/{fname}"


def _thumb_key(*parts):
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def scene_result(lat, lng, start, end, dim=896):
    key = _thumb_key("scene-json", lat, lng, start, end, dim)
    with RESULT_CACHE_KEY:
        if key in RESULT_CACHE:
            return RESULT_CACHE[key]
    img = best_s2_scene(lat, lng, start, end)
    region = _region_for(lat, lng)
    cloud_val = img.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()
    cloud = 100.0 if cloud_val is None else float(cloud_val)
    date = str(img.date().format("yyyy-MM-dd").getInfo())
    scene_id = str(img.id().getInfo())
    vis = img.select(["B4", "B3", "B2"]).visualize(
        min=0, max=3000, gamma=1.25
    ).clip(region)
    thumbspec = {
        "region": region,
        "dimensions": f"{dim}x{dim}",
        "format": "png",
    }
    url = vis.getThumbURL(thumbspec)
    tkey = _thumb_key("scene", scene_id, dim)
    result = {
        "scene_id": scene_id,
        "date": date,
        "cloud_pct": round(cloud, 1),
        "image_url": cached_thumb(tkey, url),
    }
    with RESULT_CACHE_KEY:
        RESULT_CACHE[key] = result
    return result


def change_result(lat, lng, start1, end1, start2, end2, dim=896):
    key = _thumb_key("change-json", lat, lng, start1, end1, start2, end2, dim)
    with RESULT_CACHE_KEY:
        if key in RESULT_CACHE:
            return RESULT_CACHE[key]
    region = _region_for(lat, lng)
    point = ee.Geometry.Point([lng, lat])

    def composite(start, end):
        return (
            ee.ImageCollection(BEST_S2)
            .filterBounds(point)
            .filterDate(start, end)
            .select(["B4", "B3", "B2", "B8", "B11"])
            .median()
        )

    c1 = composite(start1, end1)
    c2 = composite(start2, end2)

    def ndvi(c):
        return c.normalizedDifference(["B8", "B4"]).rename("ndvi")

    def ndwi(c):
        return c.normalizedDifference(["B3", "B8"]).rename("ndwi")

    ndvi1, ndvi2 = ndvi(c1), ndvi(c2)
    ndwi2 = ndwi(c2)
    diff = ndvi2.subtract(ndvi1).rename("diff")

    water = ndwi2.gt(0.0)
    changed = diff.abs().gt(0.12)
    stable = changed.And(water.Not()).Not()

    classified = ee.Image.constant(0).rename("class")
    classified = classified.where(water, 3).where(changed, 1).where(water.Not().And(changed.Not()), 2)

    pal = classified.visualize(palette=["e8a13d", "2f9e44", "1f78b4"], min=1, max=3)

    hist = classified.reduceRegion(
        reducer=ee.Reducer.frequencyHistogram(),
        geometry=region,
        scale=20,
        maxPixels=1e9,
    ).get("class")
    hist = ee.Dictionary(hist).getInfo() or {}
    px_area = (20 * 20) / 1e6
    total = sum(float(v) for v in hist.values()) or 1
    changed_px = float(hist.get("1", 0))
    stable_px = float(hist.get("2", 0))
    changed_km2 = changed_px * px_area
    stable_km2 = stable_px * px_area
    water_km2 = float(hist.get("3", 0)) * px_area

    def s1_exists(start, end):
        return (
            ee.ImageCollection(S1)
            .filterBounds(point)
            .filterDate(start, end)
            .size()
            .getInfo()
            > 0
        )

    sar_evidence = s1_exists(start1, end1) and s1_exists(start2, end2)

    change_pct = changed_px / (changed_px + stable_px or 1) * 100

    if change_pct > 25:
        note = "Rapid land-cover transition detected across a large share of the area."
    elif change_pct > 10:
        note = "Moderate land-cover change, likely built-up or agricultural expansion."
    else:
        note = "Limited change detected; area is largely stable over the period."

    result = {
        "image_url": cached_thumb(
            _thumb_key("change", lat, lng, start1, end1, start2, end2, dim),
            pal.getThumbURL({
                "region": region,
                "dimensions": f"{dim}x{dim}",
                "format": "png",
            }),
        ),
        "changed_km2": round(changed_km2, 2),
        "stable_km2": round(stable_km2, 2),
        "water_km2": round(water_km2, 2),
        "total_km2": round(total * px_area, 2),
        "change_pct": round(change_pct, 1),
        "sar_evidence": sar_evidence,
        "confidence": round(max(60.0, 90.0 - change_pct * 0.5), 1),
        "interpretation": note,
    }
    with RESULT_CACHE_KEY:
        RESULT_CACHE[key] = result
    return result


class Handler(BaseHTTPRequestHandler):
    def _json(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _err(self, message, code=500):
        self._json({"error": str(message)}, code)

    def _get_params(self):
        from urllib.parse import urlparse, parse_qs

        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        return parsed.path, {k: v[0] for k, v in qs.items()}

    def log_message(self, fmt, *args):
        syslog = threading.current_thread().name
        print(f"[server:{syslog}] {fmt % args}")

    def do_GET(self):
        path, q = self._get_params()
        route = path.lower()
        try:
            if route in ("/", "/index.html"):
                self._serve_static("index.html", "text/html; charset=utf-8")
            elif route == "/style.css":
                self._serve_static("style.css", "text/css; charset=utf-8")
            elif route == "/app.js":
                self._serve_static("app.js", "application/javascript; charset=utf-8")
            elif route == "/api/search":
                query = q.get("q", "")
                if not query:
                    self._err("Missing q", 400)
                    return
                self._json(geocode(query))
            elif route.startswith("/thumb/"):
                self._serve_static(
                    os.path.basename(route),
                    "image/png",
                    cache=True,
                )
            elif route == "/api/img":
                lat, lng = float(q["lat"]), float(q["lng"])
                self._json(scene_result(lat, lng, q["start"], q["end"]))
            elif route == "/api/change":
                lat, lng = float(q["lat"]), float(q["lng"])
                self._json(change_result(lat, lng, q["s1"], q["e1"], q["s2"], q["e2"]))
            else:
                self._err("Not found", 404)
        except Exception as exc:
            import traceback

            traceback.print_exc()
            self._err(exc)

    def _serve_static(self, name, ctype, cache=False):
        path = os.path.join(STATIC_DIR, name)
        if cache:
            path = os.path.join(THUMB_DIR, name)
        if not os.path.exists(path):
            self._err("Not found", 404)
            return
        with open(path, "rb") as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        if cache:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        self.wfile.write(body)


def main():
    port = int(os.environ.get("PORT", 8000))
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"SATQUERY AI running at http://localhost:{port}")
    srv.serve_forever()


if __name__ == "__main__":
    main()