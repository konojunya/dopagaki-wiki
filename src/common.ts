import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rename,
  access,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RATE = 48000,
  FPS = 30,
  SPF = RATE / FPS;
export const hash = (v: unknown) =>
  createHash("sha256")
    .update(typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v))
    .digest("hex");
export const fileHash = async (p: string) => hash(await readFile(p));
export const readJson = async (p: string) =>
  JSON.parse(await readFile(p, "utf8"));
export async function atomic(path: string, data: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
}
export const json = async (p: string, data: unknown) =>
  atomic(p, JSON.stringify(data, null, 2) + "\n");
const exec = promisify(execFile);
export async function resolveMediaBinary(
  name: "ffmpeg" | "ffprobe",
  env: NodeJS.ProcessEnv = process.env,
) {
  const override = env[`${name.toUpperCase()}_PATH`];
  const prefixes = env.HOMEBREW_PREFIX
    ? [env.HOMEBREW_PREFIX]
    : process.platform === "darwin"
      ? ["/opt/homebrew", "/usr/local"]
      : [];
  // Prefer Homebrew over PATH shims; ffmpeg-full supplies libass.
  const candidates = override
    ? [resolve(override)]
    : [
        ...prefixes.map((p) => join(p, "opt/ffmpeg-full/bin", name)),
        ...prefixes.map((p) => join(p, "opt/ffmpeg/bin", name)),
        ...prefixes.map((p) => join(p, "bin", name)),
        ...(env.PATH ?? "")
          .split(delimiter)
          .filter(Boolean)
          .map((p) => resolve(p, name)),
      ];
  for (const candidate of candidates) {
    if (
      await access(candidate, constants.X_OK).then(
        () => true,
        () => false,
      )
    )
      return candidate;
  }
  throw new Error(
    `${name} executable not found. Run brew install ffmpeg-full, or set ${name.toUpperCase()}_PATH to an executable.`,
  );
}
export async function createOutputDirectory(requested?: string) {
  const out = requested
    ? resolve(requested)
    : await mkdtemp("/tmp/dopagaki-wiki-");
  await mkdir(out, { recursive: true });
  return out;
}
export async function run(
  command: string,
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
) {
  try {
    if (command === "ffmpeg" || command === "ffprobe")
      command = await resolveMediaBinary(command);
    return await exec(command, args, {
      maxBuffer: 16 * 1024 * 1024,
      timeout: options.timeout ?? 120000,
      ...options,
    });
  } catch (e) {
    const err = e as Error & { stderr?: string };
    throw new Error(
      `${command} failed: ${(err.stderr || err.message).slice(-4000)}`,
    );
  }
}
export async function probe(path: string) {
  return JSON.parse(
    (
      await run("ffprobe", [
        "-v",
        "error",
        "-show_format",
        "-show_streams",
        "-of",
        "json",
        path,
      ])
    ).stdout,
  );
}
export const log = (s: string) => process.stderr.write(s + "\n");
