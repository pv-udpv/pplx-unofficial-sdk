# pplx-sse-core

Transport-agnostic SSE (Server-Sent Events) parsing and streaming toolkit for
OpenAI-compatible and Perplexity-style chat/web streams.

## Install

```bash
pip install pplx-sse-core
```

## Quick start

### Web stream

```python
from pplx_sse_core import iter_sse, parse_web_stream

# raw_chunks is any iterable of bytes/str from your HTTP client
events = iter_sse(raw_chunks)
for web_event in parse_web_stream(events):
    print(web_event.answer)
```

### Chat stream

```python
from pplx_sse_core import iter_sse, parse_chat_stream

events = iter_sse(raw_chunks)
content = ""
for delta in parse_chat_stream(events):
    content += delta.content

print(content)  # full assistant message
```

### Buffer (handles split-boundary chunks)

```python
from pplx_sse_core import SSEBuffer

buf = SSEBuffer()
for chunk in raw_chunks:
    for event in buf.feed(chunk):
        print(event)
```

## Design

`pplx-sse-core` is **transport-agnostic**: it accepts any `Iterable[str | bytes]` or
`AsyncIterable[str | bytes]`, and never imports `httpx`, `aiohttp`, or `curl_cffi`.
You wire up your preferred HTTP client and pass the byte stream in.

## Migration

See the [SSE Core Migration Plan](/home/user/workspace/portfolio_review/SSE_CORE_MIGRATION_PLAN.md)
for details on integrating this package into `pv-udpv/pplx-unofficial-sdk`.
