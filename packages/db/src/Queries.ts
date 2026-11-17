import * as PgClient from "@effect/sql-pg/PgClient";
import {
  LogEntry,
  Span,
  TraceDetail,
  TraceNotFound,
  TraceSummary,
  type SearchLogsPayload,
  type SearchTracesPayload,
  type TimeRange,
} from "@hotel/api";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import type * as SqlError from "effect/sql/SqlError";

const MAX_LIMIT = 500;
const TRACE_LOOKBACK_DAYS = 14;

const clampLimit = (limit: number) => Math.min(Math.max(limit, 1), MAX_LIMIT);

const LogRow = Schema.Struct({
  id: Schema.String,
  time: Schema.Date,
  severity_number: Schema.Int,
  severity_text: Schema.String,
  body: Schema.NullOr(Schema.String),
  service_name: Schema.String,
  trace_id: Schema.NullOr(Schema.String),
  span_id: Schema.NullOr(Schema.String),
  attributes: Schema.Record(Schema.String, Schema.Json),
  resource_attributes: Schema.Record(Schema.String, Schema.Json),
});

const TraceSummaryRow = Schema.Struct({
  trace_id: Schema.String,
  root_service_name: Schema.String,
  root_span_name: Schema.String,
  start_time: Schema.Date,
  duration_ms: Schema.Number,
  span_count: Schema.Int,
  error_count: Schema.Int,
});

const SpanRow = Schema.Struct({
  trace_id: Schema.String,
  span_id: Schema.String,
  parent_span_id: Schema.NullOr(Schema.String),
  name: Schema.String,
  kind: Schema.Int,
  service_name: Schema.String,
  start_time: Schema.Date,
  duration_ms: Schema.Number,
  status_code: Schema.Int,
  status_message: Schema.String,
  attributes: Schema.Record(Schema.String, Schema.Json),
  resource_attributes: Schema.Record(Schema.String, Schema.Json),
  events: Schema.Array(
    Schema.Struct({
      time: Schema.String,
      name: Schema.String,
      attributes: Schema.Record(Schema.String, Schema.Json),
    }),
  ),
});

const ServiceRow = Schema.Struct({ service_name: Schema.String });

const decodeRows = <S extends Schema.Top>(schema: S) =>
  Schema.decodeUnknownEffect(Schema.Array(schema));

const toLogEntry = (row: typeof LogRow.Type) =>
  new LogEntry({
    id: row.id,
    time: row.time,
    severityNumber: row.severity_number,
    severityText: row.severity_text,
    body: row.body,
    serviceName: row.service_name,
    traceId: row.trace_id,
    spanId: row.span_id,
    attributes: row.attributes,
    resourceAttributes: row.resource_attributes,
  });

export class TelemetryQueries extends Context.Service<
  TelemetryQueries,
  {
    readonly listServices: (range: TimeRange) => Effect.Effect<ReadonlyArray<string>, SqlError.SqlError | Schema.SchemaError>;
    readonly searchLogs: (
      payload: SearchLogsPayload,
    ) => Effect.Effect<ReadonlyArray<LogEntry>, SqlError.SqlError | Schema.SchemaError>;
    readonly searchTraces: (
      payload: SearchTracesPayload,
    ) => Effect.Effect<ReadonlyArray<TraceSummary>, SqlError.SqlError | Schema.SchemaError>;
    readonly getTrace: (
      traceId: string,
    ) => Effect.Effect<TraceDetail, TraceNotFound | SqlError.SqlError | Schema.SchemaError>;
  }
>()("@hotel/db/TelemetryQueries") {}

