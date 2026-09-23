"""Multi-tier disk thumbnail cache with SHA-256 keys (DESIGN.md §4)."""
import hashlib
import os
import time
import urllib.request

from ..config import CACHE_DIR

THUMB_TIMEOUT = 120
MAX_RETRIES = 2
USER_AGENT = "SATQUERY-AI/1.0 (satquery-demo)"


def thumb_key(*parts) -> str:
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def cached_thumb(key: str, thumb_url: str, fmt: str = "png") -> str:
    """Fetch an EE thumbnail once, persist it under data/cache/, return its /thumb path."""
    fname = f"{key}.{fmt}"
    path = os.path.join(CACHE_DIR, fname)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        print(f"[cache] HIT  {fname}")
        return f"/thumb/{fname}"
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"[EE] Fetching thumbnail (attempt {attempt}/{MAX_RETRIES}) …")
            req = urllib.request.Request(thumb_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=THUMB_TIMEOUT) as resp:
                data = resp.read()
            if len(data) < 100:
                raise ValueError("Received empty/tiny image from EE")
            with open(path, "wb") as fh:
                fh.write(data)
            print(f"[EE] Thumbnail saved  {fname}  ({len(data) // 1024} KB)")
            return f"/thumb/{fname}"
        except Exception as exc:  # noqa: BLE001
            print(f"[EE] Thumbnail attempt {attempt} failed: {exc}")
            if attempt < MAX_RETRIES:
                time.sleep(3)
    raise RuntimeError(
        "Earth Engine thumbnail fetch failed after retries. "
        "Check your EE quota or try a different date range."
    )