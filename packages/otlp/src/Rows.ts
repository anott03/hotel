import * as Schema from "effect/Schema";

export const Attributes = Schema.Record(Schema.String, Schema.Json);
export type Attributes = typeof Attributes.Type;

export const SpanEvent = Schema.Struct({
  time: Schema.String,
  name: Schema.String,
  attributes: Attributes,
});
export type SpanEvent = typeof SpanEvent.Type;

export const SpanLink = Schema.Struct({
  traceId: Schema.String,
  spanId: Schema.String,
  traceState: Schema.String,
  attributes: Attributes,
});
export type SpanLink = typeof SpanLink.Type;

export const SpanRow = Schema.Struct({
  traceId: Schema.String,
  spanId: Schema.String,
  parentSpanId: Schema.NullOr(Schema.String),
  traceState: Schema.String,
  name: Schema.String,
  kind: Schema.Int,
  startTime: Schema.String,
  endTime: Schema.String,
  startTimeUnixNano: Schema.String,
  durationNs: Schema.String,
  statusCode: Schema.Int,
  statusMessage: Schema.String,
  flags: Schema.Int,
  serviceName: Schema.String,
  scopeName: Schema.String,
  scopeVersion: Schema.String,
  resourceAttributes: Attributes,
  attributes: Attributes,
  events: Schema.Array(SpanEvent),
  links: Schema.Array(SpanLink),
});
export type SpanRow = typeof SpanRow.Type;

export const LogRow = Schema.Struct({
  id: Schema.String,
  time: Schema.String,
  timeUnixNano: Schema.String,
  observedTime: Schema.String,
  severityNumber: Schema.Int,
  severityText: Schema.String,
  body: Schema.NullOr(Schema.String),
  traceId: Schema.NullOr(Schema.String),
  spanId: Schema.NullOr(Schema.String),
  flags: Schema.Int,
  eventName: Schema.String,
  serviceName: Schema.String,
  scopeName: Schema.String,
  scopeVersion: Schema.String,
  resourceAttributes: Attributes,
  attributes: Attributes,
});
export type LogRow = typeof LogRow.Type;
