import type { WebsiteEnv } from "../Website.ts";

const isRpcPath = (pathname: string) => pathname === "/rpc" || pathname.startsWith("/rpc/");

export default {
  async fetch(request: Request, env: WebsiteEnv): Promise<Response> {
    const url = new URL(request.url);
    if (isRpcPath(url.pathname)) return env.API.fetch(request);
    return env.ASSETS.fetch(request);
  },
};
