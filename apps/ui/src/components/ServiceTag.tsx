import { serviceTone } from "../lib/tone.ts";

export function ServiceTag(props: { readonly name: string }) {
  const tone = serviceTone(props.name);
  return (
    <span
      className={`inline-block rounded-full px-2 font-medium whitespace-nowrap ${tone.tint} ${tone.text}`}
    >
      {props.name}
    </span>
  );
}
