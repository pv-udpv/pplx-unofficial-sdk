"""pplx_sse_core — transport-agnostic SSE parsing and streaming toolkit."""

from __future__ import annotations

__version__ = "0.1.0"

from ._models import (
    ChatDelta,
    SSEEvent,
    StreamTermination,
    WebResult,
    WebStreamEvent,
)
from .buffer import SSEBuffer
from .chat_stream import decode_chat_event, parse_chat_stream
from .protocol import aiter_sse, iter_sse, parse_sse_bytes
from .web_stream import (
    aparse_web_stream,
    collect_web_response,
    decode_web_event,
    parse_web_stream,
)

__all__ = [
    "ChatDelta",
    "SSEBuffer",
    "SSEEvent",
    "StreamTermination",
    "WebResult",
    "WebStreamEvent",
    "aiter_sse",
    "aparse_web_stream",
    "collect_web_response",
    "decode_chat_event",
    "decode_web_event",
    "iter_sse",
    "parse_chat_stream",
    "parse_sse_bytes",
    "parse_web_stream",
]
