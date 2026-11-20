import type { TimeRange } from "@hotel/api";

export const RANGE_PRESETS = [
  { id: "15m", label: "Last 15 minutes", minutes: 15 },
  { id: "1h", label: "Last hour", minutes: 60 },
  { id: "6h", label: "Last 6 hours", minutes: 360 },
  { id: "24h", label: "Last 24 hours", minutes: 1440 },
  { id: "7d", label: "Last 7 days", minutes: 10080 },
] as const;

export type RangePresetId = (typeof RANGE_PRESETS)[number]["id"];

export const DEFAULT_RANGE: RangePresetId = "1h";

export const parseRangePreset = (value: string | null): RangePresetId =>
  RANGE_PRESETS.find((preset) => preset.id === value)?.id ?? DEFAULT_RANGE;

export const rangeFor = (id: RangePresetId, now: Date = new Date()): TimeRange => {
  const preset = RANGE_PRESETS.find((candidate) => candidate.id === id) ?? RANGE_PRESETS[1];
  return { from: new Date(now.getTime() - preset.minutes * 60_000), to: now };
};

export const formatTimestamp = (date: Date): string =>
  date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  });

export const formatDuration = (ms: number): string => {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(ms < 10 ? 2 : 0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};
