import { useAtomValue } from "@effect/atom-react";
import type { Attributes, LogEntry, Span, SpanEvent, TraceDetail } from "@hotel/api";
import * as Atom from "effect/reactivity/Atom";
import { useMemo, useState } from "react";
import { Result } from "../../components/Result.tsx";
import { ArrowLeftIcon, Button } from "../../components/ui/index.ts";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { navigate } from "../../lib/route.ts";
import { formatDuration, formatTimestamp } from "../../lib/time.ts";
import { serviceTone } from "../../lib/tone.ts";
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
  const [selected, setSelected] = useState<string | null>(rows[0]?.span.spanId ?? null);
  const selectedSpan = props.trace.spans.find((span) => span.spanId === selected);
  const spanLogs = props.trace.logs.filter((log) => log.spanId === selected);

  return (
    <div className="grid h-full grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <RadioGroup
        aria-label="Spans"
        value={selected}
        onValueChange={setSelected}
        className="overflow-auto border-r border-line/60"
      >
        {rows.map((row) => (
          <Radio.Root
            key={row.span.spanId}
            value={row.span.spanId}
            nativeButton
            render={<button type="button" />}
            className="flex w-full items-center gap-2 border-b border-line/30 px-4 py-1 text-left text-xs outline-none hover:bg-raised focus-visible:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent data-checked:bg-highlight"
          >
            <div className="w-2/5 truncate" style={{ paddingLeft: `${row.depth * 12}px` }}>
              <span className={`font-medium ${serviceTone(row.span.serviceName).text}`}>
                {row.span.serviceName}
              </span>{" "}
              <span className="text-ink-soft">{row.span.name}</span>
            </div>
            <div className="relative h-3 flex-1">
              <div
                className={`absolute h-3 rounded-full ${row.span.statusCode === 2 ? "bg-cherry" : serviceTone(row.span.serviceName).fill}`}
                style={{ left: `${row.offsetPct}%`, width: `${row.widthPct}%` }}
              />
            </div>
            <span className="w-16 text-right font-mono text-ink-faint">
              {formatDuration(row.span.durationMs)}
            </span>
          </Radio.Root>
        ))}
      </RadioGroup>
      <div className="overflow-auto p-4">
        {selectedSpan !== undefined && <SpanDetail span={selectedSpan} logs={spanLogs} />}
      </div>
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
      <pre className="rounded-2xl bg-raised px-4 py-3 text-xs whitespace-pre-wrap text-ink-soft">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}
