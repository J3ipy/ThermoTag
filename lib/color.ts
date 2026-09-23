export type ColorResult = "normal" | "alert" | "uncertain";

export function classifyColor(sample: string, intact: string, activated: string): ColorResult {
  const rgb = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const distance = (left: string, right: string) => {
    const a = rgb(left), b = rgb(right);
    return Math.sqrt(a.reduce((sum, channel, index) => sum + (channel - b[index]) ** 2, 0));
  };
  if (![sample, intact, activated].every(color => /^#[\da-f]{6}$/i.test(color))) return "uncertain";
  const toIntact = distance(sample, intact);
  const toActivated = distance(sample, activated);
  if (Math.min(toIntact, toActivated) > 90 || Math.abs(toIntact - toActivated) < 35) return "uncertain";
  return toIntact < toActivated ? "normal" : "alert";
}
