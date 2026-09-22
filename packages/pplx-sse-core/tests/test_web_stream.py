"""Tests for web_stream.py — double-encoding, fallback, aggregation, async, dedup."""

from __future__ import annotations

import json
import pathlib
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio  # noqa: F401  (needed for pytest-asyncio collection)

from pplx_sse_core._models import SSEEvent, WebStreamEvent
from pplx_sse_core.protocol import parse_sse_bytes
from pplx_sse_core.web_stream import (
    aparse_web_stream,
    collect_web_response,
    decode_web_event,
    parse_web_stream,
)

FIXTURES_DIR = pathlib.Path(__file__).parent / "fixtures"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_event(outer: dict) -> SSEEvent:  # type: ignore[type-arg]
    """Build an SSEEvent whose data is the JSON-serialised *outer* dict."""
    return SSEEvent(event="message", data=json.dumps(outer))


def make_double_encoded(inner: dict, **outer_extra) -> SSEEvent:  # type: ignore[type-arg]
    """Build a properly double-encoded SSEEvent."""
    outer = {"text": json.dumps(inner), **outer_extra}
    return make_event(outer)


async def alist(ait: AsyncIterator[WebStreamEvent]) -> list[WebStreamEvent]:
    return [item async for item in ait]


# ---------------------------------------------------------------------------
# decode_web_event — outer parse failures
# ---------------------------------------------------------------------------


class TestDecodeWebEventOuterFailure:
    def test_invalid_json_returns_none(self) -> None:
        evt = SSEEvent(data="not json at all {{{")
        assert decode_web_event(evt) is None

    def test_empty_data_returns_none(self) -> None:
        evt = SSEEvent(data="")
        assert decode_web_event(evt) is None

    def test_json_array_returns_none(self) -> None:
        evt = SSEEvent(data="[1, 2, 3]")
        assert decode_web_event(evt) is None

    def test_json_null_returns_none(self) -> None:
        evt = SSEEvent(data="null")
        assert decode_web_event(evt) is None


# ---------------------------------------------------------------------------
# decode_web_event — double-encoding (happy path)
# ---------------------------------------------------------------------------


