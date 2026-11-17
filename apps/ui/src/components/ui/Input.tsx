import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";

export function Input(
  props: Omit<ComponentProps<typeof BaseInput>, "className"> & { readonly className?: string },
) {
  const { className = "", ...rest } = props;
  return (
    <BaseInput
      {...rest}
      className={`h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-1 focus:outline-sky-500 ${className}`}
    />
  );
}
