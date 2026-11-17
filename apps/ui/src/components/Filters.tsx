import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import type { ReactNode } from "react";
import { RANGE_PRESETS, rangeFor, type RangePresetId } from "../lib/time.ts";
import { TelemetryClient } from "../rpc/client.ts";
import { Button, RefreshIcon, Select } from "./ui/index.ts";

const servicesAtom = Atom.family((preset: RangePresetId) =>
  TelemetryClient.query("listServices", { range: rangeFor(preset) }, { timeToLive: "1 minute" }),
);

const RANGE_OPTIONS = RANGE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }));

export function FilterBar(props: { readonly children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-3">
      {props.children}
    </div>
  );
}

export function RangeSelect(props: {
  readonly value: RangePresetId;
  readonly onChange: (value: RangePresetId) => void;
}) {
  return (
    <Select
      label="Time range"
      value={props.value}
      options={RANGE_OPTIONS}
      onChange={props.onChange}
    />
  );
}

export function ServiceSelect(props: {
  readonly range: RangePresetId;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const services = AsyncResult.getOrElse(useAtomValue(servicesAtom(props.range)), () => []);
  const options = [
    { value: "", label: "All services" },
    ...services.map((service) => ({ value: service, label: service })),
  ];
  return <Select label="Service" value={props.value} options={options} onChange={props.onChange} />;
}

export function RefreshButton(props: { readonly onClick: () => void }) {
  return (
    <Button aria-label="Refresh" onClick={props.onClick} className="ml-auto">
      <RefreshIcon />
      Refresh
    </Button>
  );
}
