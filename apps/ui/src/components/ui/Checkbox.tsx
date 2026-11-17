import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckIcon } from "./icons.tsx";

export function Checkbox(props: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-400 select-none">
      <BaseCheckbox.Root
        checked={props.checked}
        onCheckedChange={props.onChange}
        className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-zinc-600 bg-zinc-900 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 data-checked:border-sky-500 data-checked:bg-sky-500"
      >
        <BaseCheckbox.Indicator className="flex data-unchecked:hidden">
          <CheckIcon />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {props.label}
    </label>
  );
}
