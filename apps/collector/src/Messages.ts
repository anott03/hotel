import { LogRow, SpanRow } from "@hotel/otlp";
import * as Schema from "effect/Schema";

export const TelemetryMessage = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("spans"), rows: Schema.Array(SpanRow) }),
  Schema.Struct({ kind: Schema.Literal("logs"), rows: Schema.Array(LogRow) }),
]);
export type TelemetryMessage = typeof TelemetryMessage.Type;

export const decodeTelemetryMessage = Schema.decodeUnknownEffect(TelemetryMessage);

const MAX_MESSAGE_BYTES = 120_000;
const MAX_BATCH_MESSAGES = 100;
const MAX_BATCH_BYTES = 250_000;

const byteLength = (value: TelemetryMessage): number =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

const splitRows = <Row>(
  rows: ReadonlyArray<Row>,
  wrap: (rows: ReadonlyArray<Row>) => TelemetryMessage,
): Array<{ readonly message: TelemetryMessage; readonly bytes: number }> => {
  if (rows.length === 0) return [];
  const message = wrap(rows);
  const bytes = byteLength(message);
  if (bytes <= MAX_MESSAGE_BYTES || rows.length === 1) return [{ message, bytes }];
  const mid = Math.ceil(rows.length / 2);
  return [...splitRows(rows.slice(0, mid), wrap), ...splitRows(rows.slice(mid), wrap)];
};

export const toSpanMessages = (rows: ReadonlyArray<SpanRow>) =>
  splitRows(rows, (chunk): TelemetryMessage => ({ kind: "spans", rows: chunk }));

export const toLogMessages = (rows: ReadonlyArray<LogRow>) =>
  splitRows(rows, (chunk): TelemetryMessage => ({ kind: "logs", rows: chunk }));

export const toSendBatches = (
  messages: ReadonlyArray<{ readonly message: TelemetryMessage; readonly bytes: number }>,
): Array<Array<TelemetryMessage>> => {
  const batches: Array<Array<TelemetryMessage>> = [];
  let current: Array<TelemetryMessage> = [];
  let currentBytes = 0;
  for (const { message, bytes } of messages) {
    if (
      current.length > 0 &&
      (current.length >= MAX_BATCH_MESSAGES || currentBytes + bytes > MAX_BATCH_BYTES)
    ) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(message);
    currentBytes += bytes;
  }
  if (current.length > 0) batches.push(current);
  return batches;
};
