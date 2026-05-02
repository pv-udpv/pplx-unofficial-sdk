"""Pydantic v2 models for pplx-sse-core.

Defines the canonical data-model layer:
  - SSEEvent       — raw parsed SSE event (protocol layer)
  - WebResult      — single search result from web API
  - WebStreamEvent — decoded web-API streaming event
  - ChatDelta      — decoded OpenAI-compatible chat completion delta
  - StreamTermination — end-of-stream signal with reason + payload
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

__all__ = [
    "ChatDelta",
    "SSEEvent",
    "StreamTermination",
    "WebResult",
    "WebStreamEvent",
]


class SSEEvent(BaseModel):
    """Raw SSE event as produced by the WHATWG event-stream parser.

    ``id`` persists across blank-line dispatches per WHATWG spec —
    it is NOT reset when a new event starts; only an explicit ``id:``
    field in a subsequent event will change it.
    """

    model_config = ConfigDict(extra="ignore", frozen=False)

    event: str | None = None
    data: str = ""
    id: str | None = None  # persists across blank-line dispatches per WHATWG
    retry: int | None = None


class WebResult(BaseModel):
    """A single web search result from the /rest/sse/perplexity_ask API."""

    model_config = ConfigDict(extra="ignore", frozen=False)

    title: str
    url: str
    snippet: str | None = None


class WebStreamEvent(BaseModel):
    """A decoded event from the perplexity web-API SSE stream.

    Reconnection fields (``cursor``, ``reconnectable``) mirror the
    pplx-sdk SSETransport.MessageChunk shape.
    """

    model_config = ConfigDict(extra="ignore", frozen=False)

    answer: str = ""
    final: bool = False
    web_results: list[WebResult] = []
    backend_uuid: str | None = None
    raw_text: str | None = None
    cursor: str | None = None
    reconnectable: bool = False


class ChatDelta(BaseModel):
    """A single delta chunk from an OpenAI-compatible /chat/completions stream."""

    model_config = ConfigDict(extra="ignore", frozen=False)

    role: str | None = None
    content: str = ""
    finish_reason: str | None = None
    model: str | None = None


class StreamTermination(BaseModel):
    """Signals the end of a stream with a reason and optional payload.

    ``reason`` values:
      - ``"done"``        — ``[DONE]`` sentinel received
      - ``"end_comment"`` — ``: [end]`` comment line terminator detected
      - ``"error"``       — stream error
    """

    model_config = ConfigDict(extra="ignore", frozen=False)

    reason: str  # "done" | "end_comment" | "error"
    payload: dict = {}  # type: ignore[type-arg]
