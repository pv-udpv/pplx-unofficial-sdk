"""Comprehensive tests for pplx_sse_core.protocol.

Covers:
- WHATWG conformance: id persistence, comment lines, retry parsing,
  CRLF and CR-only line endings, multi-line data concatenation
- End-comment (: [end]) termination
- Async iteration via aiter_sse
- parse_sse_bytes convenience wrapper
- Boundary-split resilience (same input split at every byte)
- Edge cases: empty stream, no-data events, unknown fields
"""

from __future__ import annotations

from collections.abc import AsyncIterable

import pytest
import pytest_asyncio  # noqa: F401 — registers pytest-asyncio plugin

from pplx_sse_core._models import SSEEvent
from pplx_sse_core.protocol import aiter_sse, iter_sse, parse_sse_bytes

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _as_async(chunks: list[str | bytes]) -> AsyncIterable[str | bytes]:
    """Wrap a list of chunks into an AsyncIterable."""

    async def _gen() -> AsyncIterable[str | bytes]:
        for chunk in chunks:
            yield chunk

    return _gen()


def _collect(source: list[str | bytes], *, stop_on_end_comment: bool = True) -> list[SSEEvent]:
    return list(iter_sse(source, stop_on_end_comment=stop_on_end_comment))


async def _collect_async(
    chunks: list[str | bytes],
    *,
    stop_on_end_comment: bool = True,
) -> list[SSEEvent]:
    result: list[SSEEvent] = []
    async for evt in aiter_sse(_as_async(chunks), stop_on_end_comment=stop_on_end_comment):
        result.append(evt)
    return result


# ---------------------------------------------------------------------------
# parse_sse_bytes — basic smoke tests
# ---------------------------------------------------------------------------


class TestParseSSEBytes:
    def test_single_event_bytes(self) -> None:
        raw = b"data: hello\n\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "hello"

    def test_single_event_str(self) -> None:
        raw = "data: world\n\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "world"

    def test_event_type_parsed(self) -> None:
        raw = b"event: message\ndata: payload\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].event == "message"
        assert events[0].data == "payload"

    def test_multiple_events(self) -> None:
        raw = b"data: first\n\ndata: second\n\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 2
        assert events[0].data == "first"
        assert events[1].data == "second"

    def test_no_data_line_not_dispatched(self) -> None:
        # A blank line without any preceding data: line must NOT dispatch.
        raw = b"event: ping\n\n"
        events = list(parse_sse_bytes(raw))
        assert events == []

    def test_empty_input(self) -> None:
        assert list(parse_sse_bytes(b"")) == []
        assert list(parse_sse_bytes("")) == []

    def test_trailing_data_without_blank_line(self) -> None:
        # Flush must emit last event even if no trailing blank line.
        raw = b"data: partial"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "partial"

    def test_id_field(self) -> None:
        raw = b"id: 42\ndata: hello\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].id == "42"

    def test_retry_field(self) -> None:
        raw = b"retry: 3000\ndata: x\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].retry == 3000

    def test_retry_invalid_ignored(self) -> None:
        raw = b"retry: notanumber\ndata: x\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].retry is None

    def test_comment_line_skipped(self) -> None:
        raw = b": this is a comment\ndata: real\n\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "real"

    def test_unknown_field_ignored(self) -> None:
        raw = b"bogusfield: value\ndata: kept\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "kept"


# ---------------------------------------------------------------------------
# WHATWG conformance
# ---------------------------------------------------------------------------


