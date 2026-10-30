import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const log = process.env.CONTEXT_TEST_LOG;
if (!log)
  throw new Error("The compiler mock requires an isolated test fixture.");
const args = process.argv.slice(2);
if (args[0] !== "-y" || args[1] !== "@mp-lb/mdcompile")
  throw new Error("Unexpected compiler command");
appendFileSync(log, `${JSON.stringify(args)}\n`);
writeFileSync(args[args.indexOf("-o") + 1], readFileSync(args[2]));
