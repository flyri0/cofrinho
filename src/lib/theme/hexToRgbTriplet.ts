// Converts '#rrggbb' into the space-separated "r g b" triplet format Tailwind
// expects for an opacity-modifier-compatible CSS variable color, e.g.
// `rgb(var(--color-accent) / <alpha-value>)` so utilities like `bg-accent/10`
// work. See tailwind.config.js.
export function hexToRgbTriplet(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
