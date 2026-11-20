export function ServiceTag(props: { readonly name: string }) {
  return (
    <span
      title={props.name}
      className="inline-block max-w-48 truncate rounded-full bg-highlight px-2 align-bottom font-medium whitespace-nowrap text-ink-soft"
    >
      {props.name}
    </span>
  );
}
