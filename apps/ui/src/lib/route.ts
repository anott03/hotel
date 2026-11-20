import { useMemo, useSyncExternalStore } from "react";

export type Route =
  | { readonly page: "logs" }
  | { readonly page: "traces" }
  | { readonly page: "trace"; readonly traceId: string };

type ListPage = "logs" | "traces";

const SERVICE_PARAM = "service";

const parse = (pathname: string): Route => {
  const trace = /^\/traces\/([0-9a-f]{32})$/.exec(pathname);
  if (trace?.[1] !== undefined) return { page: "trace", traceId: trace[1] };
  if (pathname.startsWith("/traces")) return { page: "traces" };
  return { page: "logs" };
};

const lastSearch = new Map<ListPage, string>();

const rememberSearch = () => {
  const route = parse(window.location.pathname);
  if (route.page !== "trace") lastSearch.set(route.page, window.location.search);
};

rememberSearch();
window.addEventListener("popstate", rememberSearch);

const currentService = (): string =>
  new URLSearchParams(window.location.search).get(SERVICE_PARAM) ?? "";

const withSearch = (pathname: string, params: URLSearchParams): string =>
  params.size === 0 ? pathname : `${pathname}?${params.toString()}`;

const withService = (search: string, service: string): URLSearchParams => {
  const params = new URLSearchParams(search);
  if (service === "") params.delete(SERVICE_PARAM);
  else params.set(SERVICE_PARAM, service);
  return params;
};

export const hrefFor = (route: Route, service: string = currentService()): string => {
  switch (route.page) {
    case "logs":
      return withSearch("/logs", withService(lastSearch.get("logs") ?? "", service));
    case "traces":
      return withSearch("/traces", withService(lastSearch.get("traces") ?? "", service));
    case "trace":
      return withSearch(`/traces/${route.traceId}`, withService("", service));
  }
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};

const notify = () => window.dispatchEvent(new PopStateEvent("popstate"));

export const navigate = (route: Route, service?: string) => {
  window.history.pushState(null, "", hrefFor(route, service));
  notify();
};

export const useRoute = (): Route =>
  parse(useSyncExternalStore(subscribe, () => window.location.pathname));

export const useSearchParams = (): URLSearchParams => {
  const search = useSyncExternalStore(subscribe, () => window.location.search);
  return useMemo(() => new URLSearchParams(search), [search]);
};

export const replaceSearchParams = (params: URLSearchParams) => {
  window.history.replaceState(null, "", withSearch(window.location.pathname, params));
  notify();
};

export const useService = (): string => useSearchParams().get(SERVICE_PARAM) ?? "";

export const selectService = (service: string) => {
  if (parse(window.location.pathname).page === "trace") {
    navigate({ page: "traces" }, service);
    return;
  }
  replaceSearchParams(withService(window.location.search, service));
};
