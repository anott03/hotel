import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Planetscale from "@alchemy.run/planetscale";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";

const LIVE_STAGE = "live_amitav";

export const Database = Effect.gen(function* () {
  if (yield* Alchemy.ALCHEMY_DEV) {
    return yield* Planetscale.PostgresDatabase.ref("TelemetryDb", { stage: LIVE_STAGE });
  }
  return yield* Planetscale.PostgresDatabase("TelemetryDb", {
    region: { slug: "us-east" },
    clusterSize: "PS_5",
    replicas: 0,
    migrations: "./packages/db/migrations",
  });
});

export const CollectorRole = Effect.gen(function* () {
  const database = yield* Database;
  return yield* Planetscale.PostgresRole("CollectorRole", {
    database,
    inheritedRoles: ["pg_read_all_data", "pg_write_all_data"],
  });
});

export const CollectorHyperdrive = Effect.gen(function* () {
  const role = yield* CollectorRole;
  return yield* Cloudflare.Hyperdrive.Connection("CollectorHyperdrive", {
    origin: role.origin,
    dev: role.pooledOrigin,
    caching: { disabled: true },
  });
});

export const TelemetryQueue = Cloudflare.Queues.Queue("TelemetryQueue");
export const TelemetryDeadLetters = Cloudflare.Queues.Queue("TelemetryDeadLetters");

export const IngestToken = Alchemy.Random("IngestToken");
