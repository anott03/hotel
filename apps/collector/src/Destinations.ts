import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { IngestToken, LIVE_STAGE } from "./Infra.ts";

const TRACES_DESTINATION_ID = "CollectorTracesDestination";
const LOGS_DESTINATION_ID = "CollectorLogsDestination";

const destinationSlug = (id: string) =>
  Output.map(
    Output.of(
      Alchemy.ref<Cloudflare.Workers.ObservabilityDestination>(id, { stage: LIVE_STAGE }),
    ),
    (destination) => destination.slug,
  );

export const exportToCollector = {
  enabled: true,
  traces: {
    enabled: true,
    destinations: [destinationSlug(TRACES_DESTINATION_ID)],
  },
  logs: {
    enabled: true,
    invocationLogs: false,
    destinations: [destinationSlug(LOGS_DESTINATION_ID)],
  },
};

export const CollectorDestinations = (collectorUrl: Output.Output<string>) =>
  Effect.gen(function* () {
    if (yield* Alchemy.ALCHEMY_DEV) return;

    const token = yield* IngestToken;
    const headers = {
      authorization: Output.map(token.text, (text) =>
        Redacted.make(`Bearer ${Redacted.value(text)}`),
      ),
    };

    yield* Cloudflare.Workers.ObservabilityDestination(TRACES_DESTINATION_ID, {
      url: Output.map(collectorUrl, (url) => `${url}/v1/traces`),
      headers,
      logpushDataset: "opentelemetry-traces",
      skipPreflightCheck: true,
    });
    yield* Cloudflare.Workers.ObservabilityDestination(LOGS_DESTINATION_ID, {
      url: Output.map(collectorUrl, (url) => `${url}/v1/logs`),
      headers,
      logpushDataset: "opentelemetry-logs",
      skipPreflightCheck: true,
    });
  });
