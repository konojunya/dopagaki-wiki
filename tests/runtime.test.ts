import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, isAbsolute } from "node:path";
import {
  createOutputDirectory,
  resolveMediaBinary,
  ROOT,
} from "../src/common.js";

test("global launcher uses its Node runtime without a manager on PATH and preserves relative input paths", async () => {
  const tmp = await mkdtemp("/tmp/dopagaki-launcher-");
  try {
    await copyFile(
      join(ROOT, "examples/minimal.story.json"),
      join(tmp, "story.json"),
    );
    const result = spawnSync(
      process.execPath,
      [
        join(ROOT, "skills/dopagaki-wiki/scripts/run.mjs"),
        "validate",
        "story.json",
      ],
      { cwd: tmp, env: { ...process.env, PATH: "" }, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).passed, true);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("media resolution uses Homebrew before a stale PATH shim, with explicit overrides", async () => {
  const tmp = await mkdtemp("/tmp/dopagaki-runtime-");
  try {
    const prefix = join(tmp, "brew"),
      path = join(tmp, "path");
    const full = join(prefix, "opt/ffmpeg-full/bin");
    for (const dir of [full, path]) {
      await mkdir(dir, { recursive: true });
      for (const name of ["ffmpeg", "ffprobe"] as const) {
        await writeFile(join(dir, name), "#!/bin/sh\nexit 0\n");
        await chmod(join(dir, name), 0o755);
      }
    }
    const env = { HOMEBREW_PREFIX: prefix, PATH: path };
    for (const name of ["ffmpeg", "ffprobe"] as const)
      assert.equal(await resolveMediaBinary(name, env), join(full, name));
    assert.equal(
      await resolveMediaBinary("ffmpeg", {
        ...env,
        FFMPEG_PATH: join(path, "ffmpeg"),
      }),
      join(path, "ffmpeg"),
    );
    await assert.rejects(
      resolveMediaBinary("ffmpeg", {
        ...env,
        FFMPEG_PATH: join(tmp, "missing"),
      }),
      /executable not found/,
    );
    await rm(full, { recursive: true });
    assert.equal(
      await resolveMediaBinary("ffprobe", env),
      join(path, "ffprobe"),
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("omitting output creates unique /tmp directories; explicit output is reusable", async () => {
  const a = await createOutputDirectory(),
    b = await createOutputDirectory();
  try {
    assert.match(a, /^\/tmp\/dopagaki-wiki-/);
    assert.ok(isAbsolute(a));
    assert.notEqual(a, b);
    assert.equal(await createOutputDirectory(a), a);
    const nested = join(a, "nested", "result");
    assert.equal(await createOutputDirectory(nested), nested);
  } finally {
    await rm(a, { recursive: true, force: true });
    await rm(b, { recursive: true, force: true });
  }
});
