const TONES = [
  { text: "text-lemon", tint: "bg-lemon/15", fill: "bg-lemon" },
  { text: "text-kiwi", tint: "bg-kiwi/15", fill: "bg-kiwi" },
  { text: "text-mint", tint: "bg-mint/15", fill: "bg-mint" },
  { text: "text-aqua", tint: "bg-aqua/15", fill: "bg-aqua" },
  { text: "text-blueberry", tint: "bg-blueberry/15", fill: "bg-blueberry" },
  { text: "text-grape", tint: "bg-grape/15", fill: "bg-grape" },
  { text: "text-bubblegum", tint: "bg-bubblegum/15", fill: "bg-bubblegum" },
] as const;

export type Tone = (typeof TONES)[number];

export const toneFor = (name: string): Tone => {
  let hash = 2166136261;
  for (let index = 0; index < name.length; index++) {
    hash = Math.imul(hash ^ name.charCodeAt(index), 16777619) >>> 0;
  }
  return TONES[hash % TONES.length] ?? TONES[0];
};