export const TelemetryQueriesLive = Layer.effect(
  TelemetryQueries,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const listServices = (range: TimeRange) =>
      sql`
        SELECT service_name FROM spans WHERE start_time >= ${range.from} AND start_time < ${range.to}
        UNION
        SELECT service_name FROM logs WHERE time >= ${range.from} AND time < ${range.to}
        ORDER BY service_name`.pipe(
        Effect.flatMap(decodeRows(ServiceRow)),
        Effect.map((rows) => rows.map((row) => row.service_name)),
        Effect.withSpan("TelemetryQueries.listServices"),
      );

    const searchLogs = (payload: SearchLogsPayload) => {
      const filters = [
        sql`time >= ${payload.range.from}`,
        sql`time < ${payload.before ?? payload.range.to}`,
      ];
      if (payload.services.length > 0) filters.push(sql`service_name IN ${sql.in(payload.services)}`);
      if (payload.minSeverity !== undefined) filters.push(sql`severity_number >= ${payload.minSeverity}`);
      if (payload.traceId !== undefined) filters.push(sql`trace_id = ${payload.traceId}`);
      if (payload.query !== undefined && payload.query.length > 0) {
        filters.push(sql`body ILIKE ${`%${payload.query}%`}`);
      }
      return sql`
        SELECT id::text, time, severity_number, severity_text, body, service_name,
               trace_id, span_id, attributes, resource_attributes
        FROM logs
        WHERE ${sql.and(filters)}
        ORDER BY time DESC
        LIMIT ${clampLimit(payload.limit)}`.pipe(
        Effect.flatMap(decodeRows(LogRow)),
        Effect.map((rows) => rows.map(toLogEntry)),
        Effect.withSpan("TelemetryQueries.searchLogs"),
      );
    };

    const searchTraces = (payload: SearchTracesPayload) => {
      const filters = [
        sql`root.start_time >= ${payload.range.from}`,
        sql`root.start_time < ${payload.range.to}`,
        sql`root.parent_span_id IS NULL`,
      ];
      if (payload.services.length > 0) filters.push(sql`root.service_name IN ${sql.in(payload.services)}`);
      if (payload.minDurationMs !== undefined) {
        filters.push(sql`root.duration_ns >= ${Math.round(payload.minDurationMs * 1_000_000)}`);
      }
      const having = payload.onlyErrors ? sql`HAVING count(*) FILTER (WHERE s.status_code = 2) > 0` : sql``;
      return sql`
        SELECT root.trace_id,
               root.service_name AS root_service_name,
               root.name AS root_span_name,
               root.start_time,
               (root.duration_ns / 1e6)::float8 AS duration_ms,
               count(s.*)::int AS span_count,
               (count(*) FILTER (WHERE s.status_code = 2))::int AS error_count
        FROM spans root
        JOIN spans s
          ON s.trace_id = root.trace_id
         AND s.start_time >= root.start_time - interval '1 hour'
         AND s.start_time < root.start_time + interval '1 hour'
        WHERE ${sql.and(filters)}
        GROUP BY root.trace_id, root.span_id, root.service_name, root.name, root.start_time, root.duration_ns
        ${having}
        ORDER BY root.start_time DESC
        LIMIT ${clampLimit(payload.limit)}`.pipe(
        Effect.flatMap(decodeRows(TraceSummaryRow)),
        Effect.map((rows) =>
          rows.map(
            (row) =>
              new TraceSummary({
                traceId: row.trace_id,
                rootServiceName: row.root_service_name,
                rootSpanName: row.root_span_name,
                startTime: row.start_time,
                durationMs: row.duration_ms,
                spanCount: row.span_count,
                errorCount: row.error_count,
              }),
          ),
        ),
        Effect.withSpan("TelemetryQueries.searchTraces"),
      );
    };

    const getTrace = (traceId: string) =>
      Effect.gen(function* () {
        const since = sql`now() - make_interval(days => ${TRACE_LOOKBACK_DAYS})`;
        const spanRows = yield* sql`
          SELECT trace_id, span_id, parent_span_id, name, kind, service_name, start_time,
                 (duration_ns / 1e6)::float8 AS duration_ms, status_code, status_message,
                 attributes, resource_attributes, events
          FROM spans
          WHERE trace_id = ${traceId} AND start_time >= ${since}
          ORDER BY start_time`.pipe(Effect.flatMap(decodeRows(SpanRow)));

        if (spanRows.length === 0) return yield* new TraceNotFound({ traceId });

        const logRows = yield* sql`
          SELECT id::text, time, severity_number, severity_text, body, service_name,
                 trace_id, span_id, attributes, resource_attributes
          FROM logs
          WHERE trace_id = ${traceId} AND time >= ${since}
          ORDER BY time
          LIMIT ${MAX_LIMIT}`.pipe(Effect.flatMap(decodeRows(LogRow)));

        return new TraceDetail({
          traceId,
          spans: spanRows.map(
            (row) =>
              new Span({
                traceId: row.trace_id,
                spanId: row.span_id,
                parentSpanId: row.parent_span_id,
                name: row.name,
                kind: row.kind,
                serviceName: row.service_name,
                startTime: row.start_time,
                durationMs: row.duration_ms,
                statusCode: row.status_code,
                statusMessage: row.status_message,
                attributes: row.attributes,
                resourceAttributes: row.resource_attributes,
                events: row.events,
              }),
          ),
          logs: logRows.map(toLogEntry),
        });
      }).pipe(Effect.withSpan("TelemetryQueries.getTrace", { attributes: { traceId } }));

    return TelemetryQueries.of({ listServices, searchLogs, searchTraces, getTrace });
  }),
);
