#!/usr/bin/env node
import { realpathSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(
  dirname(realpathSync(fileURLToPath(import.meta.url))),
  "../../..",
);
if (!existsSync(join(root, "node_modules/tsx/dist/cli.mjs"))) {
  console.error(
    `Dependencies missing. Run: cd "${root}" && aqua install && npm ci && npm run setup`,
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    join(root, "node_modules/tsx/dist/cli.mjs"),
    join(root, "src/cli.ts"),
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
