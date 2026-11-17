import * as Cloudflare from "@alchemy.run/cloudflare";
import * as SQL from "@alchemy.run/sql/Postgres";
import { TelemetryStore, TelemetryStoreLive } from "@hotel/db";
import {
  decodeLogs,
  decodeTraces,
  flattenLogs,
  flattenTraces,
  logsResponse,
  traceResponse,
  type EncodedResponse,
  type Encoding,
  type LogRow,
  type SpanRow,
} from "@hotel/otlp";
import * as Effect from "effect/Effect";
import * as Headers from "effect/http/Headers";
import { HttpServerRequest } from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Stream from "effect/Stream";
import {
  CollectorHyperdrive,
  IngestToken,
  TelemetryDeadLetters,
  TelemetryQueue,
} from "./Infra.ts";
import {
  decodeTelemetryMessage,
  toLogMessages,
  toSendBatches,
  toSpanMessages,
  type TelemetryMessage,
} from "./Messages.ts";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const RETENTION_DAYS = 14;
const PARTITION_DAYS_AHEAD = 3;
const SELF_SERVICE_NAMES = new Set(["hotel-collector"]);

const textResponse = (status: number, message: string) =>
  HttpServerResponse.text(message, { status });

const otlpResponse = (encoded: EncodedResponse) =>
  HttpServerResponse.uint8Array(encoded.body, { contentType: encoded.contentType });

const encodingOf = (contentType: string): Encoding | undefined => {
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "application/x-protobuf" || mime === "application/protobuf") return "protobuf";
  if (mime === "application/json") return "json";
  return undefined;
};

const constantTimeEqual = (a: string, b: string): boolean => {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
};

