"""Earth Engine authentication & environment validator (DESIGN.md §4)."""
import base64
import json
import os
import sys
import tempfile

EE_PROJECT = os.environ.get("EE_PROJECT", "coastal-height-467710-k8")
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
CACHE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "cache"
)
os.makedirs(CACHE_DIR, exist_ok=True)


def _restore_ee_credentials():
    """Headless (Render) bootstrap: restore the authorized_user credentials that
    earthengine-api reads at ~/.config/earthengine/credentials.

    Preferred source: EE_CREDENTIALS_B64 (base64 of the credentials JSON).
    Legacy fallback: write EE_CREDENTIALS_JSON into an inherited temp dir.
    """
    b64 = os.environ.get("EE_CREDENTIALS_B64")
    raw = os.environ.get("EE_CREDENTIALS_JSON")
    if not b64 and not raw:
        return
    try:
        payload = base64.b64decode(b64).decode("utf-8") if b64 else raw
        json.loads(payload)  # fail fast on malformed input
        config_dir = os.environ.get(
            "EE_CREDENTIALS_DIR",
            os.path.join(os.path.expanduser("~"), ".config", "earthengine"),
        )
        os.makedirs(config_dir, exist_ok=True)
        cred_path = os.path.join(config_dir, "credentials")
        # Atomically-ish swap so concurrent workers never read a partial file.
        fd, tmp = tempfile.mkstemp(dir=config_dir, prefix="credentials.")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(payload)
        os.replace(tmp, cred_path)
        os.chmod(cred_path, 0o600)
        print(f"[EE] Restored credentials → {cred_path}")
    except Exception as _e:  # noqa: BLE001 — hardening must never crash the daemon
        print(f"[EE] WARNING: could not restore EE credentials — {_e}")


_restore_ee_credentials()

EE_OK = False
EE_ERROR = ""
ee = None

try:
    import ee as _ee

    _ee.Initialize(project=EE_PROJECT)
    ee = _ee
    EE_OK = True
    print(f"[EE] Initialized OK  project={EE_PROJECT}")
except Exception as _e:  # noqa: BLE001 — auth must never crash the daemon
    EE_ERROR = str(_e)
    print(f"[EE] WARNING: Earth Engine init failed — {EE_ERROR}")
    print("[EE] Run: earthengine authenticate   then restart the server.")


def require_ee():
    if not EE_OK:
        raise RuntimeError(
            "Earth Engine is not authenticated. "
            "Run:  earthengine authenticate  then restart the server."
        )