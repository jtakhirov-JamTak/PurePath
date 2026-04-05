/** Format "HH:MM" → compact 12h like "2:30p" or "8a" */
export function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h >= 12 ? "p" : "a";
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}
