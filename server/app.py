"""FastAPI / ASGI application entry (DESIGN.md §4)."""
import os
import shutil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import CACHE_DIR, STATIC_DIR
from .routes import change, chat, health, imagery

app = FastAPI(
    title="SatQuery AI",
    description="Next-Gen Orbital Intelligence — Sentinel-1/2 analytical pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # GitHub Pages frontend calls this API cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(imagery.router)
app.include_router(change.router)
app.include_router(chat.router)

if os.path.isdir(CACHE_DIR):
    app.mount("/thumb", StaticFiles(directory=CACHE_DIR), name="thumb")

# Serve the legacy static frontend, then the built React client if present.
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "client", "dist")
if not os.path.isdir(_DIST) and os.path.isdir(STATIC_DIR):
    _DIST = STATIC_DIR
if os.path.isdir(_DIST):
    app.mount("/", StaticFiles(directory=_DIST, html=True), name="client")


def main():
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    print(f"\n{'=' * 54}")
    print(f"  SATQUERY AI (FastAPI)  →  http://localhost:{port}")
    uvicorn.run("server.app:app", host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()