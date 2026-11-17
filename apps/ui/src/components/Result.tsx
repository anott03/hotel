import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type { ReactNode } from "react";

export function Result<A, E>(props: {
  readonly result: AsyncResult.AsyncResult<A, E>;
  readonly children: (value: A) => ReactNode;
  readonly onFailure?: (error: E) => ReactNode;
}) {
  return AsyncResult.match(props.result, {
    onInitial: () => <p className="p-4 text-sm text-zinc-500">Loading…</p>,
    onFailure: (failure) => {
      const error = Cause.findErrorOption(failure.cause);
      if (error._tag === "Some" && props.onFailure !== undefined)
        return props.onFailure(error.value);
      return (
        <pre className="m-4 rounded border border-red-900 bg-red-950/40 p-3 text-xs whitespace-pre-wrap text-red-300">
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
