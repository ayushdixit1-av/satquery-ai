"""Hugging Face Inference Providers copilot — multimodal (primary chat backend).

Routes through router.huggingface.co (OpenAI-compatible) so it works on Render
free tier (no GPU on the host). Set HF_TOKEN to any HF token; HF_MODEL defaults
to Qwen/Qwen3-VL-30B-A3B-Instruct (vision+text MoE, ~3B active params: fast and
high quality). Override via HF_MODEL env var with an org-prefixed model id that
is available on the router (see GET https://router.huggingface.co/v1/models).
"""
import base64
import json
import os
import time
import urllib.error
import urllib.request

from ..config import CACHE_DIR
from .gemini_chat import _load_image_b64, _system_prompt

HF_TOKEN = os.environ.get("HF_TOKEN", "")
HF_MODEL = os.environ.get("HF_MODEL", "Qwen/Qwen3-VL-30B-A3B-Instruct")
HF_TIMEOUT = 90
_RETRY_ATTEMPTS = 3
_RETRY_BACKOFF = (2, 6)


def _endpoint() -> str:
    return "https://router.huggingface.co/v1/chat/completions"


def _data_url(image: dict) -> str:
    return f"data:{image['mimeType']};base64,{image['data']}"


def _build_contents(context: dict, history: list[dict]) -> list[dict]:
    img_a = _load_image_b64(context.get("image1"))
    img_b = _load_image_b64(context.get("image2"))
    injected = False
    contents: list[dict] = []
    for msg in history:
        role = msg.get("role") or "user"
        content: list[dict] = [{"type": "text", "text": msg.get("content") or ""}]
        if role == "user" and not injected:
            head: list[dict] = [
                {
                    "type": "text",
                    "text": "These are the two epoch images of the selected footprint: "
                            "EPOCH 1 baseline, EPOCH 2 current.",
                }
            ]
            if img_b:
                head.insert(0, {"type": "image_url", "image_url": {"url": _data_url(img_b)}})
            if img_a:
                head.insert(0, {"type": "image_url", "image_url": {"url": _data_url(img_a)}})
            content = head + content
            injected = True
        contents.append({"role": role, "content": content})
    return contents


def _parse_reply(out: dict) -> str:
    choices = out.get("choices") or []
    if choices:
        text = (choices[0].get("message") or {}).get("content")
        if text:
            return text
    generated = out.get("generated_text")
    if generated:
        return generated
    raise RuntimeError(f"HF Inference returned no answer: {json.dumps(out)[:400]}")


def _post(payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(_endpoint(), data=data, method="POST")
    req.add_header("Authorization", f"Bearer {HF_TOKEN}")
    req.add_header("Content-Type", "application/json")
    last = None
    for attempt in range(_RETRY_ATTEMPTS):
        try:
            with urllib.request.urlopen(req, timeout=HF_TIMEOUT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            last = RuntimeError(f"HF Inference API {exc.code}: {body[:400]}")
            if exc.code in (429, 503) and attempt < _RETRY_ATTEMPTS - 1:
                time.sleep(_RETRY_BACKOFF[attempt])
                continue
            raise last from exc
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"HF Inference API unreachable: {exc}") from exc
    raise last if last else RuntimeError("HF Inference API failed")


def chat(context: dict, history: list[dict]) -> str:
    """history: [{"role": "user"|"assistant", "content": str}…]."""
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN is not configured on the server.")
    contents = _build_contents(context, history)
    payload = {
        "model": HF_MODEL,
        "messages": [
            {"role": "system", "content": _system_prompt(context)},
            *contents,
        ],
        "max_tokens": 1024,
        "temperature": 0.4,
    }
    return _parse_reply(_post(payload))