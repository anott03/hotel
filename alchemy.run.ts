import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Planetscale from "@alchemy.run/planetscale";
import Collector from "@hotel/collector";
import { Website } from "@hotel/ui";
import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { IngestToken } from "./apps/collector/src/Infra.ts";

export default Alchemy.Stack(
  "Hotel",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), Planetscale.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const collector = yield* Collector;
    const ui = yield* Website;
    const token = yield* IngestToken;

    return {
      collectorUrl: collector.url.as<string>(),
      uiUrl: ui.url.as<string>(),
      ingestToken: token.text.pipe(Output.map(Redacted.value)),
    };
  }),
);
