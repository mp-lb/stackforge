import { writeFile } from "node:fs/promises";
import { render } from "./configure";

try {
  const result = render(process.argv.slice(2));
  if (result.output) {
    // Do not silently replace an existing manifest or prompt.
    await writeFile(result.output, result.text, { flag: "wx" });
    process.stderr.write(`Wrote ${result.output}\n`);
  } else {
    process.stdout.write(result.text);
  }
} catch (error) {
  process.stderr.write(
    `fssstack: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