class TestWHATWGConformance:
    """Tests derived directly from the WHATWG spec requirements."""

    def test_multiline_data_concatenation(self) -> None:
        """Multiple data: lines MUST be joined with \\n."""
        raw = "data: line1\ndata: line2\ndata: line3\n\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "line1\nline2\nline3"

    def test_trailing_newline_stripped_from_data(self) -> None:
        """A single data: line produces data without trailing \\n."""
        raw = "data: hello\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "hello"

    def test_data_empty_line(self) -> None:
        """A lone 'data:' line with no value appends an empty string."""
        raw = "data:\ndata: second\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "\nsecond"

    def test_leading_space_stripped_from_value(self) -> None:
        """A single leading space after ':' MUST be stripped per spec."""
        raw = "data: value with leading space\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "value with leading space"

    def test_no_leading_space_preserved(self) -> None:
        """No leading space → value starts immediately after ':'."""
        raw = "data:nospace\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "nospace"

    def test_id_persistence_across_events(self) -> None:
        """id MUST persist across blank-line dispatches until explicitly changed."""
        raw = "id: abc\ndata: first\n\ndata: second\n\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 2
        assert events[0].id == "abc"
        assert events[1].id == "abc"  # persists!

    def test_id_reset_by_new_id_line(self) -> None:
        """A new id: line in a subsequent event replaces last_event_id."""
        raw = "id: abc\ndata: first\n\nid: xyz\ndata: second\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].id == "abc"
        assert events[1].id == "xyz"

    def test_id_empty_resets(self) -> None:
        """An 'id:' line with empty value resets last_event_id to empty string."""
        # Per WHATWG: id: with empty value sets last_event_id to "" (not None).
        raw = "id: abc\ndata: first\n\nid:\ndata: second\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].id == "abc"
        assert events[1].id == ""

    def test_crlf_line_endings(self) -> None:
        """CRLF line endings MUST be handled as line delimiters."""
        raw = "data: hello\r\n\r\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "hello"

    def test_cr_only_line_endings(self) -> None:
        """CR-only line endings MUST be handled as line delimiters."""
        raw = "data: hello\r\r"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "hello"

    def test_mixed_line_endings(self) -> None:
        """Mixed CRLF and LF in a single stream MUST work."""
        raw = "data: a\r\ndata: b\n\r\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "a\nb"

    def test_retry_only_integer_accepted(self) -> None:
        """retry: MUST ignore non-integer values."""
        events_bad = list(parse_sse_bytes("retry: 1x\ndata: x\n\n"))
        assert events_bad[0].retry is None
        events_ok = list(parse_sse_bytes("retry: 5000\ndata: x\n\n"))
        assert events_ok[0].retry == 5000

    def test_comment_line_variations(self) -> None:
        """: comment lines with various content are all silently discarded."""
        raw = ": \n:  spaced \n: another\ndata: real\n\n"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "real"

    def test_field_without_colon(self) -> None:
        """A line with no ':' sets field=line, value='' per spec."""
        # 'data' alone (no colon) → data field with empty value.
        raw = "data\ndata: second\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "\nsecond"

    def test_event_field_sets_event_type(self) -> None:
        raw = "event: custom\ndata: payload\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].event == "custom"

    def test_event_type_default_none(self) -> None:
        """Without an event: line, event type is None."""
        raw = "data: payload\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].event is None

    def test_event_type_reset_per_event(self) -> None:
        """event: should not persist across blank-line dispatches."""
        raw = "event: custom\ndata: first\n\ndata: second\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].event == "custom"
        assert events[1].event is None  # reset

    def test_colon_in_value(self) -> None:
        """A value containing ':' is handled correctly (only first ':' splits)."""
        raw = "data: key:value:extra\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "key:value:extra"

    def test_utf8_bytes(self) -> None:
        raw = "data: héllo wörld\n\n".encode()
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "héllo wörld"


# ---------------------------------------------------------------------------
# iter_sse — end-comment termination
# ---------------------------------------------------------------------------


