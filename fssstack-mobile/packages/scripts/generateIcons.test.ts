import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { generateIconAssets } from "./icons/generateIconAssets";
import { extractGlyph } from "./icons/extractGlyph";
import { gradientBackground } from "./icons/gradientBackground";

test("generates six icon assets with opaque backgrounds and centered adaptive glyphs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mobile-icons-"));

  try {
    const source = join(dir, "source.png");
    const output = join(dir, "images");
    const data = Buffer.alloc(1024 * 1024 * 4);

    for (let y = 0; y < 1024; y++) {
      for (let x = 0; x < 1024; x++) {
        const offset = (y * 1024 + x) * 4;
        const glyph = x >= 400 && x < 624 && y >= 300 && y < 724;
        const shade = glyph ? 40 : 210 + Math.floor(y / 32);
        data.fill(shade, offset, offset + 3);
        data[offset + 3] = x >= 64 && x < 960 && y >= 64 && y < 960 ? 255 : 0;
      }
    }

    await sharp(data, { raw: { width: 1024, height: 1024, channels: 4 } })
      .png()
      .toFile(source);

    assert.equal(await generateIconAssets(source, output), "#E2E2E2");
    assert.deepEqual((await readdir(output)).sort(), [
      "android-icon-background.png",
      "android-icon-foreground.png",
      "android-icon-monochrome.png",
      "favicon.png",
      "icon.png",
      "splash-icon.png",
    ]);

    for (const name of await readdir(output)) {
      const result = await sharp(join(output, name))
        .raw()
        .toBuffer({ resolveWithObject: true });

      const size =
        name === "favicon.png" ? 48 : name === "splash-icon.png" ? 512 : 1024;

      assert.equal(result.info.width, size);
      assert.equal(result.info.height, size);
      const opaque = ["icon.png", "android-icon-background.png"].includes(name);
      assert.equal(result.info.channels, opaque ? 3 : 4);

      if (!opaque) {
        assert.equal(result.data[3], 0, `${name} transparent corners`);
        const center = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4;
        assert.equal(result.data[center + 3], 255, `${name} opaque center`);
        assert.equal(
          result.data[center],
          name.includes("monochrome") ? 255 : 40,
        );
      }

      if (name === "android-icon-foreground.png") {
        const alphaAt = (x: number, y: number) =>
          result.data[(y * size + x) * 4 + 3];

        assert.equal(alphaAt(512, 204), 0);
        assert.equal(alphaAt(512, 205), 255);
        assert.equal(alphaAt(512, 818), 255);
        assert.equal(alphaAt(512, 819), 0);
      }

      if (name === "android-icon-background.png") {
        assert.deepEqual([...result.data.subarray(0, 3)], [212, 212, 212]);
        assert.deepEqual(
          [...result.data.subarray(512 * 1024 * 3, 512 * 1024 * 3 + 3)],
          [226, 226, 226],
        );
      }
    }

    // Reject a bad source before overwriting existing icons.
    const icon = await readFile(join(output, "icon.png"));
    await sharp({
      create: { width: 128, height: 128, channels: 4, background: "white" },
    })
      .png()
      .toFile(source);

    await assert.rejects(generateIconAssets(source, output), /1024/);
    assert.deepEqual(await readFile(join(output, "icon.png")), icon);
    await writeFile(source, "not a PNG");
    await assert.rejects(generateIconAssets(source, output));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("glyph extraction feathers gray edges and ignores transparent dark pixels", () => {
  const source = Buffer.from([
    40, 40, 40, 199, 140, 140, 140, 255, 40, 40, 40, 255, 220, 220, 220, 255,
  ]);

  const { glyph, bounds } = extractGlyph(source, 2);
  assert.equal(glyph[3], 0);
  assert.equal(glyph[7], 127);
  assert.equal(glyph[11], 255);
  assert.equal(glyph[15], 0);
  assert.deepEqual(bounds, { left: 0, top: 0, width: 2, height: 2 });
  assert.throws(() => extractGlyph(Buffer.alloc(16, 255), 2), /no dark glyph/);
  assert.throws(
    () => gradientBackground(Buffer.alloc(16), 2, 0),
    /no opaque gradient/,
  );
});
