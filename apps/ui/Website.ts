import * as Cloudflare from "@alchemy.run/cloudflare";
import Api from "@hotel/api-worker";

export const Website = Cloudflare.Website.Vite("Ui", {
  rootDir: import.meta.dirname,
  main: "worker/index.ts",
  domain: "hotel.amitav.dev",
  workersDev: false,
  assets: {
    notFoundHandling: "single-page-application",
    runWorkerFirst: ["/rpc", "/rpc/*"],
  },
  access: {
    policies: [{ decision: "allow", include: [{ email: { email: "amitavn@pm.me" } }] }],
  },
  env: { API: Api },
  memo: {
    include: [
      "src/**",
      "worker/**",
      "index.html",
      "package.json",
      "vite.config.ts",
      "../../packages/api/src/**",
    ],
    lockfile: true,
  },
});

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;