class TestDecodeWebEventDoubleEncoding:
    def test_parses_inner_answer(self) -> None:
        evt = make_double_encoded({"answer": "Paris", "web_results": []})
        result = decode_web_event(evt)
        assert result is not None
        assert result.answer == "Paris"

    def test_parses_web_results(self) -> None:
        inner = {
            "answer": "Paris",
            "web_results": [
                {"title": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Paris"},
            ],
        }
        result = decode_web_event(make_double_encoded(inner))
        assert result is not None
        assert len(result.web_results) == 1
        assert result.web_results[0].url == "https://en.wikipedia.org/wiki/Paris"

    def test_final_from_inner(self) -> None:
        inner = {"answer": "done", "web_results": [], "final": True}
        result = decode_web_event(make_double_encoded(inner, final=False))
        assert result is not None
        assert result.final is True

    def test_final_from_outer_when_inner_absent(self) -> None:
        outer = {"text": json.dumps({"answer": "x", "web_results": []}), "final": True}
        result = decode_web_event(make_event(outer))
        assert result is not None
        # inner doesn't have final; outer does
        assert result.final is True

    def test_backend_uuid_from_outer(self) -> None:
        evt = make_double_encoded({"answer": "x", "web_results": []}, backend_uuid="abc-123")
        result = decode_web_event(evt)
        assert result is not None
        assert result.backend_uuid == "abc-123"

    def test_raw_text_set_to_inner_string(self) -> None:
        inner_str = json.dumps({"answer": "hi", "web_results": []})
        outer = {"text": inner_str, "final": False}
        result = decode_web_event(make_event(outer))
        assert result is not None
        assert result.raw_text == inner_str

    def test_web_result_snippet_optional(self) -> None:
        inner = {
            "answer": "test",
            "web_results": [{"title": "T", "url": "https://t.example.com"}],
        }
        result = decode_web_event(make_double_encoded(inner))
        assert result is not None
        assert result.web_results[0].snippet is None

    def test_web_result_with_snippet(self) -> None:
        inner = {
            "answer": "test",
            "web_results": [{"title": "T", "url": "https://t.example.com", "snippet": "desc"}],
        }
        result = decode_web_event(make_double_encoded(inner))
        assert result is not None
        assert result.web_results[0].snippet == "desc"

    def test_chunks_field_as_fallback(self) -> None:
        inner = {"answer": "via chunks", "web_results": []}
        outer = {"chunks": json.dumps(inner), "final": False}
        result = decode_web_event(make_event(outer))
        assert result is not None
        assert result.answer == "via chunks"


# ---------------------------------------------------------------------------
# decode_web_event — inner parse failure → raw_text fallback
# ---------------------------------------------------------------------------


class TestDecodeWebEventInnerFallback:
    def test_invalid_inner_json_sets_raw_text(self) -> None:
        outer = {"text": "not valid json {{", "final": False}
        result = decode_web_event(make_event(outer))
        assert result is not None
        # Falls back to raw_text, answer empty
        assert result.raw_text == "not valid json {{"
        assert result.answer == ""
        assert result.web_results == []

    def test_inner_json_array_falls_back(self) -> None:
        outer = {"text": "[1, 2, 3]", "final": False}
        result = decode_web_event(make_event(outer))
        assert result is not None
        assert result.raw_text == "[1, 2, 3]"
        assert result.answer == ""

    def test_outer_without_text_or_chunks(self) -> None:
        outer = {"final": False, "backend_uuid": "x"}
        result = decode_web_event(make_event(outer))
        assert result is not None
        assert result.answer == ""
        assert result.raw_text is None

    def test_malformed_web_result_items_skipped(self) -> None:
        inner = {
            "answer": "ok",
            "web_results": [
                "not a dict",
                {"title": "Good", "url": "https://good.example.com"},
            ],
        }
        result = decode_web_event(make_double_encoded(inner))
        assert result is not None
        assert len(result.web_results) == 1
        assert result.web_results[0].title == "Good"


# ---------------------------------------------------------------------------
# Golden fixture: web_double_encoded.sse
# ---------------------------------------------------------------------------


class TestGoldenWebDoubleEncoded:
    def test_fixture_parses_two_events(self) -> None:
        raw = (FIXTURES_DIR / "web_double_encoded.sse").read_bytes()
        events = list(parse_sse_bytes(raw))
        decoded = [decode_web_event(e) for e in events]
        decoded = [d for d in decoded if d is not None]
        assert len(decoded) == 2

    def test_first_event_not_final(self) -> None:
        raw = (FIXTURES_DIR / "web_double_encoded.sse").read_bytes()
        events = list(parse_sse_bytes(raw))
        first = decode_web_event(events[0])
        assert first is not None
        assert first.final is False
        assert first.answer == "Paris"

    def test_second_event_final_with_full_answer(self) -> None:
        raw = (FIXTURES_DIR / "web_double_encoded.sse").read_bytes()
        events = list(parse_sse_bytes(raw))
        second = decode_web_event(events[1])
        assert second is not None
        assert second.final is True
        assert "France" in second.answer

    def test_web_results_present(self) -> None:
        raw = (FIXTURES_DIR / "web_double_encoded.sse").read_bytes()
        events = list(parse_sse_bytes(raw))
        second = decode_web_event(events[1])
        assert second is not None
        urls = [wr.url for wr in second.web_results]
        assert "https://en.wikipedia.org/wiki/Paris" in urls


# ---------------------------------------------------------------------------
# parse_web_stream — sync
# ---------------------------------------------------------------------------


class TestParseWebStream:
    def _events_from_fixture(self, name: str = "web_double_encoded.sse") -> list[SSEEvent]:
        raw = (FIXTURES_DIR / name).read_bytes()
        return list(parse_sse_bytes(raw))

    def test_yields_two_web_events(self) -> None:
        raw_events = self._events_from_fixture()
        web_events = list(parse_web_stream(raw_events, stop_on_done=False))
        assert len(web_events) == 2

    def test_stops_on_final(self) -> None:
        raw_events = self._events_from_fixture()
        web_events = list(parse_web_stream(raw_events, stop_on_done=True))
        # Should stop after the 2nd event (final=True)
        assert len(web_events) == 2
        assert web_events[-1].final is True

    def test_stops_on_end_sentinel(self) -> None:
        sentinel = SSEEvent(event="__end__")
        events = [
            make_double_encoded({"answer": "hi", "web_results": [], "final": False}),
            sentinel,
            make_double_encoded({"answer": "should not appear", "web_results": []}),
        ]
        result = list(parse_web_stream(events))
        assert len(result) == 1
        assert result[0].answer == "hi"

    def test_skips_none_decodes(self) -> None:
        bad = SSEEvent(data="not json")
        good = make_double_encoded({"answer": "ok", "web_results": []})
        result = list(parse_web_stream([bad, good], stop_on_done=False))
        assert len(result) == 1

    def test_empty_iterable(self) -> None:
        assert list(parse_web_stream([])) == []


# ---------------------------------------------------------------------------
# aparse_web_stream — async
# ---------------------------------------------------------------------------


class TestAparseWebStream:
    @pytest.mark.asyncio
    async def test_yields_events(self) -> None:
        raw = (FIXTURES_DIR / "web_double_encoded.sse").read_bytes()
        raw_events = list(parse_sse_bytes(raw))

        async def _source() -> AsyncIterator[SSEEvent]:
            for e in raw_events:
                yield e

        result = await alist(aparse_web_stream(_source(), stop_on_done=False))
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_stops_on_final_async(self) -> None:
        events = [
            make_double_encoded({"answer": "a", "web_results": [], "final": False}),
            make_double_encoded({"answer": "b", "web_results": [], "final": True}),
            make_double_encoded({"answer": "c", "web_results": [], "final": False}),
        ]

        async def _source() -> AsyncIterator[SSEEvent]:
            for e in events:
                yield e

        result = await alist(aparse_web_stream(_source(), stop_on_done=True))
        assert len(result) == 2
        assert result[-1].answer == "b"

    @pytest.mark.asyncio
    async def test_stops_on_end_sentinel_async(self) -> None:
        events = [
            make_double_encoded({"answer": "x", "web_results": [], "final": False}),
            SSEEvent(event="__end__"),
        ]

        async def _source() -> AsyncIterator[SSEEvent]:
            for e in events:
                yield e

        result = await alist(aparse_web_stream(_source()))
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_empty_async_source(self) -> None:
        async def _empty() -> AsyncIterator[SSEEvent]:
            return
            yield  # make it an async generator

        result = await alist(aparse_web_stream(_empty()))
        assert result == []


# ---------------------------------------------------------------------------
# collect_web_response — aggregation & dedup
# ---------------------------------------------------------------------------


class TestCollectWebResponse:
    def test_returns_final_answer(self) -> None:
        events = [
            make_double_encoded({"answer": "Paris", "web_results": [], "final": False}),
            make_double_encoded(
                {"answer": "Paris is the capital of France.", "web_results": [], "final": True}
            ),
        ]
        answer, _ = collect_web_response(events)
        assert answer == "Paris is the capital of France."

    def test_deduplicates_web_results_by_url(self) -> None:
        wr = {"title": "Wiki", "url": "https://en.wikipedia.org/wiki/Paris"}
        events = [
            make_double_encoded({"answer": "A", "web_results": [wr], "final": False}),
            make_double_encoded({"answer": "B", "web_results": [wr], "final": True}),
        ]
        _, web_results = collect_web_response(events)
        urls = [r.url for r in web_results]
        assert len(urls) == len(set(urls))
        assert len(web_results) == 1

    def test_unions_different_urls(self) -> None:
        wr1 = {"title": "A", "url": "https://a.example.com"}
        wr2 = {"title": "B", "url": "https://b.example.com"}
        events = [
            make_double_encoded({"answer": "x", "web_results": [wr1], "final": False}),
            make_double_encoded({"answer": "y", "web_results": [wr1, wr2], "final": True}),
        ]
        _, web_results = collect_web_response(events)
        assert len(web_results) == 2

    def test_golden_fixture_aggregation(self) -> None:
        raw = (FIXTURES_DIR / "web_double_encoded.sse").read_bytes()
        events = list(parse_sse_bytes(raw))
        answer, web_results = collect_web_response(events)
        assert "France" in answer
        assert len(web_results) >= 1

    def test_empty_events(self) -> None:
        answer, web_results = collect_web_response([])
        assert answer == ""
        assert web_results == []

    def test_all_bad_events(self) -> None:
        events = [SSEEvent(data="bad"), SSEEvent(data="also bad")]
        answer, web_results = collect_web_response(events)
        assert answer == ""
        assert web_results == []

    def test_preserves_first_url_occurrence(self) -> None:
        """First occurrence of a URL wins (not overwritten by later events)."""
        wr_v1 = {"title": "V1 Title", "url": "https://same.example.com", "snippet": "first"}
        wr_v2 = {"title": "V2 Title", "url": "https://same.example.com", "snippet": "second"}
        events = [
            make_double_encoded({"answer": "a", "web_results": [wr_v1], "final": False}),
            make_double_encoded({"answer": "b", "web_results": [wr_v2], "final": True}),
        ]
        _, web_results = collect_web_response(events)
        assert len(web_results) == 1
        assert web_results[0].snippet == "first"


# ---------------------------------------------------------------------------
# Additional coverage for edge paths
# ---------------------------------------------------------------------------


class TestDecodeWebEventEdgePaths:
    def test_text_field_already_dict_not_string(self) -> None:
        """When ``text`` is already a dict (not double-encoded), use it directly."""
        inner_dict = {"answer": "direct", "web_results": []}
        outer = {"text": inner_dict, "final": False}
        result = decode_web_event(make_event(outer))
        assert result is not None
        assert result.answer == "direct"
        # raw_text should be None since text was not a string
        assert result.raw_text is None

    def test_chunks_field_already_dict(self) -> None:
        """When ``chunks`` is a dict, use it directly."""
        inner_dict = {"answer": "chunked", "web_results": []}
        outer = {"chunks": inner_dict, "final": False}
        result = decode_web_event(make_event(outer))
        assert result is not None
        assert result.answer == "chunked"


class TestAparseWebStreamEdge:
    @pytest.mark.asyncio
    async def test_skips_none_decode_async(self) -> None:
        """Ensures the ``continue`` branch in aparse_web_stream is covered."""
        events = [
            SSEEvent(data="not json"),
            make_double_encoded({"answer": "ok", "web_results": [], "final": True}),
        ]

        async def _source() -> AsyncIterator[SSEEvent]:
            for e in events:
                yield e

        result = await alist(aparse_web_stream(_source(), stop_on_done=False))
        assert len(result) == 1
        assert result[0].answer == "ok"
