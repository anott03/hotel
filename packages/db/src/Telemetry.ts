import * as PgClient from "@effect/sql-pg/PgClient";
import type { LogRow, SpanRow } from "@hotel/otlp";
import * as Array from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as SqlError from "effect/sql/SqlError";

const INSERT_CHUNK_SIZE = 500;

export interface MaintenanceResult {
  readonly droppedPartitions: number;
}

export class TelemetryStore extends Context.Service<
  TelemetryStore,
  {
    readonly insertSpans: (rows: ReadonlyArray<SpanRow>) => Effect.Effect<void, SqlError.SqlError>;
    readonly insertLogs: (rows: ReadonlyArray<LogRow>) => Effect.Effect<void, SqlError.SqlError>;
    readonly maintainPartitions: (options: {
      readonly daysAhead: number;
      readonly retentionDays: number;
    }) => Effect.Effect<MaintenanceResult, SqlError.SqlError>;
  }
>()("@hotel/db/TelemetryStore") {}

export const TelemetryStoreLive = Layer.effect(
  TelemetryStore,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient;

    const spanRecord = (row: SpanRow) => ({
      trace_id: row.traceId,
      span_id: row.spanId,
      parent_span_id: row.parentSpanId,
      trace_state: row.traceState,
      name: row.name,
      kind: row.kind,
      start_time: row.startTime,
      end_time: row.endTime,
      start_time_unix_nano: row.startTimeUnixNano,
      duration_ns: row.durationNs,
      status_code: row.statusCode,
      status_message: row.statusMessage,
      flags: row.flags,
      service_name: row.serviceName,
      scope_name: row.scopeName,
      scope_version: row.scopeVersion,
      resource_attributes: sql.json(row.resourceAttributes),
      attributes: sql.json(row.attributes),
      events: sql.json(row.events),
      links: sql.json(row.links),
    });

    const logRecord = (row: LogRow) => ({
      id: row.id,
      time: row.time,
      time_unix_nano: row.timeUnixNano,
      observed_time: row.observedTime,
      severity_number: row.severityNumber,
      severity_text: row.severityText,
      body: row.body,
      trace_id: row.traceId,
      span_id: row.spanId,
      flags: row.flags,
      event_name: row.eventName,
      service_name: row.serviceName,
      scope_name: row.scopeName,
      scope_version: row.scopeVersion,
      resource_attributes: sql.json(row.resourceAttributes),
      attributes: sql.json(row.attributes),
    });

    const insertSpans = (rows: ReadonlyArray<SpanRow>) =>
      Effect.forEach(
        Array.chunksOf(rows, INSERT_CHUNK_SIZE),
        (chunk) =>
          sql`INSERT INTO spans ${sql.insert(Array.map(chunk, spanRecord))}
              ON CONFLICT (trace_id, span_id, start_time) DO NOTHING`,
        { discard: true },
      ).pipe(Effect.withSpan("TelemetryStore.insertSpans", { attributes: { rows: rows.length } }));

    const insertLogs = (rows: ReadonlyArray<LogRow>) =>
      Effect.forEach(
        Array.chunksOf(rows, INSERT_CHUNK_SIZE),
        (chunk) =>
          sql`INSERT INTO logs ${sql.insert(Array.map(chunk, logRecord))}
              ON CONFLICT (id, time) DO NOTHING`,
        { discard: true },
      ).pipe(Effect.withSpan("TelemetryStore.insertLogs", { attributes: { rows: rows.length } }));

    const maintainPartitions = (options: { readonly daysAhead: number; readonly retentionDays: number }) =>
      Effect.gen(function* () {
        yield* sql`SELECT telemetry_ensure_partitions(${options.daysAhead})`;
        const rows = yield* sql<{ readonly dropped: number }>`
          SELECT telemetry_drop_partitions(${options.retentionDays}) AS dropped`;
        return { droppedPartitions: rows[0]?.dropped ?? 0 };
      }).pipe(Effect.withSpan("TelemetryStore.maintainPartitions"));

    return TelemetryStore.of({ insertSpans, insertLogs, maintainPartitions });
  }),
);
