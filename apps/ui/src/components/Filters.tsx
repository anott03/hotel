import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import type { ReactNode } from "react";
import { RANGE_PRESETS, rangeFor, type RangePresetId } from "../lib/time.ts";
import { TelemetryClient } from "../rpc/client.ts";

const servicesAtom = Atom.family((preset: RangePresetId) =>
  TelemetryClient.query("listServices", { range: rangeFor(preset) }, { timeToLive: "1 minute" }),
);

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
    <select
      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
      value={props.value}
      onChange={(event) => {
        const preset = RANGE_PRESETS.find((candidate) => candidate.id === event.target.value);
        if (preset !== undefined) props.onChange(preset.id);
      }}
    >
      {RANGE_PRESETS.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.label}
        </option>
      ))}
    </select>
  );
}

export function ServiceSelect(props: {
  readonly range: RangePresetId;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const services = AsyncResult.getOrElse(useAtomValue(servicesAtom(props.range)), () => []);
  return (
    <select
      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    >
      <option value="">All services</option>
      {services.map((service) => (
        <option key={service} value={service}>
          {service}
        </option>
      ))}
    </select>
  );
}
