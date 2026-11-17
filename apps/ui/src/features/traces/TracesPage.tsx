import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { TraceSummary } from "@hotel/api";
import * as Atom from "effect/reactivity/Atom";
import { useState } from "react";
import { FilterBar, RangeSelect, ServiceSelect } from "../../components/Filters.tsx";
import { Result } from "../../components/Result.tsx";
import { navigate } from "../../lib/route.ts";
import { formatDuration, formatTimestamp, rangeFor, type RangePresetId } from "../../lib/time.ts";
import { TelemetryClient } from "../../rpc/client.ts";

interface TraceFilters {
  readonly range: RangePresetId;
  readonly service: string;
  readonly minDurationMs: number;
  readonly onlyErrors: boolean;
}

const tracesAtom = Atom.family((key: string) => {
  const filters: TraceFilters = JSON.parse(key);
  return TelemetryClient.query(
    "searchTraces",
    {
      range: rangeFor(filters.range),
      services: filters.service === "" ? [] : [filters.service],
      minDurationMs: filters.minDurationMs > 0 ? filters.minDurationMs : undefined,
      onlyErrors: filters.onlyErrors,
      limit: 100,
    },
    { timeToLive: "30 seconds" },
  );
});

export function TracesPage() {
  const [filters, setFilters] = useState<TraceFilters>({
    range: "1h",
    service: "",
    minDurationMs: 0,
    onlyErrors: false,
  });
  const atom = tracesAtom(JSON.stringify(filters));
  const result = useAtomValue(atom);
  const refresh = useAtomRefresh(atom);

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <RangeSelect
          value={filters.range}
          onChange={(range) => setFilters({ ...filters, range })}
        />
        <ServiceSelect
          range={filters.range}
          value={filters.service}
          onChange={(service) => setFilters({ ...filters, service })}
        />
        <label className="flex items-center gap-1 text-sm text-zinc-400">
          Min duration (ms)
          <input
            type="number"
            min={0}
            className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
            value={filters.minDurationMs}
            onChange={(event) =>
              setFilters({ ...filters, minDurationMs: Number(event.target.value) })
            }
          />
        </label>
        <label className="flex items-center gap-1 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={filters.onlyErrors}
            onChange={(event) => setFilters({ ...filters, onlyErrors: event.target.checked })}
          />
          Errors only
        </label>
        <button
          className="ml-auto rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
          onClick={refresh}
        >
          Refresh
        </button>
      </FilterBar>
      <div className="flex-1 overflow-auto">
        <Result result={result}>{(traces) => <TraceTable traces={traces} />}</Result>
      </div>
    </div>
  );
}

function TraceTable(props: { readonly traces: ReadonlyArray<TraceSummary> }) {
  if (props.traces.length === 0)
    return <p className="p-4 text-sm text-zinc-500">No traces in this range.</p>;
  const maxDuration = Math.max(...props.traces.map((trace) => trace.durationMs), 1);
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-zinc-950 text-left text-xs text-zinc-500">
        <tr>
          <th className="px-4 py-2 font-normal">Start</th>
          <th className="px-2 py-2 font-normal">Service</th>
          <th className="px-2 py-2 font-normal">Root span</th>
          <th className="px-2 py-2 font-normal">Spans</th>
          <th className="w-1/4 px-4 py-2 font-normal">Duration</th>
        </tr>
      </thead>
      <tbody>
        {props.traces.map((trace) => (
          <tr
            key={trace.traceId}
            className="cursor-pointer border-b border-zinc-900 hover:bg-zinc-900"
            onClick={() => navigate({ page: "trace", traceId: trace.traceId })}
          >
            <td className="px-4 py-1.5 font-mono text-xs whitespace-nowrap text-zinc-500">
              {formatTimestamp(trace.startTime)}
            </td>
            <td className="px-2 py-1.5 whitespace-nowrap text-violet-300">
              {trace.rootServiceName}
            </td>
            <td className="px-2 py-1.5">
              {trace.rootSpanName}
              {trace.errorCount > 0 && (
                <span className="ml-2 rounded bg-red-950 px-1.5 text-xs text-red-300">
                  {trace.errorCount} error{trace.errorCount === 1 ? "" : "s"}
                </span>
              )}
            </td>
            <td className="px-2 py-1.5 text-zinc-400">{trace.spanCount}</td>
            <td className="px-4 py-1.5">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded bg-zinc-800">
                  <div
                    className={`h-1.5 rounded ${trace.errorCount > 0 ? "bg-red-500" : "bg-sky-500"}`}
                    style={{ width: `${Math.max((trace.durationMs / maxDuration) * 100, 1)}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-xs text-zinc-400">
                  {formatDuration(trace.durationMs)}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
