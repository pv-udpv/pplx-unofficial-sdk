"""Tests for chat_stream.py — decode_chat_event and parse_chat_stream."""

from __future__ import annotations

import json
from pathlib import Path

from pplx_sse_core._models import ChatDelta, SSEEvent, StreamTermination
from pplx_sse_core.chat_stream import decode_chat_event, parse_chat_stream

FIXTURES = Path(__file__).parent / "fixtures"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _event(data: str, event_type: str | None = None) -> SSEEvent:
    return SSEEvent(data=data, event=event_type)


def _chunk(
    content: str | None = None,
    role: str | None = None,
    finish_reason: str | None = None,
    model: str = "gpt-4o",
    chunk_id: str = "chatcmpl-test",
) -> SSEEvent:
    delta: dict[str, str] = {}
    if role is not None:
        delta["role"] = role
    if content is not None:
        delta["content"] = content
    payload = {
        "id": chunk_id,
        "model": model,
        "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
    }
    return _event(json.dumps(payload))


# ---------------------------------------------------------------------------
# decode_chat_event — [DONE] sentinel
# ---------------------------------------------------------------------------


class TestDoneSentinel:
    def test_done_returns_stream_termination(self) -> None:
        event = _event("[DONE]")
        result = decode_chat_event(event)
        assert isinstance(result, StreamTermination)
        assert result.reason == "done"

    def test_done_with_surrounding_whitespace(self) -> None:
        event = _event("  [DONE]  ")
        result = decode_chat_event(event)
        assert isinstance(result, StreamTermination)
        assert result.reason == "done"


# ---------------------------------------------------------------------------
# decode_chat_event — normal chunks
# ---------------------------------------------------------------------------


class TestDecodeChatEvent:
    def test_content_chunk(self) -> None:
        event = _chunk(content="Hello")
        result = decode_chat_event(event)
        assert isinstance(result, ChatDelta)
        assert result.content == "Hello"
        assert result.model == "gpt-4o"

    def test_role_chunk(self) -> None:
        event = _chunk(role="assistant", content="")
        result = decode_chat_event(event)
        assert isinstance(result, ChatDelta)
        assert result.role == "assistant"
        assert result.content == ""

    def test_finish_reason_chunk(self) -> None:
        event = _chunk(finish_reason="stop")
        result = decode_chat_event(event)
        assert isinstance(result, ChatDelta)
        assert result.finish_reason == "stop"

    def test_model_is_captured(self) -> None:
        event = _chunk(content="hi", model="claude-3-opus")
        result = decode_chat_event(event)
        assert isinstance(result, ChatDelta)
        assert result.model == "claude-3-opus"

    def test_empty_data_returns_none(self) -> None:
        result = decode_chat_event(_event(""))
        assert result is None

    def test_whitespace_only_data_returns_none(self) -> None:
        result = decode_chat_event(_event("   "))
        assert result is None


# ---------------------------------------------------------------------------
# decode_chat_event — malformed / edge-case JSON
# ---------------------------------------------------------------------------


class TestMalformedJSON:
    def test_invalid_json_returns_none(self) -> None:
        result = decode_chat_event(_event("{not valid json"))
        assert result is None

    def test_json_without_choices_returns_none(self) -> None:
        result = decode_chat_event(_event(json.dumps({"id": "x", "model": "gpt-4o"})))
        assert result is None

    def test_empty_choices_list_returns_none(self) -> None:
        payload = {"id": "x", "model": "gpt-4o", "choices": []}
        result = decode_chat_event(_event(json.dumps(payload)))
        assert result is None

    def test_choices_not_list_returns_none(self) -> None:
        payload = {"id": "x", "model": "gpt-4o", "choices": "bad"}
        result = decode_chat_event(_event(json.dumps(payload)))
        assert result is None

    def test_delta_not_dict_returns_none(self) -> None:
        payload = {"id": "x", "model": "gpt-4o", "choices": [{"index": 0, "delta": "oops"}]}
        result = decode_chat_event(_event(json.dumps(payload)))
        assert result is None

    def test_first_choice_not_dict_returns_none(self) -> None:
        payload = {"id": "x", "model": "gpt-4o", "choices": ["bad"]}
        result = decode_chat_event(_event(json.dumps(payload)))
        assert result is None

    def test_model_not_str_is_none(self) -> None:
        payload = {
            "id": "x",
            "model": 42,
            "choices": [{"index": 0, "delta": {"content": "hi"}}],
        }
        result = decode_chat_event(_event(json.dumps(payload)))
        assert isinstance(result, ChatDelta)
        assert result.model is None
        assert result.content == "hi"

    def test_non_str_content_becomes_empty(self) -> None:
        payload = {
            "id": "x",
            "model": "gpt-4o",
            "choices": [{"index": 0, "delta": {"content": 99}}],
        }
        result = decode_chat_event(_event(json.dumps(payload)))
        assert isinstance(result, ChatDelta)
        assert result.content == ""