const readBody = (request: HttpServerRequest, contentEncoding: string) =>
  Effect.gen(function* () {
    const raw = yield* request.arrayBuffer;
    if (raw.byteLength > MAX_BODY_BYTES) return Option.none<Uint8Array>();
    if (contentEncoding === "" || contentEncoding === "identity") {
      return Option.some(new Uint8Array(raw));
    }
    if (contentEncoding !== "gzip") return Option.none<Uint8Array>();
    const inflated = yield* Effect.tryPromise(() =>
      new Response(
        new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer(),
    );
    return inflated.byteLength > MAX_BODY_BYTES
      ? Option.none<Uint8Array>()
      : Option.some(new Uint8Array(inflated));
  });

const withoutSelf = <Row extends { readonly serviceName: string }>(rows: ReadonlyArray<Row>) =>
  rows.filter((row) => !SELF_SERVICE_NAMES.has(row.serviceName));

export default class Collector extends Cloudflare.Worker<Collector>()(
  "Collector",
  {
    main: import.meta.url,
    compatibility: { flags: ["nodejs_compat"] },
    observability: {
      logs: { enabled: true, invocationLogs: false },
    },
  },
  Effect.gen(function* () {
    const ingestToken = yield* (yield* IngestToken).text;
    const queue = yield* Cloudflare.Queues.WriteQueue(TelemetryQueue);
    const telemetryQueue = yield* TelemetryQueue;
    const deadLetters = yield* TelemetryDeadLetters;
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(CollectorHyperdrive);

    const storeLayer = TelemetryStoreLive.pipe(
      Layer.provide(SQL.PostgresLayer({ url: hyperdrive.connectionString })),
    );
    const store = yield* TelemetryStore.pipe(Effect.provide(storeLayer));

    const enqueue = (messages: ReturnType<typeof toSpanMessages>) =>
      Effect.forEach(
        toSendBatches(messages),
        (batch) => queue.sendBatch(batch.map((body) => ({ body }))),
        { discard: true },
      );

    const ingest = <Row extends { readonly serviceName: string }>(options: {
      readonly decode: (body: Uint8Array, encoding: Encoding) => Effect.Effect<ReadonlyArray<Row>, unknown>;
      readonly toMessages: (rows: ReadonlyArray<Row>) => ReturnType<typeof toSpanMessages>;
      readonly respond: (encoding: Encoding) => EncodedResponse;
    }) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest;

        if (request.method !== "POST") return textResponse(405, "method not allowed");

        const authorization = Option.getOrElse(
          Headers.get(request.headers, "authorization"),
          () => "",
        );
        const expected = `Bearer ${Redacted.value(yield* ingestToken)}`;
        if (!constantTimeEqual(authorization, expected)) {
          return textResponse(401, "unauthorized");
        }

        const encoding = encodingOf(
          Option.getOrElse(Headers.get(request.headers, "content-type"), () => ""),
        );
        if (encoding === undefined) return textResponse(415, "unsupported content-type");

        const contentEncoding = Option.getOrElse(
          Headers.get(request.headers, "content-encoding"),
          () => "",
        ).toLowerCase();

        const body = yield* readBody(request, contentEncoding).pipe(
          Effect.catch(() => Effect.succeed(Option.none<Uint8Array>())),
        );
        if (Option.isNone(body)) return textResponse(400, "unreadable or oversized body");

        const rows = yield* options.decode(body.value, encoding).pipe(Effect.option);
        if (Option.isNone(rows)) return textResponse(400, "invalid OTLP payload");

        const accepted = withoutSelf(rows.value);
        const sent = yield* enqueue(options.toMessages(accepted)).pipe(
          Effect.as(true),
          Effect.catch((error) =>
            Effect.logError("failed to enqueue telemetry", error).pipe(Effect.as(false)),
          ),
        );
        if (!sent) return textResponse(503, "temporarily unavailable");

        return otlpResponse(options.respond(encoding));
      });

    const ingestTraces = ingest<SpanRow>({
      decode: (body, encoding) => decodeTraces(body, encoding).pipe(Effect.map(flattenTraces)),
      toMessages: toSpanMessages,
      respond: (encoding) => traceResponse(encoding),
    });

    const ingestLogs = ingest<LogRow>({
      decode: (body, encoding) =>
        decodeLogs(body, encoding).pipe(Effect.map((request) => flattenLogs(request))),
      toMessages: toLogMessages,
      respond: (encoding) => logsResponse(encoding),
    });

    const persist = (message: TelemetryMessage) =>
      message.kind === "spans" ? store.insertSpans(message.rows) : store.insertLogs(message.rows);

    yield* Cloudflare.Queues.consumeQueueMessages(
      telemetryQueue,
      {
        batchSize: 100,
        maxWaitTime: "5 seconds",
        maxRetries: 5,
        retryDelay: "30 seconds",
        deadLetterQueue: deadLetters,
      },
      (messages) =>
        Effect.gen(function* () {
          const batch = yield* Stream.runCollect(messages);
          const decoded = yield* Effect.forEach(batch, (message) =>
            decodeTelemetryMessage(message.body),
          );
          const spans = decoded.flatMap((message) => (message.kind === "spans" ? message.rows : []));
          const logs = decoded.flatMap((message) => (message.kind === "logs" ? message.rows : []));
          yield* persist({ kind: "spans", rows: spans });
          yield* persist({ kind: "logs", rows: logs });
        }),
    );

    yield* Cloudflare.Queues.consumeQueueMessages(deadLetters, (messages) =>
      Stream.runForEach(messages, (message) =>
        Effect.logError("dropped telemetry batch after retries", {
          id: message.id,
          attempts: message.attempts,
        }),
      ),
    );

    yield* Cloudflare.Workers.cron("15 * * * *", () =>
      store
        .maintainPartitions({ daysAhead: PARTITION_DAYS_AHEAD, retentionDays: RETENTION_DAYS })
        .pipe(
          Effect.tap((result) => Effect.log("partition maintenance complete", result)),
          Effect.tapError((error) => Effect.logError("partition maintenance failed", error)),
        ),
    );

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;
        const pathname = new URL(request.url, "http://localhost").pathname;
        switch (pathname) {
          case "/v1/traces":
            return yield* ingestTraces;
          case "/v1/logs":
            return yield* ingestLogs;
          case "/healthz":
            return textResponse(200, "ok");
          default:
            return textResponse(404, "not found");
        }
      }),
    };
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        Cloudflare.Queues.WriteQueueBinding,
        Cloudflare.Queues.EventSourceLive,
        Cloudflare.Hyperdrive.ConnectBinding,
        Cloudflare.Workers.CronEventSourceLive,
      ),
    ),
  ),
) {}
