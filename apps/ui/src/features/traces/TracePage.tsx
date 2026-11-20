import { useAtomValue } from "@effect/atom-react";
import type { Attributes, LogEntry, Span, SpanEvent, TraceDetail } from "@hotel/api";
import * as Atom from "effect/reactivity/Atom";
import { Fragment, useMemo, useState } from "react";
import { Result } from "../../components/Result.tsx";
import { ArrowLeftIcon, Button } from "../../components/ui/index.ts";
import { navigate } from "../../lib/route.ts";
import { formatDuration, formatTimestamp } from "../../lib/time.ts";
import { toneFor } from "../../lib/tone.ts";
import { TelemetryClient } from "../../rpc/client.ts";
import { buildWaterfall } from "./waterfall.ts";

const traceAtom = Atom.family((traceId: string) =>
  TelemetryClient.query("getTrace", { traceId }, { timeToLive: "5 minutes" }),
);

const SPAN_KINDS = ["unspecified", "internal", "server", "client", "producer", "consumer"] as const;

export function TracePage(props: { readonly traceId: string }) {
  const result = useAtomValue(traceAtom(props.traceId));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3">
        <Button variant="ghost" onClick={() => navigate({ page: "traces" })}>
          <ArrowLeftIcon />
          Traces
        </Button>
        <span className="font-mono text-sm text-ink-faint">{props.traceId}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <Result
          result={result}
          onFailure={() => (
            <p className="p-4 text-sm text-ink-faint">Trace not found in the retention window.</p>
          )}
        >
          {(trace) => <TraceView trace={trace} />}
        </Result>
      </div>
    </div>
  );
}

function TraceView(props: { readonly trace: TraceDetail }) {
  const rows = useMemo(() => buildWaterfall(props.trace.spans), [props.trace.spans]);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-[minmax(0,max-content)_max-content_minmax(8rem,1fr)] gap-x-3">
      {rows.map((row) => {
        const { span } = row;
        const isExpanded = expanded === span.spanId;
        const detailId = `span-detail-${span.spanId}`;
        return (
          <Fragment key={span.spanId}>
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? detailId : undefined}
              onClick={() => setExpanded(isExpanded ? null : span.spanId)}
              className="col-span-3 grid grid-cols-subgrid items-center border-b border-line/30 px-4 py-1 text-left text-xs outline-none hover:bg-raised focus-visible:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent aria-expanded:bg-highlight"
            >
              <div
                className="flex max-w-96 min-w-0 gap-1 whitespace-nowrap"
                style={{ paddingLeft: `${row.depth * 12}px` }}
              >
                <span
                  className={`max-w-full shrink-0 truncate font-medium ${toneFor(span.name).text}`}
                >
                  {span.name}
                </span>
                <span className="min-w-0 truncate text-ink-faint">{span.serviceName}</span>
              </div>
              <span className="font-mono text-ink-faint">{formatDuration(span.durationMs)}</span>
              <div className="relative h-3">
                <div
                  className={`absolute h-3 rounded-full ${span.statusCode === 2 ? "bg-cherry" : toneFor(span.name).fill}`}
                  style={{ left: `${row.offsetPct}%`, width: `${row.widthPct}%` }}
                />
              </div>
            </button>
            {isExpanded && (
              <div
                id={detailId}
                className="col-span-3 min-w-0 border-b border-line/30 bg-raised/60 px-4 py-3"
              >
                <SpanDetail
                  span={span}
                  logs={props.trace.logs.filter((log) => log.spanId === span.spanId)}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function SpanDetail(props: { readonly span: Span; readonly logs: ReadonlyArray<LogEntry> }) {
  const { span } = props;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="text-lg font-semibold">{span.name}</h2>
        <p className="text-ink-soft">
          {span.serviceName} · {SPAN_KINDS[span.kind] ?? span.kind} ·{" "}
          {formatDuration(span.durationMs)}
        </p>
        <p className="font-mono text-xs text-ink-faint">{formatTimestamp(span.startTime)}</p>
        {span.statusCode === 2 && (
          <p className="mt-1 text-cherry">Error: {span.statusMessage || "(no message)"}</p>
        )}
      </div>
      <Section title="Attributes" value={span.attributes} />
      <Section title="Resource" value={span.resourceAttributes} />
      {span.events.length > 0 && <Section title="Events" value={span.events} />}
      {props.logs.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-ink-soft">Logs</h3>
          <ul className="space-y-1 font-mono text-xs">
            {props.logs.map((log) => (
              <li key={log.id}>
                <span className="text-ink-faint">{formatTimestamp(log.time)}</span> {log.body}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section(props: {
  readonly title: string;
  readonly value: Attributes | ReadonlyArray<SpanEvent>;
}) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-ink-soft">{props.title}</h3>
      <pre className="rounded-2xl bg-canvas px-4 py-3 text-xs wrap-anywhere whitespace-pre-wrap text-ink-soft">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}
