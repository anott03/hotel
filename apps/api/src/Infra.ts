import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Planetscale from "@alchemy.run/planetscale";
import * as Effect from "effect/Effect";
import { Database } from "../../collector/src/Infra.ts";

export const ReaderRole = Effect.gen(function* () {
  const database = yield* Database;
  return yield* Planetscale.PostgresRole("ReaderRole", {
    database,
    inheritedRoles: ["pg_read_all_data"],
  });
});

export const ReaderHyperdrive = Effect.gen(function* () {
  const role = yield* ReaderRole;
  return yield* Cloudflare.Hyperdrive.Connection("ReaderHyperdrive", {
    origin: role.origin,
    dev: role.pooledOrigin,
    caching: { maxAge: 10, staleWhileRevalidate: 5 },
  });
});
