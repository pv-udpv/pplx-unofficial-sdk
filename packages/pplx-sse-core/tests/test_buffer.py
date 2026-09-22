"""Tests for buffer.py — SSEBuffer boundary-split, reset, bytes vs str input."""

from __future__ import annotations

import pathlib

import pytest

from pplx_sse_core._models import SSEEvent
from pplx_sse_core.buffer import SSEBuffer
from pplx_sse_core.protocol import parse_sse_bytes

FIXTURES_DIR = pathlib.Path(__file__).parent / "fixtures"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _read_fixture(name: str) -> bytes:
    return (FIXTURES_DIR / name).read_bytes()


def _all_events_via_buffer(data: bytes | str, chunk_size: int) -> list[SSEEvent]:
    """Feed *data* to a fresh SSEBuffer in chunks of *chunk_size* bytes."""
    buf = SSEBuffer()
    results: list[SSEEvent] = []

    encoded = data.encode() if isinstance(data, str) else data

    for start in range(0, len(encoded), chunk_size):
        piece = encoded[start : start + chunk_size]
        results.extend(buf.feed(piece))

    return results


# ---------------------------------------------------------------------------
# Basic functionality
# ---------------------------------------------------------------------------


class TestSSEBufferBasic:
    def test_single_chunk_returns_events(self) -> None:
        data = b"event: message\ndata: hello\n\n"
        buf = SSEBuffer()
        events = buf.feed(data)
        assert len(events) == 1
        assert events[0].data == "hello"

    def test_incomplete_chunk_returns_empty(self) -> None:
        buf = SSEBuffer()
        events = buf.feed(b"event: message\ndata: hel")
        assert events == []

    def test_completion_on_second_chunk(self) -> None:
        buf = SSEBuffer()
        first = buf.feed(b"event: message\ndata: hello")
        assert first == []
        second = buf.feed(b"\n\n")
        assert len(second) == 1
        assert second[0].data == "hello"

    def test_multiple_events_in_one_chunk(self) -> None:
        data = b"data: first\n\ndata: second\n\n"
        buf = SSEBuffer()
        events = buf.feed(data)
        assert len(events) == 2
        assert events[0].data == "first"
        assert events[1].data == "second"

    def test_trailing_partial_held(self) -> None:
        """Buffer keeps trailing partial event across feeds."""
        buf = SSEBuffer()
        # Two complete + one partial
        data = b"data: one\n\ndata: two\n\ndata: thr"
        events = buf.feed(data)
        assert len(events) == 2
        # Now complete it
        events2 = buf.feed(b"ee\n\n")
        assert len(events2) == 1
        assert events2[0].data == "three"

    def test_crlf_boundary(self) -> None:
        data = b"data: crlf\r\n\r\n"
        buf = SSEBuffer()
        events = buf.feed(data)
        assert len(events) == 1
        assert events[0].data == "crlf"

    def test_crlf_split_across_chunks(self) -> None:
        buf = SSEBuffer()
        buf.feed(b"data: crlf\r\n")
        events = buf.feed(b"\r\n")
        assert len(events) == 1

    def test_empty_chunk_returns_empty(self) -> None:
        buf = SSEBuffer()
        assert buf.feed(b"") == []

    def test_str_input(self) -> None:
        buf = SSEBuffer()
        events = buf.feed("data: string input\n\n")
        assert len(events) == 1
        assert events[0].data == "string input"

    def test_bytes_and_str_mixed(self) -> None:
        buf = SSEBuffer()
        buf.feed(b"data: mix")
        events = buf.feed("ed\n\n")
        assert len(events) == 1
        assert events[0].data == "mixed"


# ---------------------------------------------------------------------------
# reset()
# ---------------------------------------------------------------------------


class TestSSEBufferReset:
    def test_reset_clears_partial(self) -> None:
        buf = SSEBuffer()
        buf.feed(b"data: incomplete")
        buf.reset()
        # After reset, partial is gone
        events = buf.feed(b"\n\n")
        # Nothing meaningful in the buffer after reset
        assert events == []

    def test_reset_then_feed_works(self) -> None:
        buf = SSEBuffer()
        buf.feed(b"data: partial")
        buf.reset()
        events = buf.feed(b"data: fresh\n\n")
        assert len(events) == 1
        assert events[0].data == "fresh"

    def test_multiple_resets(self) -> None:
        buf = SSEBuffer()
        for _ in range(5):
            buf.feed(b"data: partial")
            buf.reset()
        events = buf.feed(b"data: ok\n\n")
        assert len(events) == 1

    def test_reset_after_complete_events(self) -> None:
        buf = SSEBuffer()
        buf.feed(b"data: one\n\n")
        buf.reset()
        events = buf.feed(b"data: two\n\n")
        assert len(events) == 1
        assert events[0].data == "two"


# ---------------------------------------------------------------------------
# Context-manager interface
# ---------------------------------------------------------------------------


class TestSSEBufferContextManager:
    def test_context_manager_resets_on_exit(self) -> None:
        with SSEBuffer() as buf:
            buf.feed(b"data: partial")
        # After __exit__, buffer should be reset (clear) — feeding \n\n yields nothing
        events = buf.feed(b"\n\n")
        assert events == []


# ---------------------------------------------------------------------------
# Boundary-split parametric test: split at EVERY byte position
# ---------------------------------------------------------------------------


