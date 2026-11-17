import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { useId } from "react";
import { MinusIcon, PlusIcon } from "./icons.tsx";

const STEPPER =
  "flex h-full w-7 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-400 select-none hover:not-data-disabled:bg-zinc-800 hover:not-data-disabled:text-zinc-100";

export function NumberField(props: {
  readonly label: string;
  readonly value: number;
  readonly min?: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <BaseNumberField.Root
      id={id}
      value={props.value}
      min={props.min}
      step={props.step}
      onValueChange={(value) => props.onChange(value ?? 0)}
      className="flex items-center gap-2"
    >
      <label htmlFor={id} className="text-sm whitespace-nowrap text-zinc-400">
        {props.label}
      </label>
      <BaseNumberField.Group className="flex h-8">
        <BaseNumberField.Decrement className={`${STEPPER} rounded-l border-r-0`}>
          <MinusIcon />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input className="h-full w-[8ch] border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100 tabular-nums focus:z-1 focus:outline-2 focus:-outline-offset-1 focus:outline-sky-500" />
        <BaseNumberField.Increment className={`${STEPPER} rounded-r border-l-0`}>
          <PlusIcon />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}
