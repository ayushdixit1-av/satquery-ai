"""Launcher kept for compatibility — the app lives in server/ (DESIGN.md §4).

    py server.py
"""
import os

import uvicorn


def main():
    port = int(os.environ.get("PORT", 8000))
    url = f"http://localhost:{port}"
    try:
        print(f"\n  SATQUERY (FastAPI)  ->  {url}\n")
    except UnicodeEncodeError:
        pass
    uvicorn.run("server.app:app", host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()