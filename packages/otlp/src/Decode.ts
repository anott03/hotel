import { fromBinary, fromJson, type JsonValue } from "@bufbuild/protobuf";
import { base64Encode } from "@bufbuild/protobuf/wire";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import {
  ExportLogsServiceRequestSchema,
  type ExportLogsServiceRequest,
} from "./gen/opentelemetry/proto/collector/logs/v1/logs_service_pb.ts";
import {
  ExportTraceServiceRequestSchema,
  type ExportTraceServiceRequest,
} from "./gen/opentelemetry/proto/collector/trace/v1/trace_service_pb.ts";

export type Encoding = "protobuf" | "json";

export class OtlpDecodeError extends Schema.TaggedError<OtlpDecodeError>()(
  "OtlpDecodeError",
  { message: Schema.String },
) {}

const ID_KEYS = new Set(["traceId", "spanId", "parentSpanId"]);
const HEX = /^(?:[0-9a-fA-F]{2})*$/;

const hexToBase64 = (hex: string): string => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return base64Encode(bytes);
};

const rewriteIds = (value: Schema.Json, key?: string): JsonValue => {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => rewriteIds(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        rewriteIds(entryValue, entryKey),
      ]),
    );
  }
  if (typeof value === "string" && key !== undefined && ID_KEYS.has(key) && HEX.test(value)) {
    return hexToBase64(value);
  }
  return value;
};

const decodeJsonBody = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Json));

const parseOtlpJson = (body: Uint8Array) =>
  decodeJsonBody(new TextDecoder().decode(body)).pipe(
    Effect.map((json) => rewriteIds(json)),
    Effect.mapError((error) => new OtlpDecodeError({ message: error.message })),
  );

const decodeWith = <A>(
  body: Uint8Array,
  encoding: Encoding,
  binary: (bytes: Uint8Array) => A,
  json: (value: JsonValue) => A,
): Effect.Effect<A, OtlpDecodeError> =>
  encoding === "protobuf"
    ? Effect.try({
        try: () => binary(body),
        catch: (cause) => new OtlpDecodeError({ message: String(cause) }),
      })
    : parseOtlpJson(body).pipe(
        Effect.flatMap((value) =>
          Effect.try({
            try: () => json(value),
            catch: (cause) => new OtlpDecodeError({ message: String(cause) }),
          }),
        ),
      );

export const decodeTraces = (
  body: Uint8Array,
  encoding: Encoding,
): Effect.Effect<ExportTraceServiceRequest, OtlpDecodeError> =>
  decodeWith(
    body,
    encoding,
    (bytes) => fromBinary(ExportTraceServiceRequestSchema, bytes),
    (value) => fromJson(ExportTraceServiceRequestSchema, value, { ignoreUnknownFields: true }),
  );

export const decodeLogs = (
  body: Uint8Array,
  encoding: Encoding,
): Effect.Effect<ExportLogsServiceRequest, OtlpDecodeError> =>
  decodeWith(
    body,
    encoding,
    (bytes) => fromBinary(ExportLogsServiceRequestSchema, bytes),
    (value) => fromJson(ExportLogsServiceRequestSchema, value, { ignoreUnknownFields: true }),
  );
