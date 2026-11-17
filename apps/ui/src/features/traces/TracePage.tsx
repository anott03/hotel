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
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <Button variant="ghost" onClick={() => navigate({ page: "traces" })}>
          <ArrowLeftIcon />
          Traces
        </Button>
        <span className="font-mono text-sm text-zinc-500">{props.traceId}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <Result
          result={result}
          onFailure={() => (
            <p className="p-4 text-sm text-zinc-500">Trace not found in the retention window.</p>
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
        className="overflow-auto border-r border-zinc-800"
      >
        {rows.map((row) => (
          <Radio.Root
            key={row.span.spanId}
            value={row.span.spanId}
            nativeButton
            render={<button type="button" />}
            className="flex w-full items-center gap-2 border-b border-zinc-900 px-4 py-1 text-left text-xs outline-none hover:bg-zinc-900 focus-visible:bg-zinc-900 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-sky-500 data-checked:bg-zinc-800"
          >
            <div className="w-2/5 truncate" style={{ paddingLeft: `${row.depth * 12}px` }}>
              <span className="text-violet-300">{row.span.serviceName}</span>{" "}
              <span className="text-zinc-300">{row.span.name}</span>
            </div>
            <div className="relative h-3 flex-1">
              <div
                className={`absolute h-3 rounded-sm ${row.span.statusCode === 2 ? "bg-red-500" : "bg-sky-600"}`}
                style={{ left: `${row.offsetPct}%`, width: `${row.widthPct}%` }}
              />
            </div>
            <span className="w-16 text-right font-mono text-zinc-500">
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
        <h2 className="text-base font-medium">{span.name}</h2>
        <p className="text-zinc-400">
          {span.serviceName} · {SPAN_KINDS[span.kind] ?? span.kind} ·{" "}
          {formatDuration(span.durationMs)}
        </p>
        <p className="font-mono text-xs text-zinc-500">{formatTimestamp(span.startTime)}</p>
        {span.statusCode === 2 && (
          <p className="mt-1 text-red-400">Error: {span.statusMessage || "(no message)"}</p>
        )}
      </div>
      <Section title="Attributes" value={span.attributes} />
      <Section title="Resource" value={span.resourceAttributes} />
      {span.events.length > 0 && <Section title="Events" value={span.events} />}
      {props.logs.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs tracking-wide text-zinc-500 uppercase">Logs</h3>
          <ul className="space-y-1 font-mono text-xs">
            {props.logs.map((log) => (
              <li key={log.id}>
                <span className="text-zinc-500">{formatTimestamp(log.time)}</span> {log.body}
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
      <h3 className="mb-1 text-xs tracking-wide text-zinc-500 uppercase">{props.title}</h3>
      <pre className="rounded bg-zinc-900 p-2 text-xs whitespace-pre-wrap text-zinc-300">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}