# ---------------------------------------------------------------------------
# parse_chat_stream — filtering and early-stop
# ---------------------------------------------------------------------------


class TestParseChatStream:
    def test_yields_only_chat_deltas(self) -> None:
        events = [
            _chunk(role="assistant", content=""),
            _chunk(content="Hi"),
            _chunk(content="!"),
            _event("[DONE]"),
        ]
        deltas = list(parse_chat_stream(events))
        assert all(isinstance(d, ChatDelta) for d in deltas)
        assert len(deltas) == 3

    def test_stops_at_done_sentinel(self) -> None:
        events = [
            _chunk(content="A"),
            _event("[DONE]"),
            _chunk(content="B"),  # must NOT appear in output
        ]
        deltas = list(parse_chat_stream(events))
        contents = [d.content for d in deltas]
        assert "B" not in contents
        assert "A" in contents

    def test_skips_malformed_events(self) -> None:
        events = [
            _event("{bad json}"),
            _chunk(content="ok"),
            _event("[DONE]"),
        ]
        deltas = list(parse_chat_stream(events))
        assert len(deltas) == 1
        assert deltas[0].content == "ok"

    def test_empty_stream(self) -> None:
        assert list(parse_chat_stream([])) == []

    def test_stream_without_done(self) -> None:
        events = [_chunk(content="a"), _chunk(content="b")]
        deltas = list(parse_chat_stream(events))
        assert len(deltas) == 2

    def test_multi_chunk_concatenation(self) -> None:
        events = [
            _chunk(role="assistant", content=""),
            _chunk(content="Hello"),
            _chunk(content=" "),
            _chunk(content="world"),
            _chunk(content="!"),
            _chunk(finish_reason="stop"),
            _event("[DONE]"),
        ]
        deltas = list(parse_chat_stream(events))
        full_text = "".join(d.content for d in deltas)
        assert full_text == "Hello world!"

    def test_finish_reason_delta_included(self) -> None:
        events = [
            _chunk(finish_reason="stop"),
            _event("[DONE]"),
        ]
        deltas = list(parse_chat_stream(events))
        assert len(deltas) == 1
        assert deltas[0].finish_reason == "stop"


# ---------------------------------------------------------------------------
# Golden fixture: chat_completion.sse
# ---------------------------------------------------------------------------


class TestGoldenFixture:
    def _load_events(self) -> list[SSEEvent]:
        sse_path = FIXTURES / "chat_completion.sse"
        lines = sse_path.read_text(encoding="utf-8").splitlines()
        events: list[SSEEvent] = []
        for line in lines:
            if line.startswith("data: "):
                data = line[len("data: ") :]
                events.append(SSEEvent(data=data))
        return events

    def test_fixture_file_exists(self) -> None:
        assert (FIXTURES / "chat_completion.sse").exists()

    def test_fixture_produces_correct_content(self) -> None:
        events = self._load_events()
        deltas = list(parse_chat_stream(events))
        full_text = "".join(d.content for d in deltas)
        assert "Hello" in full_text
        assert "world" in full_text

    def test_fixture_terminates_at_done(self) -> None:
        events = self._load_events()
        # Last parsed data line is [DONE]; verify StreamTermination returned
        done_events = [e for e in events if e.data.strip() == "[DONE]"]
        assert len(done_events) == 1
        assert isinstance(decode_chat_event(done_events[0]), StreamTermination)

    def test_fixture_role_chunk_present(self) -> None:
        events = self._load_events()
        deltas = list(parse_chat_stream(events))
        roles = [d.role for d in deltas if d.role is not None]
        assert "assistant" in roles

    def test_fixture_finish_reason_present(self) -> None:
        events = self._load_events()
        deltas = list(parse_chat_stream(events))
        finish_reasons = [d.finish_reason for d in deltas if d.finish_reason is not None]
        assert "stop" in finish_reasons

    def test_fixture_model_captured(self) -> None:
        events = self._load_events()
        deltas = list(parse_chat_stream(events))
        models = {d.model for d in deltas if d.model is not None}
        assert len(models) >= 1
