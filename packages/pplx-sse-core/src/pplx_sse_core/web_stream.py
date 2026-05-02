"""web_stream.py — decode_web_event, parse_web_stream, aparse_web_stream, collect_web_response.

Handles double-encoded JSON from /rest/sse/perplexity_ask:
  outer event.data is JSON; inside it, the ``text`` (or ``chunks``) field is
  *another* JSON string that must be parsed again.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterable, AsyncIterator, Iterable, Iterator
from typing import Any

from ._models import SSEEvent, WebResult, WebStreamEvent

__all__ = [
    "aparse_web_stream",
    "collect_web_response",
    "decode_web_event",
    "parse_web_stream",
]

_log = logging.getLogger("pplx_sse_core.web_stream")


def _parse_inner(raw: str) -> dict[str, Any]:
    """Parse the inner double-encoded JSON string.

    Raises ``ValueError`` if the string is not valid JSON or not a dict.
    """
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError(f"Inner JSON is not a dict: {type(parsed)}")
    return parsed


def _build_web_stream_event(
    outer: dict[str, Any],
    inner: dict[str, Any] | None,
    raw_text: str | None,
) -> WebStreamEvent:
    """Construct a ``WebStreamEvent`` from outer envelope and optional inner payload."""
    # Pull fields preferring inner (which has the real answer/web_results),
    # falling back to outer for envelope-level fields like backend_uuid / final.
    answer: str = ""
    web_results: list[WebResult] = []
    final: bool = bool(outer.get("final", False))
    backend_uuid: str | None = outer.get("backend_uuid")
    cursor: str | None = outer.get("cursor")
    reconnectable: bool = bool(outer.get("reconnectable", False))

    if inner is not None:
        answer = str(inner.get("answer", ""))
        final = bool(inner.get("final", final))
        raw_results = inner.get("web_results", [])
        if isinstance(raw_results, list):
            for item in raw_results:
                if isinstance(item, dict):
                    web_results.append(
                        WebResult(
                            title=str(item.get("title", "")),
                            url=str(item.get("url", "")),
                            snippet=item.get("snippet") or None,
                        )
                    )

    return WebStreamEvent(
        answer=answer,
        final=final,
        web_results=web_results,
        backend_uuid=backend_uuid,
        raw_text=raw_text,
        cursor=cursor,
        reconnectable=reconnectable,
    )


def decode_web_event(event: SSEEvent) -> WebStreamEvent | None:
    """Decode a single SSE event from /rest/sse/perplexity_ask.

    Double-encoding contract
    ------------------------
    * ``event.data`` is JSON (outer envelope).
    * Inside the outer JSON, the ``text`` field (or ``chunks``) is *another*
      JSON string encoding the real payload (answer, web_results, …).
    * If outer JSON parse fails → return ``None`` (skip event).
    * If inner JSON parse fails → fall back to ``raw_text=outer_text`` with
      an otherwise empty ``WebStreamEvent``.
    """
    # Outer parse
    try:
        outer: dict[str, Any] = json.loads(event.data)
    except (json.JSONDecodeError, ValueError):
        _log.debug("Outer JSON parse failed for data=%r", event.data[:200])
        return None

    if not isinstance(outer, dict):
        _log.debug("Outer JSON is not a dict: %r", type(outer))
        return None

    # Locate inner JSON string — ``text`` is primary, ``chunks`` is fallback
    raw_text: str | None = None
    inner: dict[str, Any] | None = None

    text_field: Any = outer.get("text")
    chunks_field: Any = outer.get("chunks")

    candidate: str | None = None
    if isinstance(text_field, str):
        candidate = text_field
    elif isinstance(chunks_field, str):
        candidate = chunks_field

    if candidate is not None:
        raw_text = candidate
        try:
            inner = _parse_inner(candidate)
        except (json.JSONDecodeError, ValueError):
            _log.debug("Inner JSON parse failed; falling back to raw_text")
            inner = None
    else:
        # text / chunks may already be a dict (not double-encoded) — handle gracefully
        if isinstance(text_field, dict):
            inner = text_field
        elif isinstance(chunks_field, dict):
            inner = chunks_field

    return _build_web_stream_event(outer, inner, raw_text)


def parse_web_stream(
    events: Iterable[SSEEvent],
    *,
    stop_on_done: bool = True,
) -> Iterator[WebStreamEvent]:
    """Yield ``WebStreamEvent`` objects from an iterable of ``SSEEvent``s.

    Parameters
    ----------
    events:
        Source of raw SSE events (e.g. from ``iter_sse``).
    stop_on_done:
        If ``True`` (default), stop after the first event where
        ``final=True`` or when an ``event.event == "__end__"`` sentinel is
        received.
    """
    for raw in events:
        if raw.event == "__end__":
            _log.debug("Received __end__ sentinel; stopping web stream")
            return

        decoded = decode_web_event(raw)
        if decoded is None:
            continue

        yield decoded

        if stop_on_done and decoded.final:
            _log.debug("final=True received; stopping web stream")
            return


async def aparse_web_stream(
    events: AsyncIterable[SSEEvent],
    *,
    stop_on_done: bool = True,
) -> AsyncIterator[WebStreamEvent]:
    """Async variant of ``parse_web_stream``."""
    async for raw in events:
        if raw.event == "__end__":
            _log.debug("Received __end__ sentinel; stopping web stream")
            return

        decoded = decode_web_event(raw)
        if decoded is None:
            continue

        yield decoded

        if stop_on_done and decoded.final:
            _log.debug("final=True received; stopping web stream")
            return


def collect_web_response(events: Iterable[SSEEvent]) -> tuple[str, list[WebResult]]:
    """Consume all events and return the final ``(answer, web_results)`` pair.

    Aggregation strategy
    --------------------
    * ``answer``: each non-empty event replaces the accumulated value (each
      event carries the *cumulative* answer, not a delta).
    * ``web_results``: union by URL — first occurrence wins for ordering;
      duplicates (same URL) are dropped.
    """
    answer: str = ""
    seen_urls: set[str] = set()
    web_results: list[WebResult] = []

    for raw in events:
        decoded = decode_web_event(raw)
        if decoded is None:
            continue

        if decoded.answer:
            answer = decoded.answer

        for wr in decoded.web_results:
            if wr.url not in seen_urls:
                seen_urls.add(wr.url)
                web_results.append(wr)

    return answer, web_results