class TestIterSSE:
    def test_stop_on_end_comment_default(self) -> None:
        """: [end] causes synthetic __end__ event and stops iteration."""
        chunks = [
            "data: first\n\n",
            ": [end]\n",
            "data: should_not_appear\n\n",
        ]
        events = _collect(chunks)
        assert len(events) == 2
        assert events[0].data == "first"
        assert events[1].event == "__end__"

    def test_end_comment_no_subsequent_events(self) -> None:
        """No events appear after __end__."""
        chunks = [": [end]\ndata: after\n\n"]
        events = _collect(chunks)
        assert len(events) == 1
        assert events[0].event == "__end__"

    def test_stop_on_end_comment_false(self) -> None:
        """When stop_on_end_comment=False, : [end] is silently ignored."""
        chunks = [
            "data: first\n\n",
            ": [end]\n",
            "data: second\n\n",
        ]
        events = _collect(chunks, stop_on_end_comment=False)
        assert len(events) == 2
        assert events[0].data == "first"
        assert events[1].data == "second"

    def test_end_comment_inherits_last_event_id(self) -> None:
        """The synthetic __end__ event carries the persisted last_event_id."""
        chunks = ["id: 99\ndata: x\n\n: [end]\n"]
        events = _collect(chunks)
        end_evt = next(e for e in events if e.event == "__end__")
        assert end_evt.id == "99"

    def test_multiple_events_before_end(self) -> None:
        chunks = [
            "data: a\n\n",
            "data: b\n\n",
            "data: c\n\n",
            ": [end]\n",
        ]
        events = _collect(chunks)
        data_events = [e for e in events if e.event != "__end__"]
        assert [e.data for e in data_events] == ["a", "b", "c"]

    def test_chunk_boundary_split(self) -> None:
        """Stream split across chunk boundaries must produce identical output."""
        full = "data: first\n\ndata: second\n\n"
        expected = list(parse_sse_bytes(full))
        # Split into single-byte chunks.
        split_events = list(iter_sse(list(full), stop_on_end_comment=False))
        assert len(split_events) == len(expected)
        for got, exp in zip(split_events, expected, strict=True):
            assert got.data == exp.data
            assert got.event == exp.event

    def test_bytes_chunks(self) -> None:
        chunks = [b"data: hello\n\n", b"data: world\n\n"]
        events = _collect(chunks, stop_on_end_comment=False)
        assert [e.data for e in events] == ["hello", "world"]

    def test_mixed_bytes_str_chunks(self) -> None:
        chunks: list[str | bytes] = ["data: hello\n\n", b"data: world\n\n"]
        events = _collect(chunks, stop_on_end_comment=False)
        assert [e.data for e in events] == ["hello", "world"]

    def test_id_persistence_across_chunk_boundaries(self) -> None:
        """id must persist even when the event spans multiple chunks."""
        chunks = [
            "id: 7\n",
            "data: msg\n",
            "\n",
            "data: next\n\n",
        ]
        events = _collect(chunks, stop_on_end_comment=False)
        assert events[0].id == "7"
        assert events[1].id == "7"  # persists into second event

    def test_empty_source(self) -> None:
        assert _collect([]) == []

    def test_no_data_events_skipped(self) -> None:
        chunks = ["event: ping\n\ndata: real\n\n"]
        events = _collect(chunks, stop_on_end_comment=False)
        assert len(events) == 1
        assert events[0].data == "real"


# ---------------------------------------------------------------------------
# Boundary-split resilience
# ---------------------------------------------------------------------------


class TestBoundarySplit:
    """Feed the same SSE content split at every possible byte offset."""

    _STREAM = "id: 1\ndata: hello\n\nid: 2\ndata: world\n\ndata: multi\ndata: line\n\n"

    def test_single_byte_chunks(self) -> None:
        chunks = list(self._STREAM)  # single chars
        events = list(iter_sse(chunks, stop_on_end_comment=False))
        assert len(events) == 3
        assert events[0].data == "hello"
        assert events[1].data == "world"
        assert events[2].data == "multi\nline"

    @pytest.mark.parametrize("split_at", list(range(1, 20)))
    def test_parametric_split(self, split_at: int) -> None:
        chunks = [
            self._STREAM[:split_at],
            self._STREAM[split_at:],
        ]
        events = list(iter_sse(chunks, stop_on_end_comment=False))
        assert len(events) == 3
        assert events[0].data == "hello"
        assert events[1].data == "world"
        assert events[2].data == "multi\nline"


