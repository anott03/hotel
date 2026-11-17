import type { Span } from "@hotel/api";

export interface WaterfallRow {
  readonly span: Span;
  readonly depth: number;
  readonly offsetPct: number;
  readonly widthPct: number;
}

export const buildWaterfall = (spans: ReadonlyArray<Span>): ReadonlyArray<WaterfallRow> => {
  if (spans.length === 0) return [];
  const traceStart = Math.min(...spans.map((span) => span.startTime.getTime()));
  const traceEnd = Math.max(...spans.map((span) => span.startTime.getTime() + span.durationMs));
  const total = Math.max(traceEnd - traceStart, 1);

  const ids = new Set(spans.map((span) => span.spanId));
  const children = new Map<string | null, Array<Span>>();
  for (const span of spans) {
    const parent =
      span.parentSpanId !== null && ids.has(span.parentSpanId) ? span.parentSpanId : null;
    const siblings = children.get(parent) ?? [];
    siblings.push(span);
    children.set(parent, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  const rows: Array<WaterfallRow> = [];
  const visit = (parent: string | null, depth: number) => {
    for (const span of children.get(parent) ?? []) {
      rows.push({
        span,
        depth,
        offsetPct: ((span.startTime.getTime() - traceStart) / total) * 100,
        widthPct: Math.max((span.durationMs / total) * 100, 0.3),
      });
      visit(span.spanId, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
};
