import { useSyncExternalStore } from "react";

export type Route =
  | { readonly page: "logs" }
  | { readonly page: "traces" }
  | { readonly page: "trace"; readonly traceId: string };

const parse = (pathname: string): Route => {
  const trace = /^\/traces\/([0-9a-f]{32})$/.exec(pathname);
  if (trace?.[1] !== undefined) return { page: "trace", traceId: trace[1] };
  if (pathname.startsWith("/traces")) return { page: "traces" };
  return { page: "logs" };
};

export const hrefFor = (route: Route): string => {
  switch (route.page) {
    case "logs":
      return "/logs";
    case "traces":
      return "/traces";
    case "trace":
      return `/traces/${route.traceId}`;
  }
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};

export const navigate = (route: Route) => {
  window.history.pushState(null, "", hrefFor(route));
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export const useRoute = (): Route =>
  parse(useSyncExternalStore(subscribe, () => window.location.pathname));
