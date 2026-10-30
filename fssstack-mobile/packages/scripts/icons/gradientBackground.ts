export const gradientBackground = (
  source: Buffer,
  size: number,
  columnX: number,
) => {
  if (columnX >= size)
    throw new Error("Source icon has no gradient sample column");
  const column: (Buffer | undefined)[] = [];
  let last: Buffer | undefined;

  for (let y = 0; y < size; y++) {
    const i = (y * size + columnX) * 4;
    if (source[i + 3] > 250) last = source.subarray(i, i + 3);
    column.push(last);
  }

  let darkest = -1;
  let minimum = Infinity;

  for (let y = 0; y < size / 4; y++) {
    const color = column[y];

    if (color && color[0] + color[1] + color[2] < minimum) {
      minimum = color[0] + color[1] + color[2];
      darkest = y;
    }
  }

  if (darkest < 0)
    throw new Error("Source icon has no opaque gradient in its top quarter");
  column.fill(column[darkest], 0, darkest);
  const background = Buffer.alloc(size * size * 3);

  for (let y = 0; y < size; y++) {
    const color = column[y]!;
    for (let x = 0; x < size; x++) color.copy(background, (y * size + x) * 3);
  }

  return {
    background,
    midpoint: `#${column[Math.floor(size / 2)]!.toString("hex").toUpperCase()}`,
  };
};
