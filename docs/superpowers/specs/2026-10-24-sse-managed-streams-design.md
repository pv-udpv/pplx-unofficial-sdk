# SSE managed streams design

**Status:** Recommended follow-on design  
**Issue:** [#4 — Implement SSE Streaming Client with JSON Patch support](https://github.com/pv-udpv/pplx-unofficial-sdk/issues/4)  
**Baseline:** PR #5 merged on 2026-09-22; this design covers the remaining managed-stream gaps, not a replacement for that work.

## Purpose and confirmed gaps

The existing client already provides the core SSE transport, JSON Patch handling,
follow-up and reconnect request helpers, `AbortSignal` cancellation, immutable
entry snapshots, documentation, and mocked protocol tests. The remaining gaps
are the orchestration and typed public surface around those primitives:

| Area | Existing state | Follow-on requirement |
| --- | --- | --- |
| Reconnect orchestration | `PplxClient.reconnect()` makes one reconnect request; it does not retry a broken stream. | Automatically resume eligible transport interruptions until completion or caller cancellation. |
| Request admission | No shared local SSE rate/concurrency gate is present. | Enforce 20 requests per sliding minute, 120 per sliding hour, and at most 50 active SSE requests per client. |
| Stream events | `StreamEvents` is currently `any`; callers consume `AsyncGenerator<Entry>`. | Add a typed event stream without removing or changing the raw generator API. |
| Resume metadata | `Entry` has no typed cursor or reconnectability fields. | Type the server-provided cursor and reconnectability used by managed resume. |

These findings are confirmed by `src/pplx-client.ts` and
`docs/sse-streaming.md`. The existing mocked tests do not establish live API
compatibility or authentication behavior, and this design makes no such claim.

## Goals and non-goals

### Goals

- Add opt-in managed search, follow-up, and reconnect streams over the existing
  `PplxClient`.
- Preserve the existing raw async-generator entry points and immutable entry
  snapshots.
- Enforce shared per-client request and active-stream limits for every SSE
  request, including raw calls, managed calls, and each reconnect attempt.
- Resume only recoverable transport interruptions when the latest entry
  explicitly permits reconnection.
- Expose typed lifecycle events and preserve caller cancellation.

### Non-goals

- Replace or redesign the SSE parser, JSON Patch semantics, or existing raw
  request shapes.
- Add retries for HTTP responses, API-reported errors, parse/protocol failures,
  timeouts, or caller cancellation.
- Add global/shared state, a persistent store, cross-client coordination, or
  configurable rate limits.
- Establish compatibility with the live Perplexity service without separate
  authenticated integration evidence.
- Change the current per-request timeout policy.

## Recommended architecture and API

Keep `PplxClient.search()`, `followUp()`, and `reconnect()` as
`AsyncGenerator<Entry>` APIs. Add opt-in managed counterparts on the same
client:

```typescript
for await (const event of client.managedSearch(query, options)) {
  if (event.type === "progress") render(event.entry);
}

for await (const event of client.managedFollowUp(query, contextUuid, options)) {
  // Consume typed lifecycle events.
}

for await (const event of client.managedReconnect(entryUuid, query, options)) {
  // Consume typed lifecycle events.
}
```

The proposed method names are `managedSearch`, `managedFollowUp`, and
`managedReconnect`; each returns `AsyncGenerator<StreamEvents>`. They use the
same client instance and options as their raw equivalents. `StreamEvents`
becomes a discriminated union:

```typescript
type StreamEvents =
  | { type: "created"; entry: Entry }
  | { type: "progress"; entry: Entry }
  | { type: "completed"; entry: Entry }
  | { type: "error"; error: PplxError; entry?: Entry }
  | { type: "aborted"; entry?: Entry };
```

`created` carries the first entry snapshot. Later non-final snapshots produce
`progress`; finalization produces `completed` with the final snapshot. A stream
that completes on its first snapshot emits `created`, then `completed`. A
terminal failure emits one `error` event and then closes the managed iterator;
it does not also throw that failure from the iterator. Cancellation through the
provided `AbortSignal` emits one `aborted` event with the latest snapshot, if
one exists, and then closes. Closing the iterator early remains local disposal:
it cancels the underlying body and does not synthesize a terminal event.

Add optional typed fields to `Entry`:

```typescript
cursor?: string;
reconnectable?: boolean;
```

These fields are populated only from server data. The managed layer treats
missing `reconnectable` as false and does not infer resumability from status,
cursor presence, or client state.

One admission controller belongs to each `PplxClient` instance. The existing
private SSE request path acquires admission before issuing `fetch`, so raw and
managed APIs share the same in-memory gate. The managed layer owns retry
orchestration and event translation; it does not introduce a second transport
or mutate yielded snapshots. No process-wide or module-global state is used.

## Request admission and rate-limit semantics

Every actual outbound SSE POST consumes one request from both sliding windows:

- At most 20 requests in the preceding 60 seconds.
- At most 120 requests in the preceding 3,600 seconds.
- At most 50 concurrently active SSE HTTP requests for one client.

Count each network attempt once when it is dispatched. A retry is a new
outbound request and consumes another place in both windows. Waiting to be
admitted does not consume a request. Search, follow-up, reconnect, and raw
generator requests all use the same gate; non-SSE REST requests are outside
this limit.

The gate waits until **all** admission conditions are satisfied rather than
rejecting a caller. Rate-window timestamps use a monotonic clock and expire at
the exact end of their respective rolling windows. Admission is FIFO to avoid
starving callers queued behind the same client. An active slot is held only
while an HTTP request and its response body are active; it is released on
normal completion, failure, cancellation, or timeout. Backoff and admission
waiting between attempts do not hold an active slot.

Admission waits observe the request's `AbortSignal`. Aborting while queued
removes that waiter without counting a request or taking an active slot. The
existing configured per-request timeout begins once admission succeeds and
continues to cover response headers and body streaming; time spent queued is
not charged against it. Each retry receives the same per-request timeout.

## Reconnect and retry behavior

Managed methods start with their corresponding existing request semantics.
After receiving entries, the manager retains the latest immutable snapshot,
its `backend_uuid`, and its latest cursor. Use the initial cursor supplied in
options until the server supplies one; afterward, retain the latest
server-provided cursor if a later entry omits it. The original query is retained
for every retry.

On a known recoverable transport interruption, reconnect only if the latest
entry has `reconnectable === true` and a usable backend entry UUID. Resume via
the existing reconnect endpoint, passing the original query, latest entry UUID,
and latest cursor. For a managed follow-up, the first request retains its
`context_uuid`; subsequent resumed requests use the latest entry's reconnect
identity and cursor. Each retry goes back through the same admission gate.
Repeated recoverable interruptions continue with capped exponential
full-jitter backoff until the stream completes or the caller cancels. Use a
500 ms ceiling for the first retry, doubling the ceiling after each subsequent
interruption up to 30 seconds; choose each actual delay uniformly from zero
through the current ceiling.

An orderly end of the response body and the existing `[DONE]` marker retain
the current raw-client completion behavior; neither is treated as an
interruption. An EOF without `[DONE]` also retains the existing behavior of
finalizing the last entry; retry only when the transport reports a recoverable
failure, not merely because the response ended. Do not reconnect when no entry
has yet established `reconnectable === true`, when the latest entry is not
reconnectable, or when there is no valid resume UUID.

Only known network-disconnect failures during fetch or body reading are
recoverable. In the existing error model, an offline network failure reported
as `ApiClientsError` is eligible only when it has status code `0` and
`isOffline === true`; body-reader failures are eligible only when the transport
can identify and preserve them as network disconnects. Other `ApiClientsError`
instances are terminal. Explicit non-2xx HTTP responses, server/API error
events, null or malformed protocol bodies, `ParseError`, JSON Patch failures,
request timeouts, unknown failures, and caller aborts are terminal and are
never retried. Terminal failures become the typed `error` event described
above. This narrow classification prevents the retry loop from converting
invalid responses or authorization failures into repeated requests.

## Data flow and lifecycle

1. A caller chooses a raw or managed method. The raw method continues yielding
   `Entry`; a managed method establishes lifecycle state and retains the
   original query and request kind.
2. The shared per-client gate waits, cancellation-aware, for a rate slot and
   one of the 50 active-request slots.
3. The existing SSE transport sends one request and yields independent entry
   snapshots. The gate releases its active slot when that request's body ends
   or the request terminates.
4. Raw callers receive the snapshots unchanged. Managed callers translate
   snapshots into `created`, `progress`, or `completed` events and retain the
   latest snapshot for a possible resume.
5. On a qualifying interruption, managed callers wait for backoff, then repeat
   from step 2 using the latest resume metadata. Otherwise they receive the
   terminal `error` or `aborted` event, or finish normally.

All managed event entry payloads are snapshots. Consumers can retain or modify
their own copies without changing the manager's latest resume state or another
event's entry.

## Error and cancellation contract

- Preserve existing `PplxError`, `FetcherError`, `ApiClientsError`, and
  `ParseError` identities in the managed `error` event payload.
- Convert unexpected non-`PplxError` failures into the repository's standard
  `FetcherError` form before emitting the terminal event.
- An input signal aborts queued admission, active fetch/body reading, or retry
  backoff. Emit exactly one `aborted` event and do not emit `error` afterward.
- A request timeout remains a terminal timeout failure and preserves the
  existing timeout message/behavior.
- Consumer iterator closure cancels active transport and releases admission
  resources, without creating a new error or aborted event.
- Always remove abort listeners, timers, and queue entries and release active
  slots on every exit path.

## Compatibility and exports

Export the typed event union and managed API types from `src/index.ts`, while
keeping existing exports and method signatures source-compatible. Existing raw
methods become subject to the shared per-client admission limits, so callers
may now wait under load instead of sending unlimited simultaneous requests.
They continue to yield the same `Entry` snapshots and retain existing timeout,
completion, and cancellation behavior.

No new runtime dependency is required. The implementation should follow the
project's TypeScript strictness and existing mocked `node:test` test setup.

## Verification plan

Add deterministic mocked tests for:

- 20-per-minute and 120-per-hour sliding-window admission, including boundary
  expiry and one-count-per-outbound-attempt behavior.
- A maximum of 50 active request bodies, waiting callers, FIFO admission, and
  slot release on completion, failure, timeout, and cancellation.
- Shared admission across raw searches, follow-ups, managed requests, and
  retries on one client, with independent gates for separate clients.
- Reconnect only for a recoverable interruption after a latest entry marked
  reconnectable; preserve original query, latest entry UUID, and latest cursor
  across repeated interruptions.
- No retry for a non-reconnectable or absent latest entry, non-2xx HTTP/API
  failures, parse/protocol failures, timeouts, or unknown errors.
- Capped jitter bounds and cancellation during backoff.
- Typed event order and payload snapshots for first-entry completion,
  incremental progress, successful completion, terminal error, and abort.
- Cancellation during rate/concurrency admission and during active body
  streaming, including exactly-once cleanup and event emission.
- Existing raw generator behavior and SSE/JSON Patch tests as regression
  coverage.

Use mocked fetch streams and controlled clock/timer behavior; do not make live
network requests for these checks. Run the relevant existing build, typecheck,
and test commands, including `npm run build`, `npm run typecheck`, and
`npm test`. Update `docs/sse-streaming.md` with the managed API, admission
limits, retry rules, event semantics, and cancellation behavior. Document that
mocked protocol tests do not prove live API compatibility.

## Implementation scope

The follow-on implementation is limited to:

- `src/pplx-client.ts`: per-client admission, typed metadata/events, managed
  orchestration, and retry classification.
- `src/index.ts`: public type exports.
- `scripts/sse-client.test.mjs` or focused tests following the current test
  conventions.
- `docs/sse-streaming.md`: user-facing managed-stream documentation.

No issue closure, PR creation, CI workflow changes, global state, or unrelated
refactoring is part of the design.
