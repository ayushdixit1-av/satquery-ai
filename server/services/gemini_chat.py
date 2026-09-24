"""Gemini-powered comparison copilot — multimodal, both epoch images (DESIGN.md §7).

Auth surface: Google AI Studio REST API. The key in render.env (gemini_key) is a
Google AI Studio API key and is passed as ?key= to generativelanguage.googleapis.com.
Model default is gemini-3.6-flash (gemini-2.5-flash is EOL for new users).

The two epoch images already cached on disk (/thumb files) are attached inline
to the first user turn so the model can actually look at the pair.
"""
import base64
import json
import os
import time
import urllib.error
import urllib.request

from ..config import CACHE_DIR

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_TIMEOUT = 75
_RETRY_CODES = (429, 500, 502, 503)
_RETRY_ATTEMPTS = 4
_RETRY_BACKOFF = (2, 4, 8, 12)


def _load_image_b64(image_url: str) -> dict | None:
    """Resolve a /thumb/<file> path (or any absolute URL) to the cached file bytes."""
    if not image_url:
        return None
    name = os.path.basename(image_url.rstrip("/"))
    path = os.path.join(CACHE_DIR, name)
    if not os.path.isfile(path):
        return None
    mime = "image/jpeg" if name.lower().endswith((".jpg", ".jpeg")) else "image/png"
    try:
        with open(path, "rb") as fh:
            return {"mimeType": mime, "data": base64.b64encode(fh.read()).decode("ascii")}
    except OSError:
        return None


def _system_prompt(context: dict) -> str:
    area = context.get("area") or "the observed footprint"
    coords = ""
    if context.get("lat") is not None and context.get("lng") is not None:
        coords = f" ({context['lat']}, {context['lng']})"
    return (
        "You are SATQUERY-COPILOT, the onboard analyst of SATQUERY, an industrial "
        "satellite-intelligence workbench. You are shown TWO Sentinel-2 images of the "
        f"SAME ground footprint — {area}{coords}: EPOCH 1 (baseline scene) and EPOCH 2 "
        "(current scene / spectral heatmap). Answer only about this area and its "
        "comparison: land cover, vegetation, surface water, agriculture, urban change, "
        "cloud or data caveats, and what either epoch image shows. Be concrete, "
        "technical, and terse. Never invent numbers not present in the machine context "
        "or visible image. If asked about anything unrelated to this area, reply in one "
        "short line that you only analyze the selected footprint.\n"
        "Verified machine context for the selected pair:\n"
        + json.dumps(context, default=str)
    )


def _endpoint() -> str:
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}"
        f":generateContent?key={GEMINI_KEY}"
    )


def _call(payload: dict) -> str:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(_endpoint(), data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    last = None
    for attempt in range(_RETRY_ATTEMPTS):
        try:
            with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT) as resp:
                out = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            last = RuntimeError(f"Gemini API {exc.code}: {body[:400]}")
            if exc.code in _RETRY_CODES and attempt < _RETRY_ATTEMPTS - 1:
                time.sleep(_RETRY_BACKOFF[attempt])
                continue
            raise last from exc
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Gemini API unreachable: {exc}") from exc
    else:
        raise last if last else RuntimeError("Gemini API failed")
    candidates = out.get("candidates") or []
    if not candidates:
        blocked = (out.get("promptFeedback") or {}).get("blockReason", "no candidates")
        raise RuntimeError(f"Gemini returned no answer (blocked: {blocked})")
    return (candidates[0].get("content", {}).get("parts") or [{}])[0].get("text", "")


def chat(context: dict, history: list[dict]) -> str:
    """history: [{"role": "user"|"assistant", "content": str}…], role alternates user→model."""
    if not GEMINI_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured on the server.")
    img_a = _load_image_b64(context.get("image1"))
    img_b = _load_image_b64(context.get("image2"))

    contents: list[dict] = []
    injected = False
    for msg in history:
        role = "model" if msg.get("role") == "assistant" else "user"
        parts = [{"text": msg.get("content") or ""}]
        if role == "user" and not injected:
            head = [{"text": "These are the two epoch images of the selected footprint: "
                              "EPOCH 1 baseline, EPOCH 2 current."}]
            if img_b:
                head.insert(0, {"inlineData": img_b})
            if img_a:
                head.insert(0, {"inlineData": img_a})
            parts = head + parts
            injected = True
        contents.append({"role": role, "parts": parts})

    payload = {
        "system_instruction": {"parts": [{"text": _system_prompt(context)}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1024,
            "thinkingConfig": {"thinkingBudget": 512},
        },
    }
    return _call(payload)