import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckIcon } from "./icons.tsx";

export function Checkbox(props: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft select-none">
      <BaseCheckbox.Root
        checked={props.checked}
        onCheckedChange={props.onChange}
        className="flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-ink-faint bg-raised text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-checked:border-accent data-checked:bg-accent"
      >
        <BaseCheckbox.Indicator className="flex data-unchecked:hidden">
          <CheckIcon />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {props.label}
    </label>
  );
}
