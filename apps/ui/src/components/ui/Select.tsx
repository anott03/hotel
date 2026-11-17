import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretUpDownIcon, CheckIcon } from "./icons.tsx";

export interface SelectOption<Value> {
  readonly value: Value;
  readonly label: string;
}

export function Select<Value>(props: {
  readonly label: string;
  readonly value: Value;
  readonly options: ReadonlyArray<SelectOption<Value>>;
  readonly onChange: (value: Value) => void;
  readonly className?: string;
}) {
  return (
    <BaseSelect.Root
      items={props.options}
      value={props.value}
      onValueChange={(value) => {
        if (value !== null) props.onChange(value);
      }}
    >
      <BaseSelect.Trigger
        aria-label={props.label}
        className={`flex h-8 min-w-36 items-center justify-between gap-3 rounded border border-zinc-700 bg-zinc-900 pr-1.5 pl-2.5 text-sm whitespace-nowrap text-zinc-100 select-none hover:bg-zinc-800 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-sky-500 data-popup-open:bg-zinc-800 ${props.className ?? ""}`}
      >
        <BaseSelect.Value />
        <BaseSelect.Icon className="text-zinc-500">
          <CaretUpDownIcon />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-10 outline-none select-none" sideOffset={4}>
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded border border-zinc-700 bg-zinc-900 py-1 text-zinc-100 shadow-lg shadow-black/40 outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-[side=none]:data-ending-style:transition-none data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 data-[side=none]:data-starting-style:transition-none">
            <BaseSelect.List className="max-h-[var(--available-height)] overflow-y-auto">
              {props.options.map((option) => (
                <BaseSelect.Item
                  key={option.label}
                  value={option.value}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 py-1.5 pr-4 pl-2.5 text-sm outline-none select-none data-highlighted:bg-zinc-800"
                >
                  <BaseSelect.ItemIndicator className="col-start-1 text-sky-400">
                    <CheckIcon />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="col-start-2">{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