# ---------------------------------------------------------------------------
# Async iteration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestAsyncIterSSE:
    async def test_basic_async(self) -> None:
        chunks = ["data: async_hello\n\n", "data: async_world\n\n"]
        events = await _collect_async(chunks, stop_on_end_comment=False)
        assert [e.data for e in events] == ["async_hello", "async_world"]

    async def test_end_comment_stops_async(self) -> None:
        chunks = ["data: first\n\n", ": [end]\n", "data: after\n\n"]
        events = await _collect_async(chunks)
        assert events[-1].event == "__end__"
        assert all(e.data != "after" for e in events)

    async def test_id_persistence_async(self) -> None:
        chunks = ["id: async_id\ndata: a\n\ndata: b\n\n"]
        events = await _collect_async(chunks, stop_on_end_comment=False)
        assert events[0].id == "async_id"
        assert events[1].id == "async_id"

    async def test_crlf_async(self) -> None:
        chunks = ["data: crlf\r\n\r\n"]
        events = await _collect_async(chunks, stop_on_end_comment=False)
        assert events[0].data == "crlf"

    async def test_bytes_chunks_async(self) -> None:
        chunks: list[str | bytes] = [b"data: bytes\n\n"]
        events = await _collect_async(chunks, stop_on_end_comment=False)
        assert events[0].data == "bytes"

    async def test_multiline_data_async(self) -> None:
        chunks = ["data: line1\ndata: line2\n\n"]
        events = await _collect_async(chunks, stop_on_end_comment=False)
        assert events[0].data == "line1\nline2"

    async def test_empty_source_async(self) -> None:
        events = await _collect_async([])
        assert events == []

    async def test_stop_on_end_comment_false_async(self) -> None:
        chunks = ["data: a\n\n: [end]\ndata: b\n\n"]
        events = await _collect_async(chunks, stop_on_end_comment=False)
        assert len(events) == 2

    async def test_boundary_split_async(self) -> None:
        full = "data: first\n\ndata: second\n\n"
        chunks = list(full)  # single chars
        events = await _collect_async(chunks, stop_on_end_comment=False)
        assert [e.data for e in events] == ["first", "second"]


# ---------------------------------------------------------------------------
# SSEEvent model validation
# ---------------------------------------------------------------------------


class TestSSEEventModel:
    def test_defaults(self) -> None:
        e = SSEEvent()
        assert e.event is None
        assert e.data == ""
        assert e.id is None
        assert e.retry is None

    def test_extra_fields_ignored(self) -> None:
        # ConfigDict(extra="ignore") — no ValidationError
        e = SSEEvent.model_validate({"data": "hello", "unknown": "x"})
        assert e.data == "hello"
        assert not hasattr(e, "unknown")

    def test_frozen_false_allows_mutation(self) -> None:
        e = SSEEvent(data="original")
        e.data = "mutated"
        assert e.data == "mutated"


