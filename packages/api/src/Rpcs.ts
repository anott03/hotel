import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";
import { LogEntry, TimeRange, TraceDetail, TraceNotFound, TraceSummary } from "./Domain.ts";

export const SearchLogsPayload = Schema.Struct({
  range: TimeRange,
  services: Schema.Array(Schema.String),
  minSeverity: Schema.optional(Schema.Int),
  query: Schema.optional(Schema.String),
  traceId: Schema.optional(Schema.String),
  limit: Schema.Int,
  before: Schema.optional(Schema.Date),
});
export type SearchLogsPayload = typeof SearchLogsPayload.Type;

export const SearchTracesPayload = Schema.Struct({
  range: TimeRange,
  services: Schema.Array(Schema.String),
  minDurationMs: Schema.optional(Schema.Number),
  onlyErrors: Schema.Boolean,
  limit: Schema.Int,
});
export type SearchTracesPayload = typeof SearchTracesPayload.Type;

export class TelemetryRpcs extends RpcGroup.make(
  Rpc.make("listServices", {
    payload: { range: TimeRange },
    success: Schema.Array(Schema.String),
  }),
  Rpc.make("searchLogs", {
    payload: SearchLogsPayload,
    success: Schema.Array(LogEntry),
  }),
  Rpc.make("searchTraces", {
    payload: SearchTracesPayload,
    success: Schema.Array(TraceSummary),
  }),
  Rpc.make("getTrace", {
    payload: { traceId: Schema.String },
    success: TraceDetail,
    error: TraceNotFound,
  }),
) {}
