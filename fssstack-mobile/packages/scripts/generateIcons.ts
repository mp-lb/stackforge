import { resolve } from "node:path";
import { generateIconAssets } from "./icons/generateIconAssets";

const [source, output = "assets/images", ...extra] = process.argv.slice(2);

if (!source || extra.length) {
  console.error(
    "Usage: zap t mobile-generate-icons -- <source.png> [output-directory]",
  );

  process.exitCode = 1;
} else {
  const midpoint = await generateIconAssets(resolve(source), resolve(output));
  console.log(`done; gradient midpoint ${midpoint}`);
}
