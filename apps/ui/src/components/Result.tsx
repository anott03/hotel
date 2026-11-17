import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type { ReactNode } from "react";

export function Result<A, E>(props: {
  readonly result: AsyncResult.AsyncResult<A, E>;
  readonly children: (value: A) => ReactNode;
  readonly onFailure?: (error: E) => ReactNode;
}) {
  return AsyncResult.match(props.result, {
    onInitial: () => (
      <p className="flex items-center gap-2.5 p-4 text-sm text-ink-faint">
        <span aria-hidden className="flex gap-1">
          <span className="size-2 rounded-full bg-lemon motion-safe:animate-hop" />
          <span className="size-2 rounded-full bg-mint [animation-delay:150ms] motion-safe:animate-hop" />
          <span className="size-2 rounded-full bg-bubblegum [animation-delay:300ms] motion-safe:animate-hop" />
        </span>
        Loading…
      </p>
    ),
    onFailure: (failure) => {
      const error = Cause.findErrorOption(failure.cause);
      if (error._tag === "Some" && props.onFailure !== undefined)
        return props.onFailure(error.value);
      return (
        <pre className="m-4 rounded-2xl border border-cherry/40 bg-cherry/10 px-4 py-3 text-xs whitespace-pre-wrap text-cherry">
          {Cause.pretty(failure.cause)}
        </pre>
      );
    },
    onSuccess: (success) => (
      <div className={success.waiting ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {props.children(success.value)}
      </div>
    ),
  });
}
