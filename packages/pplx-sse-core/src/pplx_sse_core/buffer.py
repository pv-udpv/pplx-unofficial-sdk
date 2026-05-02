"""buffer.py — SSEBuffer: accumulate byte/str chunks and dispatch complete SSE events.

Solves the perplexity-ai-unofficial split-on-\\n\\n bug: a single HTTP chunk
may contain only *part* of an SSE event.  ``SSEBuffer`` holds the partial data
until the \\n\\n (or \\r\\n\\r\\n) event-boundary delimiter arrives, then hands
complete events to ``parse_sse_bytes`` for proper WHATWG parsing.
"""

from __future__ import annotations

import logging
from typing import Self

from ._models import SSEEvent
from .protocol import parse_sse_bytes

__all__ = ["SSEBuffer"]

_log = logging.getLogger("pplx_sse_core.buffer")

# WHATWG allows \n\n, \r\n\r\n, or \r\r as event boundaries.
# We search for the two most common: \n\n and \r\n\r\n.
_BOUNDARIES: tuple[bytes, ...] = (b"\r\n\r\n", b"\n\n", b"\r\r")


class SSEBuffer:
    """Stateful buffer that reassembles split SSE chunks into complete events.

    Usage::

        buf = SSEBuffer()
        for http_chunk in response.iter_bytes():
            for event in buf.feed(http_chunk):
                process(event)

    The buffer accumulates data until it finds a complete SSE event boundary
    (``\\n\\n`` or ``\\r\\n\\r\\n``), then yields all events found in the
    accumulated block via ``parse_sse_bytes``.

    Call ``.reset()`` to discard any buffered partial data (e.g. on error or
    reconnect).
    """

    def __init__(self) -> None:
        self._buf: bytes = b""

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def feed(self, chunk: bytes | str) -> list[SSEEvent]:
        """Append *chunk* to the internal buffer and return any newly complete events.

        Parameters
        ----------
        chunk:
            Raw bytes or str received from the transport layer.

        Returns
        -------
        list[SSEEvent]
            Zero or more fully parsed SSE events.  Returns an empty list when
            the chunk does not yet complete any event.
        """
        if isinstance(chunk, str):
            chunk = chunk.encode()

        self._buf += chunk

        # Fast-path: no boundary present yet
        if not self._has_boundary(self._buf):
            return []

        # Find the *last* complete boundary so we keep any trailing partial event.
        complete_part, self._buf = self._split_on_last_boundary(self._buf)
        events: list[SSEEvent] = list(parse_sse_bytes(complete_part))
        _log.debug("SSEBuffer dispatched %d event(s)", len(events))
        return events

    def reset(self) -> None:
        """Discard all buffered data."""
        self._buf = b""
        _log.debug("SSEBuffer reset")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _has_boundary(data: bytes) -> bool:
        return any(b in data for b in _BOUNDARIES)

    @staticmethod
    def _split_on_last_boundary(data: bytes) -> tuple[bytes, bytes]:
        """Return ``(complete_block, remainder)`` split after the *last* boundary.

        We split on the *last* occurrence so that any trailing partial event
        (after the final boundary) stays in the buffer.

        The boundary itself is included in *complete_block* so that
        ``parse_sse_bytes`` sees properly terminated events.
        """
        # Find the latest-ending boundary position
        best_end: int = -1
        for boundary in _BOUNDARIES:
            idx = data.rfind(boundary)
            if idx != -1:
                candidate_end = idx + len(boundary)
                if candidate_end > best_end:
                    best_end = candidate_end

        if best_end == -1:
            return b"", data

        return data[:best_end], data[best_end:]

    # Allow use as a context manager for ergonomic cleanup
    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_args: object) -> None:
        self.reset()
