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
// Resolve the pinned runtime from the tool repository, while preserving the
// caller's working directory for relative story and output paths.
const runtime = spawnSync("aqua", ["which", "node"], {
  cwd: root,
  encoding: "utf8",
});
if (runtime.error || runtime.status !== 0 || !runtime.stdout.trim()) {
  console.error(
    `Cannot resolve the CLI's Node.js runtime. Run aqua install in "${root}".`,
  );
  console.error(runtime.error?.message ?? runtime.stderr);
  process.exit(1);
}
const result = spawnSync(
  runtime.stdout.trim(),
  [
    join(root, "node_modules/tsx/dist/cli.mjs"),
    join(root, "src/cli.ts"),
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
