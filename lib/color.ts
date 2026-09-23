export type ColorResult = "normal" | "alert" | "uncertain";

/** Classifies a photographed patch, not the temperature of the shipment. */
export function classifyColor(sample: string, intact: string, activated: string): ColorResult {
  const valid = /^#[\da-f]{6}$/i;
  if (![sample, intact, activated].every(color => valid.test(color))) return "uncertain";
  const rgb = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const [r, g, b] = rgb(sample);
  const maximum = Math.max(r, g, b), minimum = Math.min(r, g, b);
  const difference = maximum - minimum;
  // Hue wraps around at 0°: both scarlet and magenta-leaning reds are included.
  const hue = difference === 0 ? 0 : maximum === r
    ? ((g - b) / difference + 6) % 6 * 60
    : maximum === g ? ((b - r) / difference + 2) * 60
    : ((r - g) / difference + 4) * 60;
  const saturation = maximum === 0 ? 0 : difference / maximum;
  const red = (hue <= 25 || hue >= 335) && saturation >= 0.035 && r - Math.max(g, b) >= 9 && maximum >= 20;
  if (red) return "alert";
  const original = rgb(intact);
  const distance = Math.hypot(...original.map((channel, index) => [r, g, b][index] - channel));
  // A non-red shade far from the intact reference is ambiguous, never "normal".
  return distance <= 90 ? "normal" : "uncertain";
}
