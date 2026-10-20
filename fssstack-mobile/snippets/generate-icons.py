#!/usr/bin/env python3
"""Regenerate app icon assets from a single squircle source icon.

Usage: python3 scripts/generate-icons.py <source.png>

The source is a 1024x1024 desktop-style icon: light gradient background,
dark glyph, rounded corners baked into the alpha channel. Outputs:

  icon.png                    full-bleed square (corners cropped off), no alpha
  android-icon-foreground.png dark glyph on transparency, sized to safe zone
  android-icon-monochrome.png same silhouette in white
  android-icon-background.png glyph-free vertical gradient
  splash-icon.png             512px glyph on transparency
  favicon.png                 48px resize of the source
"""

import sys

from PIL import Image

SRC = sys.argv[1]
OUT = "assets/images"
SIZE = 1024

src = Image.open(SRC).convert("RGBA")
assert src.size == (SIZE, SIZE), src.size
alpha = src.getchannel("A")

# --- iOS icon: crop until the diagonal corners are opaque, then rescale.
inset = next(k for k in range(SIZE // 2) if alpha.getpixel((k, k)) > 250)
inset += 4  # past the antialiased rim
ios = src.crop((inset, inset, SIZE - inset, SIZE - inset))
ios = ios.resize((SIZE, SIZE), Image.LANCZOS).convert("RGB")
ios.save(f"{OUT}/icon.png")

# --- Glyph mask: the mark is the only dark content on the light gradient.
def luminance(px):
    r, g, b, a = px
    return 0.299 * r + 0.587 * g + 0.114 * b

glyph = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
mask = Image.new("L", (SIZE, SIZE), 0)
for y in range(SIZE):
    for x in range(SIZE):
        px = src.getpixel((x, y))
        if px[3] < 200:
            continue
        lum = luminance(px)
        # feather between fully-glyph (<110) and fully-background (>170)
        a = int(max(0.0, min(1.0, (170 - lum) / 60)) * 255)
        if a:
            glyph.putpixel((x, y), (px[0], px[1], px[2], a))
            mask.putpixel((x, y), a)

bbox = mask.getbbox()
glyph_cropped = glyph.crop(bbox)

def center_on_canvas(img, canvas_px, content_px):
    w, h = img.size
    scale = content_px / max(w, h)
    img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
    canvas.paste(img, ((canvas_px - img.width) // 2, (canvas_px - img.height) // 2), img)
    return canvas

# Adaptive icon safe zone is the central 66%; stay a touch inside it.
center_on_canvas(glyph_cropped, SIZE, int(SIZE * 0.60)).save(
    f"{OUT}/android-icon-foreground.png"
)

white = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
white.putalpha(mask)
center_on_canvas(white.crop(bbox), SIZE, int(SIZE * 0.60)).save(
    f"{OUT}/android-icon-monochrome.png"
)

center_on_canvas(glyph_cropped, 512, int(512 * 0.85)).save(f"{OUT}/splash-icon.png")

# --- Background: sample the gradient down a glyph-free column, clamping to
# the nearest opaque row so the rounded corners don't bleed transparency in.
col_x = inset + 40
column = []
last = None
for y in range(SIZE):
    px = src.getpixel((col_x, y))
    if px[3] > 250:
        last = px[:3]
    column.append(last)
# The gradient darkens toward the top, but the icon's edge highlight rim is
# lighter: extend everything above the darkest row in the top quarter with
# that row's color so the rim doesn't leave a pale band.
darkest = min(
    (y for y in range(SIZE // 4) if column[y] is not None),
    key=lambda y: sum(column[y]),
)
for y in range(darkest):
    column[y] = column[darkest]
bg = Image.new("RGB", (SIZE, SIZE))
for y in range(SIZE):
    for x in range(SIZE):
        bg.putpixel((x, y), column[y])
bg.save(f"{OUT}/android-icon-background.png")

src.resize((48, 48), Image.LANCZOS).save(f"{OUT}/favicon.png")

mid = column[SIZE // 2]
print(f"done; gradient midpoint #{mid[0]:02X}{mid[1]:02X}{mid[2]:02X}")
