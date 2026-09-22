"""chat_stream.py — OpenAI-compatible chat completion stream parser."""

from __future__ import annotations

import json
import logging
from collections.abc import Iterable, Iterator

from ._models import ChatDelta, SSEEvent, StreamTermination

__all__ = ["decode_chat_event", "parse_chat_stream"]

logger = logging.getLogger("pplx_sse_core.chat_stream")

_DONE_SENTINEL = "[DONE]"


def decode_chat_event(event: SSEEvent) -> ChatDelta | StreamTermination | None:
    """Parse a single SSEEvent from a /chat/completions stream.

    Returns:
        StreamTermination(reason="done") for the ``[DONE]`` sentinel.
        ChatDelta populated from the chunk when choices are present.
        None when the event carries no meaningful data (e.g. empty content).
    """
    data = event.data.strip()

    if data == _DONE_SENTINEL:
        return StreamTermination(reason="done")

    if not data:
        return None

    try:
        payload: dict[str, object] = json.loads(data)
    except json.JSONDecodeError:
        logger.debug("Skipping malformed JSON chunk: %.120s", data)
        return None

    _model_raw = payload.get("model")
    model: str | None = _model_raw if isinstance(_model_raw, str) else None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None

    first = choices[0]
    if not isinstance(first, dict):
        return None

    delta = first.get("delta")
    if not isinstance(delta, dict):
        return None

    role_raw = delta.get("role")
    role: str | None = role_raw if isinstance(role_raw, str) else None

    content_raw = delta.get("content")
    content: str = content_raw if isinstance(content_raw, str) else ""

    finish_raw = first.get("finish_reason")
    finish_reason: str | None = finish_raw if isinstance(finish_raw, str) else None

    return ChatDelta(role=role, content=content, finish_reason=finish_reason, model=model)


def parse_chat_stream(events: Iterable[SSEEvent]) -> Iterator[ChatDelta]:
    """Yield ChatDelta objects from an iterable of SSEEvents.

    Skips StreamTermination and None results; stops at the first
    StreamTermination (i.e. the ``[DONE]`` sentinel).
    """
    for event in events:
        result = decode_chat_event(event)
        if isinstance(result, StreamTermination):
            return
        if isinstance(result, ChatDelta):
            yield result
