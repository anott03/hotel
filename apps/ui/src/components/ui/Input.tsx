import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";

export function Input(
  props: Omit<ComponentProps<typeof BaseInput>, "className"> & { readonly className?: string },
) {
  const { className = "", ...rest } = props;
  return (
    <BaseInput
      {...rest}
      className={`h-8 rounded-full border border-line bg-raised px-3.5 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:-outline-offset-1 focus:outline-accent ${className}`}
    />
  );
}
