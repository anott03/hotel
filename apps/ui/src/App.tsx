import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { ServiceSelect } from "./components/Filters.tsx";
import { LogsPage } from "./features/logs/LogsPage.tsx";
import { TracePage } from "./features/traces/TracePage.tsx";
import { TracesPage } from "./features/traces/TracesPage.tsx";
import { navigate, selectService, useRoute, useService } from "./lib/route.ts";

type Section = "logs" | "traces";

const SECTIONS: ReadonlyArray<{ readonly id: Section; readonly label: string }> = [
  { id: "logs", label: "Logs" },
  { id: "traces", label: "Traces" },
];

const WORDMARK = [
  { letter: "h", className: "text-cherry" },
  { letter: "o", className: "text-tangerine" },
  { letter: "t", className: "text-lemon" },
  { letter: "e", className: "text-kiwi" },
  { letter: "l", className: "text-aqua" },
] as const;

export function App() {
  const route = useRoute();
  const service = useService();
  const section: Section = route.page === "logs" ? "logs" : "traces";
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-6 px-4 py-2">
        <span className="text-2xl font-black tracking-tight">
          <span className="sr-only">hotel</span>
          {WORDMARK.map((item) => (
            <span key={item.letter} aria-hidden className={item.className}>
              {item.letter}
            </span>
          ))}
        </span>
        <ServiceSelect value={service} onChange={selectService} />
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
              className="rounded-full px-3.5 py-1 text-sm font-medium text-ink-soft select-none not-data-pressed:hover:bg-raised not-data-pressed:hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-pressed:bg-accent data-pressed:text-canvas"
            >
              {item.label}
            </Toggle>
          ))}
        </ToggleGroup>
      </header>
      <div aria-hidden className="h-1 shrink-0 bg-rainbow" />
      <main className="min-h-0 flex-1">
        {route.page === "logs" && <LogsPage />}
        {route.page === "traces" && <TracesPage />}
        {route.page === "trace" && <TracePage traceId={route.traceId} />}
      </main>
    </div>
  );
}
