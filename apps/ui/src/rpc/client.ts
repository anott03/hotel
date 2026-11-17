import { TelemetryRpcs } from "@hotel/api";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";
import * as AtomRpc from "effect/reactivity/AtomRpc";
import { RpcClient, RpcSerialization } from "effect/rpc";

const reloadOnExpiredSession = HttpClient.tap((response) =>
  response.status === 401 || response.status === 403 || response.request.url !== response.url
    ? Effect.sync(() => window.location.reload())
    : Effect.void,
);

export class TelemetryClient extends AtomRpc.Service<TelemetryClient>()("TelemetryClient", {
  group: TelemetryRpcs,
  protocol: RpcClient.layerProtocolHttp({
    url: `${window.location.origin}/rpc`,
    transformClient: reloadOnExpiredSession,
  }).pipe(Layer.provide(FetchHttpClient.layer), Layer.provide(RpcSerialization.layerJson)),
}) {}
