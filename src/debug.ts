/** Observability metadata returned by the server; never synthesized by the SDK. */
export interface MessageDebugData {
  dd_trace_id?: string;
  dd_request_id?: { request_id: string; datetime: string };
}

export interface PerformanceEvent {
  metricName: string;
  /** Duration in milliseconds. */
  duration: number;
}

export interface PerformanceTimer {
  getEvents(): PerformanceEvent[];
}

/** Receives allowlisted metadata only, never request bodies, headers, or tokens. */
export interface DebugLogSink {
  debug: (message: string, metadata: DebugTraceLinks) => void;
}

export interface DebugTraceLinks {
  traceUrl?: string;
  logsUrl?: string;
}

const WINDOW_MS = 20 * 60 * 1000;

/** Build links only from valid server metadata. Invalid or missing fields are ignored. */
export function getDebugTraceLinks(data: unknown): DebugTraceLinks {
  const links: DebugTraceLinks = {};
  if (!data || typeof data !== "object") return links;
  const metadata = data as MessageDebugData;
  if (typeof metadata.dd_trace_id === "string" && /^[a-fA-F0-9]+$/.test(metadata.dd_trace_id)) {
    links.traceUrl = `https://app.datadoghq.com/apm/trace/${metadata.dd_trace_id}`;
  }
  const request = metadata.dd_request_id;
  if (request && typeof request.request_id === "string" && request.request_id.length > 0 && typeof request.datetime === "string") {
    const timestamp = Date.parse(request.datetime);
    if (Number.isFinite(timestamp)) {
      const url = new URL("https://app.datadoghq.com/logs");
      // Escape the Datadog query literal before URL encoding its query parameter.
      const id = request.request_id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      url.searchParams.set("query", `@request_id:"${id}"`);
      url.searchParams.set("from_ts", String(timestamp - WINDOW_MS));
      url.searchParams.set("to_ts", String(timestamp + WINDOW_MS));
      url.searchParams.set("live", "false");
      links.logsUrl = url.toString();
    }
  }
  return links;
}

/** One instance per stream request. Disabled mode never calls the injected sink. */
export class DebugLogger {
  constructor(
    private readonly enabled: boolean,
    private readonly sink: DebugLogSink = { debug: () => {} },
  ) {}

  logTrace(entry: { debug_data?: MessageDebugData }): void {
    if (!this.enabled) return;
    const links = getDebugTraceLinks(entry.debug_data);
    if (!links.traceUrl && !links.logsUrl) return;
    // Diagnostics must not interrupt the response stream when a custom sink fails.
    try { this.sink.debug("SSE debug metadata", links); } catch { /* best effort */ }
  }
}

export function formatMetricName(name: string): string {
  const metric = name.split(".").at(-1);
  if (!metric) return name;
  return metric.split("_").map((part) => {
    if (part === "llm" || part === "mhe") return part.toUpperCase();
    if (part === "ms") return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
}

/** Runtime location only; this does not infer account permissions or test mode. */
export function detectEnvironment(): "production" | "localhost" {
  if (typeof window === "undefined") return "production";
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)
    ? "localhost" : "production";
}
