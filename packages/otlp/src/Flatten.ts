import type * as Schema from "effect/Schema";
import type { ExportLogsServiceRequest } from "./gen/opentelemetry/proto/collector/logs/v1/logs_service_pb.ts";
import type { ExportTraceServiceRequest } from "./gen/opentelemetry/proto/collector/trace/v1/trace_service_pb.ts";
import type {
  AnyValue,
  InstrumentationScope,
  KeyValue,
} from "./gen/opentelemetry/proto/common/v1/common_pb.ts";
import type { Resource } from "./gen/opentelemetry/proto/resource/v1/resource_pb.ts";
import type { Attributes, LogRow, SpanRow } from "./Rows.ts";

const UNKNOWN_SERVICE = "unknown_service";

const toHex = (bytes: Uint8Array): string => {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
};

const isZeroOrEmpty = (bytes: Uint8Array): boolean => bytes.every((byte) => byte === 0);

const optionalId = (bytes: Uint8Array): string | null =>
  isZeroOrEmpty(bytes) ? null : toHex(bytes);

const nanosToIso = (nanos: bigint): string =>
  new Date(Number(nanos / 1_000_000n)).toISOString();

const anyValueToJson = (value: AnyValue | undefined): Schema.Json => {
  if (value === undefined) return null;
  switch (value.value.case) {
    case "stringValue":
    case "boolValue":
    case "doubleValue":
      return value.value.value;
    case "intValue": {
      const int = value.value.value;
      return int <= BigInt(Number.MAX_SAFE_INTEGER) && int >= BigInt(Number.MIN_SAFE_INTEGER)
        ? Number(int)
        : int.toString();
    }
    case "bytesValue":
      return toHex(value.value.value);
    case "arrayValue":
      return value.value.value.values.map(anyValueToJson);
    case "kvlistValue":
      return attributesToJson(value.value.value.values);
    case "stringValueStrindex":
    case undefined:
      return null;
  }
};

const attributesToJson = (attributes: ReadonlyArray<KeyValue>): Attributes =>
  Object.fromEntries(attributes.map((kv) => [kv.key, anyValueToJson(kv.value)]));

const bodyToText = (value: AnyValue | undefined): string | null => {
  if (value === undefined || value.value.case === undefined) return null;
  if (value.value.case === "stringValue") return value.value.value;
  return JSON.stringify(anyValueToJson(value));
};

const serviceNameOf = (attributes: ReadonlyArray<KeyValue>): string => {
  const value = attributes.find((kv) => kv.key === "service.name")?.value?.value;
  return value?.case === "stringValue" && value.value.length > 0 ? value.value : UNKNOWN_SERVICE;
};

interface ResourceContext {
  readonly resourceAttributes: Attributes;
  readonly serviceName: string;
}

const resourceContext = (resource: Resource | undefined): ResourceContext => {
  const attributes = resource?.attributes ?? [];
  return {
    resourceAttributes: attributesToJson(attributes),
    serviceName: serviceNameOf(attributes),
  };
};

const scopeFields = (scope: InstrumentationScope | undefined) => ({
  scopeName: scope?.name ?? "",
  scopeVersion: scope?.version ?? "",
});

export const flattenTraces = (request: ExportTraceServiceRequest): Array<SpanRow> =>
  request.resourceSpans.flatMap((resourceSpans) => {
    const resource = resourceContext(resourceSpans.resource);
    return resourceSpans.scopeSpans.flatMap((scopeSpans) => {
      const scope = scopeFields(scopeSpans.scope);
      return scopeSpans.spans.map(
        (span): SpanRow => ({
          traceId: toHex(span.traceId),
          spanId: toHex(span.spanId),
          parentSpanId: optionalId(span.parentSpanId),
          traceState: span.traceState,
          name: span.name,
          kind: span.kind,
          startTime: nanosToIso(span.startTimeUnixNano),
          endTime: nanosToIso(span.endTimeUnixNano),
          startTimeUnixNano: span.startTimeUnixNano.toString(),
          durationNs: (span.endTimeUnixNano > span.startTimeUnixNano
            ? span.endTimeUnixNano - span.startTimeUnixNano
            : 0n
          ).toString(),
          statusCode: span.status?.code ?? 0,
          statusMessage: span.status?.message ?? "",
          flags: span.flags,
          ...resource,
          ...scope,
          attributes: attributesToJson(span.attributes),
          events: span.events.map((event) => ({
            time: nanosToIso(event.timeUnixNano),
            name: event.name,
            attributes: attributesToJson(event.attributes),
          })),
          links: span.links.map((link) => ({
            traceId: toHex(link.traceId),
            spanId: toHex(link.spanId),
            traceState: link.traceState,
            attributes: attributesToJson(link.attributes),
          })),
        }),
      );
    });
  });

export const flattenLogs = (
  request: ExportLogsServiceRequest,
  receivedAt: bigint = BigInt(Date.now()) * 1_000_000n,
): Array<LogRow> =>
  request.resourceLogs.flatMap((resourceLogs) => {
    const resource = resourceContext(resourceLogs.resource);
    return resourceLogs.scopeLogs.flatMap((scopeLogs) => {
      const scope = scopeFields(scopeLogs.scope);
      return scopeLogs.logRecords.map((record): LogRow => {
        const observed =
          record.observedTimeUnixNano > 0n ? record.observedTimeUnixNano : receivedAt;
        const time = record.timeUnixNano > 0n ? record.timeUnixNano : observed;
        return {
          id: crypto.randomUUID(),
          time: nanosToIso(time),
          timeUnixNano: time.toString(),
          observedTime: nanosToIso(observed),
          severityNumber: record.severityNumber,
          severityText: record.severityText,
          body: bodyToText(record.body),
          traceId: optionalId(record.traceId),
          spanId: optionalId(record.spanId),
          flags: record.flags,
          eventName: record.eventName,
          ...resource,
          ...scope,
          attributes: attributesToJson(record.attributes),
        };
      });
    });
  });
