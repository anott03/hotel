import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { LogEntry } from "@hotel/api";
import * as Atom from "effect/reactivity/Atom";
import { useState } from "react";
import { FilterBar, RangeSelect, RefreshButton } from "../../components/Filters.tsx";
import { Result } from "../../components/Result.tsx";
import { ServiceTag } from "../../components/ServiceTag.tsx";
import { Button, Input, Select } from "../../components/ui/index.ts";
import { navigate, replaceSearchParams, useSearchParams } from "../../lib/route.ts";
import {
  DEFAULT_RANGE,
  formatTimestamp,
  parseRangePreset,
  rangeFor,
  type RangePresetId,
} from "../../lib/time.ts";
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
];

const parseFilters = (params: URLSearchParams): LogFilters => ({
  range: parseRangePreset(params.get("range")),
  service: params.get("service") ?? "",
  minSeverity:
    SEVERITIES.find((severity) => String(severity.value) === params.get("level"))?.value ?? 0,
  query: params.get("q") ?? "",
});

const writeFilters = (filters: LogFilters) => {
  const params = new URLSearchParams();
  if (filters.range !== DEFAULT_RANGE) params.set("range", filters.range);
  if (filters.service !== "") params.set("service", filters.service);
  if (filters.minSeverity > 0) params.set("level", String(filters.minSeverity));
  if (filters.query !== "") params.set("q", filters.query);
  replaceSearchParams(params);
};

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
  if (severityNumber >= 17) return "bg-cherry/15 text-cherry";
  if (severityNumber >= 13) return "bg-tangerine/15 text-tangerine";
  if (severityNumber >= 9) return "bg-highlight text-ink";
  return "text-ink-faint";
};

export function LogsPage() {
  const filters = parseFilters(useSearchParams());
  const [draftQuery, setDraftQuery] = useState(filters.query);
  const atom = logsAtom(JSON.stringify(filters));
  const result = useAtomValue(atom);
  const refresh = useAtomRefresh(atom);

  return (
    <div className="flex h-full flex-col">
      <FilterBar>
        <RangeSelect
          value={filters.range}
          onChange={(range) => writeFilters({ ...filters, range })}
        />
        <Select
          label="Minimum severity"
          value={filters.minSeverity}
          options={SEVERITIES}
          onChange={(minSeverity) => writeFilters({ ...filters, minSeverity })}
        />
        <form
          className="flex flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            writeFilters({ ...filters, query: draftQuery.trim() });
          }}
        >
          <Input
            aria-label="Search log bodies"
            className="min-w-48 flex-1 font-mono"
            placeholder="Search log bodies…"
            value={draftQuery}
            onValueChange={setDraftQuery}
          />
        </form>
        <RefreshButton onClick={refresh} />
      </FilterBar>
      <div className="flex-1 overflow-auto">
        <Result result={result}>
          {(logs) => <LogTable logs={logs} showService={filters.service === ""} />}
        </Result>
      </div>
    </div>
  );
}

function LogTable(props: {
  readonly logs: ReadonlyArray<LogEntry>;
  readonly showService: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (props.logs.length === 0)
    return <p className="p-4 text-sm text-ink-faint">No logs in this range.</p>;
  return (
    <table className="w-full font-mono text-xs">
      <tbody>
        {props.logs.map((log) => (
          <LogRow
            key={log.id}
            log={log}
            showService={props.showService}
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
  readonly showService: boolean;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  const { log } = props;
  return (
    <>
      <tr
        className="cursor-pointer border-b border-line/30 align-top hover:bg-raised"
        onClick={props.onToggle}
      >
        <td className="px-4 py-1 whitespace-nowrap text-ink-faint">{formatTimestamp(log.time)}</td>
        <td className="px-2 py-1 whitespace-nowrap">
          <span
            className={`inline-block rounded-full px-2 font-medium ${severityClass(log.severityNumber)}`}
          >
            {log.severityText || log.severityNumber}
          </span>
        </td>
        {props.showService && (
          <td className="px-2 py-1">
            <ServiceTag name={log.serviceName} />
          </td>
        )}
        <td className="w-full px-2 py-1 break-all">{log.body}</td>
      </tr>
      {props.expanded && (
        <tr className="border-b border-line/30 bg-raised/60">
          <td colSpan={props.showService ? 4 : 3} className="px-4 py-3">
            {log.traceId !== null && (
              <Button
                variant="link"
                className="mb-2 font-mono text-xs"
                onClick={() => navigate({ page: "trace", traceId: log.traceId ?? "" })}
              >
                View trace {log.traceId}
              </Button>
            )}
            <pre className="whitespace-pre-wrap text-ink-soft">
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
