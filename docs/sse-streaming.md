# SSE streaming

The client uses the existing POST `/rest/sse/perplexity_ask` transport. Follow-up
requests set `context_uuid`; reconnect requests use
`/rest/sse/perplexity_ask/reconnect/<encoded entry UUID>`. The second argument to
`reconnect` is the original query. Pass a server-provided cursor in the options.

```typescript
const client = createPplxClient({ headers: authorizedHeaders });
for await (const entry of client.followUp('Explain more', contextUuid)) {
  console.log(entry.blocks);
}
for await (const entry of client.reconnect(entryUuid, originalQuery, { cursor })) {
  console.log(entry.blocks);
}
```

Each yielded entry is an independent snapshot. Partial events preserve existing
fields, and `diff_block: { field: 'blocks', patches: [...] }` applies JSON Patch
to the selected field. Nested fields use dot-separated names. A diff before an
initial entry or an invalid patch raises `ParseError`; server and HTTP failures
retain the existing typed errors. `[DONE]` and an orderly end of the body finalize
the last entry, preserving the client's existing end-of-stream behavior.

`applyJsonPatch(document, patches)` supports add, remove, replace, move, copy and
test; JSON Pointer escapes, root paths and array insertion/appending are supported.
It returns a cloned result and leaves its input unchanged if an operation fails.
Prototype-related path segments are rejected rather than traversed.

Pass `signal` in request options to cancel a search or reconnect. Client timeout
covers headers and body streaming. Leaving a `for await` loop cancels its body
reader without aborting the caller's signal.

Offline checks: `npm run build && node --test scripts/sse-client.test.mjs`.
These mocked protocol tests do not establish current live API compatibility or
authentication requirements.
