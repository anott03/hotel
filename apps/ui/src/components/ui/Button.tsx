import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

const VARIANTS = {
  default:
    "border border-line bg-raised text-ink shadow-sticker hover:not-data-disabled:bg-highlight active:not-data-disabled:translate-y-0.5 active:not-data-disabled:shadow-none",
  ghost:
    "border border-transparent bg-transparent text-ink-soft hover:not-data-disabled:bg-raised hover:not-data-disabled:text-ink",
  link: "h-auto border-none bg-transparent px-0 text-aqua hover:not-data-disabled:underline",
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
      className={`inline-flex h-8 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap select-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent data-disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}
