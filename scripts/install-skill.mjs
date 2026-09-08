import { mkdir, symlink, lstat, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "skills/dopagaki-wiki"),
  target = join(
    process.env.CODEX_HOME ?? join(homedir(), ".codex"),
    "skills/dopagaki-wiki",
  );
await mkdir(dirname(target), { recursive: true });
const existing = await lstat(target).catch(() => null);
if (existing) {
  if ((await realpath(target)) === source) {
    console.log(`Already installed: ${target}`);
    process.exit(0);
  }
  throw new Error(
    `Existing skill at ${target}; refusing to overwrite. Move it deliberately before installing.`,
  );
}
await symlink(source, target, "dir");
console.log(`Installed: ${target} -> ${source}`);