class TestBoundarySplit:
    """
    Take the boundary_split.sse fixture and split the raw bytes at every
    position 1..N-1.  SSEBuffer must assemble the correct number of events
    regardless of split point.
    """

    @pytest.fixture(scope="class")
    def fixture_data(self) -> bytes:
        return _read_fixture("boundary_split.sse")

    @pytest.fixture(scope="class")
    def expected_count(self, fixture_data: bytes) -> int:
        return len(list(parse_sse_bytes(fixture_data)))

    @pytest.mark.parametrize("split_pos", list(range(1, 400, 3)))  # sample every 3 bytes
    def test_split_at_position_sampled(
        self, fixture_data: bytes, expected_count: int, split_pos: int
    ) -> None:
        """Feed fixture in exactly 2 chunks: [0:split_pos] and [split_pos:].
        Both chunks together must produce expected_count events.
        """
        if split_pos >= len(fixture_data):
            pytest.skip("split_pos beyond fixture size")

        buf = SSEBuffer()
        events: list[SSEEvent] = []
        events.extend(buf.feed(fixture_data[:split_pos]))
        events.extend(buf.feed(fixture_data[split_pos:]))
        assert len(events) == expected_count

    def test_every_single_byte(self, fixture_data: bytes, expected_count: int) -> None:
        """Feed exactly one byte at a time — stress test."""
        events = _all_events_via_buffer(fixture_data, chunk_size=1)
        assert len(events) == expected_count

    def test_two_byte_chunks(self, fixture_data: bytes, expected_count: int) -> None:
        events = _all_events_via_buffer(fixture_data, chunk_size=2)
        assert len(events) == expected_count

    def test_seven_byte_chunks(self, fixture_data: bytes, expected_count: int) -> None:
        events = _all_events_via_buffer(fixture_data, chunk_size=7)
        assert len(events) == expected_count

    def test_large_chunk(self, fixture_data: bytes, expected_count: int) -> None:
        events = _all_events_via_buffer(fixture_data, chunk_size=10_000)
        assert len(events) == expected_count

    def test_exact_fixture_events_content(self, fixture_data: bytes) -> None:
        """Verify the assembled events have correct content (not just count)."""
        events = _all_events_via_buffer(fixture_data, chunk_size=1)
        # All events should be parseable as web events
        import json

        for evt in events:
            outer = json.loads(evt.data)
            assert "text" in outer
            inner = json.loads(outer["text"])
            assert "answer" in inner


# ---------------------------------------------------------------------------
# Exhaustive split test (all positions) — separate dedicated test
# ---------------------------------------------------------------------------


class TestBoundarySplitExhaustive:
    def test_all_split_positions(self) -> None:
        """Split at every byte position 1..N-1 (per CONTRACT requirement)."""
        data = _read_fixture("boundary_split.sse")
        expected = len(list(parse_sse_bytes(data)))
        n = len(data)

        for split_pos in range(1, n):
            buf = SSEBuffer()
            events: list[SSEEvent] = []
            events.extend(buf.feed(data[:split_pos]))
            events.extend(buf.feed(data[split_pos:]))
            assert len(events) == expected, (
                f"Split at byte {split_pos}: expected {expected} events, got {len(events)}"
            )


# ---------------------------------------------------------------------------
# Golden fixture: boundary_split.sse — full round-trip
# ---------------------------------------------------------------------------


class TestGoldenBoundarySplit:
    def test_parses_three_events(self) -> None:
        data = _read_fixture("boundary_split.sse")
        buf = SSEBuffer()
        events = buf.feed(data)
        assert len(events) == 3

    def test_last_event_is_final(self) -> None:
        import json

        data = _read_fixture("boundary_split.sse")
        buf = SSEBuffer()
        events = buf.feed(data)
        last = events[-1]
        outer = json.loads(last.data)
        inner = json.loads(outer["text"])
        assert inner.get("final") is True


# ---------------------------------------------------------------------------
# edge-cases: event field parsing preserved through buffer
# ---------------------------------------------------------------------------


class TestBufferPreservesEventFields:
    def test_event_field_preserved(self) -> None:
        data = b"event: custom\ndata: payload\n\n"
        buf = SSEBuffer()
        events = buf.feed(data)
        assert len(events) == 1
        assert events[0].event == "custom"
        assert events[0].data == "payload"

    def test_id_field_preserved(self) -> None:
        data = b"id: 42\ndata: with-id\n\n"
        buf = SSEBuffer()
        events = buf.feed(data)
        assert events[0].id == "42"

    def test_retry_field_preserved(self) -> None:
        data = b"retry: 3000\ndata: x\n\n"
        buf = SSEBuffer()
        events = buf.feed(data)
        assert events[0].retry == 3000

    def test_comment_line_in_buffer(self) -> None:
        data = b": this is a comment\ndata: actual\n\n"
        buf = SSEBuffer()
        events = buf.feed(data)
        assert len(events) == 1
        assert events[0].data == "actual"


# ---------------------------------------------------------------------------
# Additional coverage for internal boundary-split edge paths
# ---------------------------------------------------------------------------


class TestSSEBufferInternalPaths:
    def test_boundary_at_very_start(self) -> None:
        """Boundary at position 0 (only the delimiter) → empty complete_part → []."""
        buf = SSEBuffer()
        # Feed just the boundary with no prior content — complete_part will be empty.
        events = buf.feed(b"\n\n")
        # The two-newline block has no data lines so parse_sse_bytes returns nothing,
        # but the important thing is we don't crash and don't get events.
        assert events == []

    def test_split_on_last_boundary_no_boundary(self) -> None:
        """Directly exercise _split_on_last_boundary with data containing no boundary."""
        result = SSEBuffer._split_on_last_boundary(b"no boundary here")
        assert result == (b"", b"no boundary here")

    def test_partial_boundary_then_complete(self) -> None:
        """Partial \r\n held in buffer, completed on next feed."""
        buf = SSEBuffer()
        # Feed an event where \r\n\r\n is split across two chunks
        first = buf.feed(b"data: partial-crlf\r\n")
        assert first == []
        second = buf.feed(b"\r\n")
        assert len(second) == 1
        assert second[0].data == "partial-crlf"
