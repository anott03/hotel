import { create, toBinary, toJson } from "@bufbuild/protobuf";
import {
  ExportLogsPartialSuccessSchema,
  ExportLogsServiceResponseSchema,
} from "./gen/opentelemetry/proto/collector/logs/v1/logs_service_pb.ts";
import {
  ExportTracePartialSuccessSchema,
  ExportTraceServiceResponseSchema,
} from "./gen/opentelemetry/proto/collector/trace/v1/trace_service_pb.ts";
import type { Encoding } from "./Decode.ts";

export interface PartialSuccess {
  readonly rejected: number;
  readonly errorMessage: string;
}

export interface EncodedResponse {
  readonly body: Uint8Array;
  readonly contentType: string;
}

const encode = (encoding: Encoding, binary: () => Uint8Array, json: () => string): EncodedResponse =>
  encoding === "protobuf"
    ? { body: binary(), contentType: "application/x-protobuf" }
    : { body: new TextEncoder().encode(json()), contentType: "application/json" };

export const traceResponse = (encoding: Encoding, partial?: PartialSuccess): EncodedResponse => {
  const message = create(ExportTraceServiceResponseSchema);
  if (partial !== undefined && partial.rejected > 0) {
    message.partialSuccess = create(ExportTracePartialSuccessSchema, {
      rejectedSpans: BigInt(partial.rejected),
      errorMessage: partial.errorMessage,
    });
  }
  return encode(
    encoding,
    () => toBinary(ExportTraceServiceResponseSchema, message),
    () => JSON.stringify(toJson(ExportTraceServiceResponseSchema, message)),
  );
};

export const logsResponse = (encoding: Encoding, partial?: PartialSuccess): EncodedResponse => {
  const message = create(ExportLogsServiceResponseSchema);
  if (partial !== undefined && partial.rejected > 0) {
    message.partialSuccess = create(ExportLogsPartialSuccessSchema, {
      rejectedLogRecords: BigInt(partial.rejected),
      errorMessage: partial.errorMessage,
    });
  }
  return encode(
    encoding,
    () => toBinary(ExportLogsServiceResponseSchema, message),
    () => JSON.stringify(toJson(ExportLogsServiceResponseSchema, message)),
  );
};
