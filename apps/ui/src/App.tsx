import { LogsPage } from "./features/logs/LogsPage.tsx";
import { TracePage } from "./features/traces/TracePage.tsx";
import { TracesPage } from "./features/traces/TracesPage.tsx";
import { navigate, useRoute, type Route } from "./lib/route.ts";

const NAV: ReadonlyArray<{ readonly label: string; readonly route: Route }> = [
  { label: "Logs", route: { page: "logs" } },
  { label: "Traces", route: { page: "traces" } },
];

export function App() {
  const route = useRoute();
  const section = route.page === "trace" ? "traces" : route.page;
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-6 border-b border-zinc-800 px-4 py-2">
        <span className="font-semibold tracking-tight">hotel</span>
        <nav className="flex gap-1">
          {NAV.map((item) => (
            <button
              key={item.label}
              className={`rounded px-3 py-1 text-sm ${
                section === item.route.page
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
              onClick={() => navigate(item.route)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="min-h-0 flex-1">
        {route.page === "logs" && <LogsPage />}
        {route.page === "traces" && <TracesPage />}
        {route.page === "trace" && <TracePage traceId={route.traceId} />}
      </main>
    </div>
  );
}
