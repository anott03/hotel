import * as Cloudflare from "@alchemy.run/cloudflare";
import * as SQL from "@alchemy.run/sql/Postgres";
import { TelemetryRpcs } from "@hotel/api";
import { TelemetryQueries, TelemetryQueriesLive } from "@hotel/db";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { RpcSerialization, RpcServer } from "effect/rpc";
import { exportToCollector } from "../../collector/src/Destinations.ts";
import { ReaderHyperdrive } from "./Infra.ts";

export default class Api extends Cloudflare.Workers.RpcWorker<Api>()(
  "Api",
  {
    main: import.meta.url,
    workersDev: false,
    schema: TelemetryRpcs,
    compatibility: { flags: ["nodejs_compat"] },
    observability: exportToCollector,
  },
  Effect.gen(function* () {
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(ReaderHyperdrive);
    const queries = yield* TelemetryQueries.pipe(
      Effect.provide(
        TelemetryQueriesLive.pipe(Layer.provide(SQL.PostgresLayer({ url: hyperdrive.connectionString }))),
      ),
    );

    const handlers = TelemetryRpcs.toLayer({
      listServices: ({ range }) => queries.listServices(range).pipe(Effect.orDie),
      searchLogs: (payload) => queries.searchLogs(payload).pipe(Effect.orDie),
      searchTraces: (payload) => queries.searchTraces(payload).pipe(Effect.orDie),
      getTrace: ({ traceId }) =>
        queries.getTrace(traceId).pipe(Effect.catchTag(["SqlError", "SchemaError"], Effect.die)),
    });

    return RpcServer.toHttpEffect(TelemetryRpcs).pipe(
      Effect.provide(Layer.mergeAll(handlers, RpcSerialization.layerJson)),
    );
  }).pipe(
    Effect.provide(Layer.mergeAll(Cloudflare.Hyperdrive.ConnectBinding, Cloudflare.Telemetry())),
  ),
) {}
