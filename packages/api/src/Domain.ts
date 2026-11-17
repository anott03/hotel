import * as Schema from "effect/Schema";

export const Attributes = Schema.Record(Schema.String, Schema.Json);
export type Attributes = typeof Attributes.Type;

export const TimeRange = Schema.Struct({
  from: Schema.Date,
  to: Schema.Date,
});
export type TimeRange = typeof TimeRange.Type;

export class LogEntry extends Schema.Class<LogEntry>("LogEntry")({
  id: Schema.String,
  time: Schema.Date,
  severityNumber: Schema.Int,
  severityText: Schema.String,
  body: Schema.NullOr(Schema.String),
  serviceName: Schema.String,
  traceId: Schema.NullOr(Schema.String),
  spanId: Schema.NullOr(Schema.String),
  attributes: Attributes,
  resourceAttributes: Attributes,
}) {}

export class TraceSummary extends Schema.Class<TraceSummary>("TraceSummary")({
  traceId: Schema.String,
  rootServiceName: Schema.String,
  rootSpanName: Schema.String,
  startTime: Schema.Date,
  durationMs: Schema.Number,
  spanCount: Schema.Int,
  errorCount: Schema.Int,
}) {}

export class SpanEvent extends Schema.Class<SpanEvent>("SpanEvent")({
  time: Schema.String,
  name: Schema.String,
  attributes: Attributes,
}) {}

export class Span extends Schema.Class<Span>("Span")({
  traceId: Schema.String,
  spanId: Schema.String,
  parentSpanId: Schema.NullOr(Schema.String),
  name: Schema.String,
  kind: Schema.Int,
  serviceName: Schema.String,
  startTime: Schema.Date,
  durationMs: Schema.Number,
  statusCode: Schema.Int,
  statusMessage: Schema.String,
  attributes: Attributes,
  resourceAttributes: Attributes,
  events: Schema.Array(SpanEvent),
}) {}

export class TraceDetail extends Schema.Class<TraceDetail>("TraceDetail")({
  traceId: Schema.String,
  spans: Schema.Array(Span),
  logs: Schema.Array(LogEntry),
}) {}

export class TraceNotFound extends Schema.TaggedError<TraceNotFound>()("TraceNotFound", {
  traceId: Schema.String,
}) {}
