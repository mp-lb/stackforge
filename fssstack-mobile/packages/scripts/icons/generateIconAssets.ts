import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { extractGlyph } from "./extractGlyph";
import { gradientBackground } from "./gradientBackground";
import { centerOnCanvas } from "./centerOnCanvas";

export const generateIconAssets = async (
  source: string,
  output: string,
): Promise<string> => {
  const { data, info } = await sharp(source)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const size = 1024;
  if (info.width !== size || info.height !== size)
    throw new Error("Source icon must be 1024×1024 pixels");

  let inset = 0;
  while (inset < size / 2 && data[(inset * size + inset) * 4 + 3] <= 250)
    inset++;
  inset += 4;
  if (inset >= size / 2) throw new Error("Source icon has no opaque interior");

  const raw = { width: size, height: size, channels: 4 as const };
  const { glyph, white, bounds } = extractGlyph(data, size);
  const { background, midpoint } = gradientBackground(data, size, inset + 40);
  await mkdir(output, { recursive: true });
  await sharp(data, { raw })
    .extract({
      left: inset,
      top: inset,
      width: size - inset * 2,
      height: size - inset * 2,
    })
    .resize(size, size, { kernel: "lanczos3" })
    .removeAlpha()
    .png()
    .toFile(join(output, "icon.png"));

  const cropped = await sharp(glyph, { raw }).extract(bounds).raw().toBuffer();

  const monochrome = await sharp(white, { raw })
    .extract(bounds)
    .raw()
    .toBuffer();

  await centerOnCanvas(
    cropped,
    bounds,
    size,
    Math.trunc(size * 0.6),
    join(output, "android-icon-foreground.png"),
  );

  await centerOnCanvas(
    monochrome,
    bounds,
    size,
    Math.trunc(size * 0.6),
    join(output, "android-icon-monochrome.png"),
  );

  await centerOnCanvas(
    cropped,
    bounds,
    512,
    Math.trunc(512 * 0.85),
    join(output, "splash-icon.png"),
  );

  await sharp(background, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toFile(join(output, "android-icon-background.png"));

  await sharp(data, { raw })
    .resize(48, 48, { kernel: "lanczos3" })
    .png()
    .toFile(join(output, "favicon.png"));

  return midpoint;
};
