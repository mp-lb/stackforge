export const extractGlyph = (source: Buffer, size: number) => {
  const glyph = Buffer.alloc(source.length);
  const white = Buffer.alloc(source.length);
  let left = size,
    top = size,
    right = -1,
    bottom = -1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (source[i + 3] < 200) continue;

      const luminance =
        0.299 * source[i] + 0.587 * source[i + 1] + 0.114 * source[i + 2];

      const alpha = Math.trunc(
        Math.max(0, Math.min(1, (170 - luminance) / 60)) * 255,
      );

      if (!alpha) continue;
      source.copy(glyph, i, i, i + 3);
      glyph[i + 3] = alpha;
      white.fill(255, i, i + 3);
      white[i + 3] = alpha;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left) throw new Error("Source icon has no dark glyph");
  return {
    glyph,
    white,
    bounds: { left, top, width: right - left + 1, height: bottom - top + 1 },
  };
};
