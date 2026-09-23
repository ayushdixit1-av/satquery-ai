"""Forward geocoding via Nominatim, with raw lat,lng passthrough."""
import json
import urllib.parse
import urllib.request

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "SATQUERY-AI/1.0 (satquery-demo)"


def geocode(query: str) -> dict:
    query = query.strip()
    if "," in query:
        parts = [p.strip() for p in query.split(",")]
        if len(parts) == 2:
            try:
                return {"name": query, "lat": float(parts[0]), "lng": float(parts[1])}
            except ValueError:
                pass
    params = urllib.parse.urlencode(
        {"q": query, "format": "json", "limit": 1, "addressdetails": 0}
    )
    req = urllib.request.Request(
        f"{NOMINATIM_URL}?{params}", headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if not data:
        raise ValueError(f"Location not found: '{query}'")
    return {
        "name": data[0].get("display_name", query),
        "lat": float(data[0]["lat"]),
        "lng": float(data[0]["lon"]),
    }