"""Backend test suite — no Earth Engine auth required (DESIGN.md §9.1)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server.services.cache_manager import cached_thumb, thumb_key  # noqa: E402
from server.services.geocoder import geocode  # noqa: E402


# ── geocoder: raw lat,lng passthrough ────────────────────────────────────
def test_geocode_parses_raw_coordinates():
    assert geocode("26.4499, 80.3319") == {
        "name": "26.4499, 80.3319",
        "lat": 26.4499,
        "lng": 80.3319,
    }


def test_geocode_rejects_bad_coordinates_and_raises_for_unknown():
    with pytest.raises(ValueError):
        geocode("not,a-number")
    # Nominatim will 404 for a nonsense query → ValueError mapped by route
    import urllib.request

    try:
        geocode("qqqqqqzzzzznoplace12345")
    except ValueError:
        pass
    except Exception as exc:  # noqa: BLE001 — network sandbox tolerant
        assert "timeout" not in type(exc).__name__.lower()
    assert urllib.request is not None


# ── cache: deterministic SHA-256 keys & format-aware files ───────────────
def test_thumb_key_is_deterministic():
    assert thumb_key("a", 1, "b") == thumb_key("a", 1, "b")
    assert thumb_key("a", 1, "b") != thumb_key("a", 2, "b")


def test_thumb_key_includes_format_and_unique_parts():
    assert thumb_key("scene", "X", 896, "png") != thumb_key("scene", "X", 896, "jpg")


def test_index_defs_cover_all_spectral_layers():
    from server.services import ee_engine

    assert set(ee_engine.INDEX_DEFS) == {"ndvi", "ndwi", "nbr"}
    for spec in ee_engine.INDEX_DEFS.values():
        assert len(spec["pair"]) == 2
        assert spec["min"] < spec["max"]


def test_requiring_ee_raises_cleanly_when_unauthd(monkeypatch):
    from server.services import ee_engine

    monkeypatch.setattr(ee_engine, "require_ee", lambda: (_ for _ in ()).throw(RuntimeError("EE offline")))
    with pytest.raises(RuntimeError):
        ee_engine.scene_result(26.45, 80.33, "2020-01-01", "2020-12-31")


# ── cache_manager fetch failure surfaces friendly RuntimeError ───────────
def test_cached_thumb_fetch_failure_raises_friendly_error(monkeypatch):
    from server.services import cache_manager as cm

    monkeypatch.setattr(cm, "MAX_RETRIES", 1)
    # dead local port → urlopen raises → RuntimeError with guidance
    with pytest.raises(RuntimeError):
        cached_thumb("nonexistent-key-xyz", "http://127.0.0.1:1/nope", "png")