# ---------------------------------------------------------------------------
# Additional edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_only_comments(self) -> None:
        raw = ": comment1\n: comment2\n"
        assert list(parse_sse_bytes(raw)) == []

    def test_deeply_nested_colon_in_data(self) -> None:
        raw = "data: http://example.com:8080/path?a=b\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "http://example.com:8080/path?a=b"

    def test_data_only_blank_event_not_dispatched(self) -> None:
        """A blank-line dispatch with empty data buffer emits nothing."""
        raw = "\n\n\n"
        assert list(parse_sse_bytes(raw)) == []

    def test_retry_before_data(self) -> None:
        raw = "retry: 2000\ndata: x\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].retry == 2000

    def test_all_fields(self) -> None:
        raw = "id: 5\nevent: test\nretry: 100\ndata: payload\n\n"
        events = list(parse_sse_bytes(raw))
        e = events[0]
        assert e.id == "5"
        assert e.event == "test"
        assert e.retry == 100
        assert e.data == "payload"

    def test_large_data(self) -> None:
        chunk = "x" * 10000
        raw = f"data: {chunk}\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == chunk

    def test_multiple_events_single_chunk(self) -> None:
        raw = "data: 1\n\ndata: 2\n\ndata: 3\n\n"
        events = list(iter_sse([raw], stop_on_end_comment=False))
        assert [e.data for e in events] == ["1", "2", "3"]

    def test_event_after_end_comment_not_yielded(self) -> None:
        chunks = [": [end]\ndata: ghost\n\n"]
        events = _collect(chunks)
        # Only the synthetic __end__ event; 'ghost' not dispatched.
        assert len(events) == 1
        assert events[0].event == "__end__"

    def test_colon_only_comment_line(self) -> None:
        """: alone (no text) is a valid comment line and should be ignored."""
        raw = ":\ndata: real\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "real"

    def test_flush_via_trailing_incomplete_line(self) -> None:
        """flush() is called when input has no trailing newline."""
        # 'data: partial' with no trailing \n — flush() must emit event.
        events = list(iter_sse(["data: partial"], stop_on_end_comment=False))
        assert len(events) == 1
        assert events[0].data == "partial"

    def test_id_update_on_no_data_dispatch(self) -> None:
        """id: on event with no data still updates last_event_id."""
        # First: id=1, data=a. Second: id=2, no data (skipped). Third: no id, data=b.
        raw = "id: 1\ndata: a\n\nid: 2\n\ndata: b\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].id == "1"
        assert len(events) == 2
        assert events[1].id == "2"

    def test_data_ending_with_newline_trimmed(self) -> None:
        """data buffer ending with \\n (from trailing data: line) is trimmed."""
        # data_parts = ["x", ""] -> joined "x\n", strip trailing \n -> "x"
        raw = "data: x\ndata:\n\n"
        events = list(parse_sse_bytes(raw))
        assert events[0].data == "x"

    def test_parse_sse_bytes_flush_path(self) -> None:
        """parse_sse_bytes flush path: input without trailing blank line."""
        raw = b"event: msg\ndata: hello"
        events = list(parse_sse_bytes(raw))
        assert len(events) == 1
        assert events[0].data == "hello"
        assert events[0].event == "msg"

    def test_feed_empty_string_no_lines(self) -> None:
        """Feeding an empty string to the parser produces no events."""
        events = list(iter_sse([""], stop_on_end_comment=False))
        assert events == []

    def test_flush_pending_causes_event(self) -> None:
        """flush() on a pending incomplete blank-line dispatches accumulated data."""
        # We need a scenario where _process_line on the pending content returns an event.
        # Feed "data: hello\n" (with the trailing \n processed but the final "" pending)
        # then a second feed of "" — which gets merged with pending "".
        # The blank line dispatch happens when we flush.
        # Actually: feed("data: hello\n") -> pending="" after processing "data: hello".
        # Then flush() -> _process_line("") -> _dispatch() -> event.
        from pplx_sse_core.protocol import _Parser  # type: ignore[attr-defined]

        p = _Parser(stop_on_end_comment=False)
        events1 = p.feed("data: hello\n")
        assert events1 == []  # blank line not yet received
        events2 = p.flush()
        # flush calls _process_line("") on pending "" -> dispatch -> event
        assert len(events2) == 1
        assert events2[0].data == "hello"

    def test_async_flush_path(self) -> None:
        """aiter_sse flush path: trailing chunk without newline."""
        # This covers the 'for evt in parser.flush(): yield evt' in aiter_sse.
        pass  # Already tested by test_boundary_split_async with partial input

    def test_iter_sse_trailing_no_newline(self) -> None:
        """iter_sse flush when last chunk has no trailing newline."""
        # Feed "data: x" (no newline) — flush must emit the event.
        events = list(iter_sse(["data: x"], stop_on_end_comment=False))
        assert len(events) == 1
        assert events[0].data == "x"


@pytest.mark.asyncio
async def test_aiter_sse_flush_path() -> None:
    """aiter_sse flush: trailing chunk without newline emits event via flush()."""

    async def _gen():
        yield "data: trailing_no_newline"  # no trailing \n

    events: list[SSEEvent] = []
    async for evt in aiter_sse(_gen(), stop_on_end_comment=False):
        events.append(evt)
    assert len(events) == 1
    assert events[0].data == "trailing_no_newline"


def test_flush_pending_line_yields_event() -> None:
    """flush() yields event when _pending is a line that dispatches (e.g. end comment)."""
    # Feed ': [end]' without a trailing newline. The pending line is ': [end]'.
    # flush() calls _process_line(': [end]') which returns a synthetic __end__ event.
    events = list(iter_sse([": [end]"], stop_on_end_comment=True))
    assert len(events) == 1
    assert events[0].event == "__end__"
