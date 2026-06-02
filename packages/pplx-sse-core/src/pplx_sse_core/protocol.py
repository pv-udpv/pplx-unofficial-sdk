"""WHATWG-compliant SSE (Server-Sent Events) protocol parser.

Implements the event-stream parsing algorithm described in:
  https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream

Key behaviours
--------------
- ``data:`` lines concatenate with ``\\n``; trailing newline trimmed on dispatch.
- Blank line (``\\n``, ``\\r\\n``, or ``\\r``) dispatches the current event.
- ``id`` field persists across events until explicitly reset by a new ``id:`` line.
- ``: [end]`` comment line acts as a synthetic stream terminator when
  ``stop_on_end_comment=True`` (pplx-sdk compatibility).
- Accepts both ``bytes`` and ``str`` chunks; bytes are decoded as UTF-8.
- Supports CRLF and CR-only line endings in addition to LF.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterable, AsyncIterator, Iterable, Iterator

from ._models import SSEEvent

__all__ = [
    "aiter_sse",
    "iter_sse",
    "parse_sse_bytes",
]

_LOG = logging.getLogger("pplx_sse_core.protocol")

# Synthetic event type emitted when `: [end]` comment is encountered.
_END_EVENT = "__end__"
_END_COMMENT = ": [end]"

# Sentinel: distinguishes "no id: field seen" from "id: field seen with empty value".
_NO_ID: str | None = object()  # type: ignore[assignment]


def _decode(chunk: str | bytes) -> str:
    """Decode *chunk* to ``str``, replacing invalid bytes."""
    if isinstance(chunk, bytes):
        return chunk.decode("utf-8", errors="replace")
    return chunk


def _split_lines(text: str) -> list[str]:
    """Split *text* into lines, normalising CR, CRLF, and LF.

    Returns the raw lines WITHOUT their line-ending characters.
    A trailing empty string is kept so that a final blank line is detected.
    """
    # Normalise all line endings to LF first, being careful about CRLF.
    # Replace CRLF → LF, then lone CR → LF.
    normalised = text.replace("\r\n", "\n").replace("\r", "\n")
    return normalised.split("\n")


class _Parser:
    """Stateful WHATWG SSE parser.

    Feed raw text via :meth:`feed`; it returns a (possibly empty) list of
    :class:`~pplx_sse_core._models.SSEEvent` objects that have been dispatched.

    ``last_event_id`` persists across calls — do NOT reset it between feeds.
    """

    def __init__(self, *, stop_on_end_comment: bool = True) -> None:
        self._stop_on_end_comment = stop_on_end_comment
        # Pending line buffer for incomplete lines between feeds.
        self._pending: str = ""
        # Per-event accumulator fields (reset on blank-line dispatch).
        self._event_type: str | None = None
        self._data_parts: list[str] = []
        # _event_id uses _NO_ID sentinel to distinguish "no id: seen" from "id: with empty value".
        self._event_id: str | None = _NO_ID
        self._retry: int | None = None
        # Persists across events per WHATWG spec.
        self._last_event_id: str | None = None
        # Set to True when `: [end]` is seen and stop_on_end_comment is True.
        self.terminated: bool = False

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def feed(self, chunk: str | bytes) -> list[SSEEvent]:
        """Feed a chunk of text/bytes; return any newly dispatched events."""
        text = _decode(chunk)
        # Prepend any incomplete line from a previous feed.
        text = self._pending + text
        self._pending = ""

        lines = _split_lines(text)

        # The last element may be an incomplete line (no trailing newline yet).
        # If the original text ended with \n the last element will be "".
        # We can tell the difference: a complete last line means the text ended
        # with a newline character, producing a trailing "".  An incomplete last
        # line does NOT end with a newline, so the last element is non-empty
        # (or empty *and* there was nothing after the last newline).
        #
        # Strategy: always hold back the last element as potentially incomplete.
        # We process lines[:-1] and save lines[-1] as pending.
        # _split_lines always returns at least one element, so lines is never empty.
        self._pending = lines[-1]
        process = lines[:-1]

        events: list[SSEEvent] = []
        for line in process:
            result = self._process_line(line)
            if result is not None:
                events.append(result)
                if self.terminated:
                    break
        return events

    def flush(self) -> list[SSEEvent]:
        """Flush any remaining buffered content as if a final newline arrived."""
        events: list[SSEEvent] = []
        if self._pending:
            result = self._process_line(self._pending)
            self._pending = ""
            if result is not None:
                events.append(result)
        # Dispatch any partial event still in the accumulator.
        if self._data_parts:
            evt = self._dispatch()
            if evt is not None:
                events.append(evt)
        return events

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _process_line(self, line: str) -> SSEEvent | None:
        """Process a single decoded line; return a dispatched event or None."""
        # Blank line → dispatch current event.
        if not line:
            return self._dispatch()

        # Comment line.
        if line.startswith(":"):
            comment = line[1:].lstrip(" ")
            if self._stop_on_end_comment and comment == "[end]":
                _LOG.debug("Received ': [end]' terminator comment")
                self.terminated = True
                # Yield a synthetic termination event.
                return SSEEvent(
                    event=_END_EVENT,
                    data="",
                    id=self._last_event_id,
                )
            # All other comments are silently ignored.
            return None

        # Field line: split on first ":".
        if ":" in line:
            field, _, value = line.partition(":")
            # A single leading space after the colon is stripped per spec.
            if value.startswith(" "):
                value = value[1:]
        else:
            field = line
            value = ""

        self._set_field(field, value)
        return None

    def _set_field(self, field: str, value: str) -> None:
        """Apply a parsed field/value pair to the current event buffer."""
        if field == "event":
            self._event_type = value
        elif field == "data":
            self._data_parts.append(value)
        elif field == "id":
            # Per WHATWG: set last_event_id buffer to value (may be empty string).
            # A NULL byte in value causes the field to be ignored (not applicable here).
            self._event_id = value  # May be "" — this is valid and resets last_event_id to ""
        elif field == "retry":
            try:
                ms = int(value)
                self._retry = ms
            except ValueError:
                # Ignore non-integer retry values per spec.
                pass
        # Unknown fields are ignored per spec.

    def _dispatch(self) -> SSEEvent | None:
        """Dispatch the current event buffer; return the event or None.

        Returns None if there is no data to dispatch (per WHATWG spec the
        event is not dispatched if the data buffer is empty).
        """
        # Per WHATWG: if data buffer is empty string, reset and return.
        # However, an empty data *list* (no data: lines seen) also means skip.
        if not self._data_parts:
            # Still update last_event_id if a new id was provided.
            if self._event_id is not _NO_ID:
                self._last_event_id = self._event_id
            self._reset_event()
            return None

        # Concatenate data lines with \n and strip trailing newline.
        data = "\n".join(self._data_parts)
        if data.endswith("\n"):
            data = data[:-1]

        # Update persistent last_event_id.
        if self._event_id is not _NO_ID:
            self._last_event_id = self._event_id
        # else: last_event_id persists unchanged.

        event = SSEEvent(
            event=self._event_type,
            data=data,
            id=self._last_event_id,
            retry=self._retry,
        )
        self._reset_event()
        return event

    def _reset_event(self) -> None:
        """Reset per-event accumulators (NOT last_event_id)."""
        self._event_type = None
        self._data_parts = []
        self._event_id = _NO_ID
        self._retry = None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_sse_bytes(raw: bytes | str) -> Iterator[SSEEvent]:
    """Parse a complete SSE blob (bytes or str) and yield :class:`SSEEvent` objects.

    This is a convenience wrapper that buffers the entire input internally and
    handles CRLF/CR/LF line endings.  It does NOT apply the ``stop_on_end_comment``
    terminator — use :func:`iter_sse` when you need that behaviour.

    Parameters
    ----------
    raw:
        The complete SSE byte-stream or string.

    Yields
    ------
    SSEEvent
        One event per blank-line-delimited block with at least one ``data:`` line.
    """
    parser = _Parser(stop_on_end_comment=False)
    yield from parser.feed(raw)
    yield from parser.flush()


def iter_sse(
    source: Iterable[str | bytes],
    *,
    stop_on_end_comment: bool = True,
) -> Iterator[SSEEvent]:
    """Iterate over SSE events from a synchronous source of chunks.

    Parameters
    ----------
    source:
        An iterable of ``str`` or ``bytes`` chunks (e.g. lines from an HTTP
        response).  Chunks need not be line-aligned.
    stop_on_end_comment:
        When ``True`` (default), a ``: [end]`` comment line causes a synthetic
        ``SSEEvent(event="__end__")`` to be yielded and iteration to stop.
        Set to ``False`` for endpoints that do not use this terminator.

    Yields
    ------
    SSEEvent
        Parsed events in order.  When *stop_on_end_comment* is True the final
        yielded event will have ``event="__end__"``.
    """
    parser = _Parser(stop_on_end_comment=stop_on_end_comment)
    for chunk in source:
        events = parser.feed(chunk)
        for evt in events:
            yield evt
        if parser.terminated:
            return
    # Flush any trailing partial content.
    for evt in parser.flush():
        yield evt


async def aiter_sse(
    source: AsyncIterable[str | bytes],
    *,
    stop_on_end_comment: bool = True,
) -> AsyncIterator[SSEEvent]:
    """Async-iterate over SSE events from an asynchronous source of chunks.

    Parameters
    ----------
    source:
        An async iterable of ``str`` or ``bytes`` chunks.
    stop_on_end_comment:
        When ``True`` (default), a ``: [end]`` comment line causes a synthetic
        ``SSEEvent(event="__end__")`` to be yielded and iteration to stop.

    Yields
    ------
    SSEEvent
        Parsed events in order.
    """
    parser = _Parser(stop_on_end_comment=stop_on_end_comment)
    async for chunk in source:
        events = parser.feed(chunk)
        for evt in events:
            yield evt
        if parser.terminated:
            return
    # Flush any trailing partial content.
    for evt in parser.flush():
        yield evt
