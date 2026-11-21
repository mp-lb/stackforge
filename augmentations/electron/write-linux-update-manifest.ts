// Source: MapLab Tools, packages/arcnet/src/desktop/writeLinuxUpdateManifest.ts.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";

const updateFile = z.object({
  url: z.string(),
  size: z.number().int().positive(),
  sha512: z.string(),
});

const updateManifest = z.object({
  version: z.string(),
  releaseDate: z.string(),
  files: z.array(updateFile),
});

const writeLinuxUpdateManifest = async ({
  deb,
  rpm,
  output,
}: {
  deb: string;
  rpm: string;
  output: string;
}) => {
  const readPackage = async (extension: string, path: string) => {
    if (!path.endsWith(extension))
      throw new Error(`Expected a ${extension} installer: ${path}`);

    const manifest = updateManifest.parse(
      parse(await readFile(join(dirname(path), "latest-linux.yml"), "utf8")),
    );
    const name = basename(path);
    const file = manifest.files.find(({ url }) => url === name);
    if (!file) throw new Error(`Missing update metadata for ${name}`);

    const hash = createHash("sha512");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    if (
      hash.digest("base64") !== file.sha512 ||
      (await stat(path)).size !== file.size
    )
      throw new Error(`Update metadata does not match ${name}`);

    return { manifest, file };
  };

  const [debian, redhat] = await Promise.all([
    readPackage(".deb", deb),
    readPackage(".rpm", rpm),
  ]);
  if (debian.manifest.version !== redhat.manifest.version)
    throw new Error("Linux installers have different versions.");

  const files = [debian.file, redhat.file];

  await writeFile(
    output,
    stringify({
      version: debian.manifest.version,
      files,
      path: debian.file.url,
      sha512: debian.file.sha512,
      releaseDate: debian.manifest.releaseDate,
    }),
  );

  return {
    operation: "desktop.linux-manifest",
    path: output,
    assets: files.map(({ url }) => url),
  };
};

const [deb, rpm, output] = process.argv.slice(2);
if (!deb || !rpm || !output)
  throw new Error("Pass the DEB path, RPM path, and combined manifest path.");

void writeLinuxUpdateManifest({ deb, rpm, output }).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
