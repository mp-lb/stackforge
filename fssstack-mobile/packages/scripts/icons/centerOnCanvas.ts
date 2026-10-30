import sharp from "sharp";

export const centerOnCanvas = async (
  pixels: Buffer,
  bounds: { width: number; height: number },
  canvasSize: number,
  contentSize: number,
  output: string,
): Promise<void> => {
  const scale = contentSize / Math.max(bounds.width, bounds.height);

  // Match Python's ties-to-even rounding for dimensions.
  const round = (value: number) =>
    value % 1 === 0.5 ? 2 * Math.round(value / 2) : Math.round(value);

  const width = Math.max(1, round(bounds.width * scale));
  const height = Math.max(1, round(bounds.height * scale));

  const resized = await sharp(pixels, { raw: { ...bounds, channels: 4 } })
    .resize(width, height, { kernel: "lanczos3" })
    .raw()
    .toBuffer();

  const canvas = Buffer.alloc(canvasSize * canvasSize * 4);
  const left = Math.floor((canvasSize - width) / 2);
  const top = Math.floor((canvasSize - height) / 2);

  // Pillow paste(img, position, img) applies the alpha mask to all four
  // channels, including alpha itself. Preserve that feathering behavior.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = ((y + top) * canvasSize + x + left) * 4;
      for (let channel = 0; channel < 4; channel++)
        canvas[to + channel] = Math.round(
          (resized[from + channel] * resized[from + 3]) / 255,
        );
    }
  }

  await sharp(canvas, {
    raw: { width: canvasSize, height: canvasSize, channels: 4 },
  })
    .png()
    .toFile(output);
};
