import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { LogsPage } from "./features/logs/LogsPage.tsx";
import { TracePage } from "./features/traces/TracePage.tsx";
import { TracesPage } from "./features/traces/TracesPage.tsx";
import { navigate, useRoute } from "./lib/route.ts";

type Section = "logs" | "traces";

const SECTIONS: ReadonlyArray<{ readonly id: Section; readonly label: string }> = [
  { id: "logs", label: "Logs" },
  { id: "traces", label: "Traces" },
];

export function App() {
  const route = useRoute();
  const section: Section = route.page === "logs" ? "logs" : "traces";
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-6 border-b border-zinc-800 px-4 py-2">
        <span className="font-semibold tracking-tight">hotel</span>
        <ToggleGroup
          aria-label="Section"
          value={[section]}
          onValueChange={(value: Section[]) => {
            const next = value[0];
            if (next !== undefined) navigate({ page: next });
          }}
          className="flex gap-1"
        >
          {SECTIONS.map((item) => (
            <Toggle
              key={item.id}
              value={item.id}
              className="rounded px-3 py-1 text-sm text-zinc-400 select-none hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-sky-500 data-pressed:bg-zinc-800 data-pressed:text-zinc-100"
            >
              {item.label}
            </Toggle>
          ))}
        </ToggleGroup>
      </header>
      <main className="min-h-0 flex-1">
        {route.page === "logs" && <LogsPage />}
        {route.page === "traces" && <TracesPage />}
        {route.page === "trace" && <TracePage traceId={route.traceId} />}
      </main>
    </div>
  );
}
