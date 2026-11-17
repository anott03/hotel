import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { TraceSummary } from "@hotel/api";
import * as Atom from "effect/reactivity/Atom";
import { useState } from "react";
import { FilterBar, RangeSelect, RefreshButton, ServiceSelect } from "../../components/Filters.tsx";
import { Result } from "../../components/Result.tsx";
import { ServiceTag } from "../../components/ServiceTag.tsx";
import { Checkbox, NumberField } from "../../components/ui/index.ts";
import { navigate } from "../../lib/route.ts";
import { formatDuration, formatTimestamp, rangeFor, type RangePresetId } from "../../lib/time.ts";
import { serviceTone } from "../../lib/tone.ts";
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
        <NumberField
          label="Min duration (ms)"
          value={filters.minDurationMs}
          min={0}
          step={10}
          onChange={(minDurationMs) => setFilters({ ...filters, minDurationMs })}
        />
        <Checkbox
          label="Errors only"
          checked={filters.onlyErrors}
          onChange={(onlyErrors) => setFilters({ ...filters, onlyErrors })}
        />
        <RefreshButton onClick={refresh} />
      </FilterBar>
      <div className="flex-1 overflow-auto">
        <Result result={result}>{(traces) => <TraceTable traces={traces} />}</Result>
      </div>
    </div>
  );
}

function TraceTable(props: { readonly traces: ReadonlyArray<TraceSummary> }) {
  if (props.traces.length === 0)
    return <p className="p-4 text-sm text-ink-faint">No traces in this range.</p>;
  const maxDuration = Math.max(...props.traces.map((trace) => trace.durationMs), 1);
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 z-1 bg-canvas text-left text-xs text-ink-faint shadow-[inset_0_-1px_0_--alpha(var(--color-line)/60%)]">
        <tr>
          <th className="py-2 pr-3 pl-4 font-normal">Start</th>
          <th className="px-3 py-2 font-normal">Service</th>
          <th className="px-3 py-2 font-normal whitespace-nowrap">Root span</th>
          <th className="px-3 py-2 font-normal">Spans</th>
          <th className="w-full py-2 pr-4 pl-3 font-normal">Duration</th>
        </tr>
      </thead>
      <tbody>
        {props.traces.map((trace) => (
          <tr
            key={trace.traceId}
            className="cursor-pointer border-b border-line/30 hover:bg-raised"
            onClick={() => navigate({ page: "trace", traceId: trace.traceId })}
          >
            <td className="py-1.5 pr-3 pl-4 font-mono text-xs whitespace-nowrap text-ink-faint">
              {formatTimestamp(trace.startTime)}
            </td>
            <td className="px-3 py-1.5">
              <ServiceTag name={trace.rootServiceName} />
            </td>
            <td className="px-3 py-1.5 whitespace-nowrap">
              {trace.rootSpanName}
              {trace.errorCount > 0 && (
                <span className="ml-2 rounded-full bg-cherry/15 px-2 text-xs font-medium text-cherry">
                  {trace.errorCount} error{trace.errorCount === 1 ? "" : "s"}
                </span>
              )}
            </td>
            <td className="px-3 py-1.5 text-ink-soft">{trace.spanCount}</td>
            <td className="w-full py-1.5 pr-4 pl-3">
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 font-mono text-xs text-ink-soft">
                  {formatDuration(trace.durationMs)}
                </span>
                <div className="h-2 min-w-32 flex-1 rounded-full bg-highlight">
                  <div
                    className={`h-2 rounded-full ${trace.errorCount > 0 ? "bg-cherry" : serviceTone(trace.rootServiceName).fill}`}
                    style={{ width: `${Math.max((trace.durationMs / maxDuration) * 100, 1)}%` }}
                  />
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
