import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { useId } from "react";
import { MinusIcon, PlusIcon } from "./icons.tsx";

const STEPPER =
  "flex h-full w-8 items-center justify-center border border-line bg-raised text-ink-soft select-none hover:not-data-disabled:bg-highlight hover:not-data-disabled:text-ink";

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
      <label htmlFor={id} className="text-sm whitespace-nowrap text-ink-soft">
        {props.label}
      </label>
      <BaseNumberField.Group className="flex h-8">
        <BaseNumberField.Decrement className={`${STEPPER} rounded-l-full border-r-0 pl-1`}>
          <MinusIcon />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input className="h-full w-[8ch] border border-line bg-raised px-2 text-sm text-ink tabular-nums focus:z-1 focus:outline-2 focus:-outline-offset-1 focus:outline-accent" />
        <BaseNumberField.Increment className={`${STEPPER} rounded-r-full border-l-0 pr-1`}>
          <PlusIcon />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}
