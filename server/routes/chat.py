"""Gemini comparison copilot endpoint (DESIGN.md §7)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..services import gemini_chat

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: str = Field(default="user", pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    context: dict = Field(default_factory=dict)
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list)

    @field_validator("history")
    @classmethod
    def _alternating(cls, v: list[ChatMessage]) -> list[ChatMessage]:
        if any(m.role == "assistant" for m in v[:1]):
            raise ValueError("history must start with a user message")
        for a, b in zip(v, v[1:]):
            if a.role == b.role:
                raise ValueError("history roles must alternate")
        return v


@router.post("/api/chat")
async def chat(req: ChatRequest):
    history = [{"role": m.role, "content": m.content} for m in req.history]
    if not history or history[-1]["content"] != req.message:
        history.append({"role": "user", "content": req.message})
    try:
        reply = gemini_chat.chat(req.context, history)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"reply": reply}