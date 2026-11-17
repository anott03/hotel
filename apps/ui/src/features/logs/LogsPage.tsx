import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { LogEntry } from "@hotel/api";
import * as Atom from "effect/reactivity/Atom";
import { useState } from "react";
import { FilterBar, RangeSelect, ServiceSelect } from "../../components/Filters.tsx";
import { Result } from "../../components/Result.tsx";
import { navigate } from "../../lib/route.ts";
import { formatTimestamp, rangeFor, type RangePresetId } from "../../lib/time.ts";
import { TelemetryClient } from "../../rpc/client.ts";

interface LogFilters {
  readonly range: RangePresetId;
  readonly service: string;
  readonly minSeverity: number;
  readonly query: string;
}

const SEVERITIES = [
  { label: "All levels", value: 0 },
  { label: "Debug+", value: 5 },
  { label: "Info+", value: 9 },
  { label: "Warn+", value: 13 },
  { label: "Error+", value: 17 },
] as const;

const logsAtom = Atom.family((key: string) => {
  const filters: LogFilters = JSON.parse(key);
  return TelemetryClient.query(
    "searchLogs",
    {
      range: rangeFor(filters.range),
      services: filters.service === "" ? [] : [filters.service],
      minSeverity: filters.minSeverity > 0 ? filters.minSeverity : undefined,
      query: filters.query === "" ? undefined : filters.query,
      limit: 200,
    },
    { timeToLive: "30 seconds" },
  );
});

const severityClass = (severityNumber: number): string => {
  if (severityNumber >= 17) return "text-red-400";
  if (severityNumber >= 13) return "text-amber-400";
  if (severityNumber >= 9) return "text-sky-400";
  return "text-zinc-500";
};

export function LogsPage() {
  const [filters, setFilters] = useState<LogFilters>({
    range: "1h",
    service: "",
    minSeverity: 0,
    query: "",
  });
  const [draftQuery, setDraftQuery] = useState("");
  const atom = logsAtom(JSON.stringify(filters));
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
        <select
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={filters.minSeverity}
          onChange={(event) => setFilters({ ...filters, minSeverity: Number(event.target.value) })}
        >
          {SEVERITIES.map((severity) => (
            <option key={severity.value} value={severity.value}>
              {severity.label}
            </option>
          ))}
        </select>
        <form
          className="flex flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ ...filters, query: draftQuery.trim() });
          }}
        >
          <input
            className="min-w-48 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-sm"
            placeholder="Search log bodies…"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </form>
        <button
          className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
          onClick={refresh}
        >
          Refresh
        </button>
      </FilterBar>
      <div className="flex-1 overflow-auto">
        <Result result={result}>{(logs) => <LogTable logs={logs} />}</Result>
      </div>
    </div>
  );
}

function LogTable(props: { readonly logs: ReadonlyArray<LogEntry> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (props.logs.length === 0)
    return <p className="p-4 text-sm text-zinc-500">No logs in this range.</p>;
  return (
    <table className="w-full font-mono text-xs">
      <tbody>
        {props.logs.map((log) => (
          <LogRow
            key={log.id}
            log={log}
            expanded={expanded === log.id}
            onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
          />
        ))}
      </tbody>
    </table>
  );
}

function LogRow(props: {
  readonly log: LogEntry;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  const { log } = props;
  return (
    <>
      <tr
        className="cursor-pointer border-b border-zinc-900 align-top hover:bg-zinc-900"
        onClick={props.onToggle}
      >
        <td className="px-4 py-1 whitespace-nowrap text-zinc-500">{formatTimestamp(log.time)}</td>
        <td className={`px-2 py-1 whitespace-nowrap ${severityClass(log.severityNumber)}`}>
          {log.severityText || log.severityNumber}
        </td>
        <td className="px-2 py-1 whitespace-nowrap text-violet-300">{log.serviceName}</td>
        <td className="w-full px-2 py-1 break-all">{log.body}</td>
      </tr>
      {props.expanded && (
        <tr className="border-b border-zinc-900 bg-zinc-900/60">
          <td colSpan={4} className="px-4 py-3">
            {log.traceId !== null && (
              <button
                className="mb-2 text-sky-400 hover:underline"
                onClick={() => navigate({ page: "trace", traceId: log.traceId ?? "" })}
              >
                View trace {log.traceId}
              </button>
            )}
            <pre className="whitespace-pre-wrap text-zinc-400">
              {JSON.stringify(
                { attributes: log.attributes, resource: log.resourceAttributes },
                null,
                2,
              )}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
