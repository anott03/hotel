import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

const VARIANTS = {
  default:
    "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:not-data-disabled:bg-zinc-800 active:not-data-disabled:bg-zinc-700",
  ghost:
    "border border-transparent bg-transparent text-zinc-400 hover:not-data-disabled:bg-zinc-900 hover:not-data-disabled:text-zinc-100",
  link: "h-auto border-none bg-transparent px-0 text-sky-400 hover:not-data-disabled:underline",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function Button(
  props: Omit<ComponentProps<typeof BaseButton>, "className"> & {
    readonly variant?: ButtonVariant;
    readonly className?: string;
  },
) {
  const { variant = "default", className = "", ...rest } = props;
  return (
    <BaseButton
      {...rest}
      className={`inline-flex h-8 items-center justify-center gap-2 rounded px-3 text-sm whitespace-nowrap select-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-sky-500 data-disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}
