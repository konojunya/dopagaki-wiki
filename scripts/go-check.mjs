import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const tmp = await mkdtemp(join(tmpdir(), "dopagaki-go-"));
const valid = spawnSync("go", ["run", "tests/go/integers.go"], {
  encoding: "utf8",
});
assert.equal(valid.status, 0, valid.stderr);
const expected = [
  "uint8 overflow=0",
  "int8 overflow=-128",
  "uint8 underflow=255",
  "widen=100",
  "narrow=44",
  "int8 min=-128 max=127",
  "int16 min=-32768 max=32767",
  "int32 min=-2147483648 max=2147483647",
  "int64 min=-9223372036854775808 max=9223372036854775807",
];
assert.deepEqual(valid.stdout.trim().split("\n"), expected);
const rejected = [];
for (const [name, code] of [
  ["int8-constant", "var a int8 = 128"],
  ["uint8-constant", "var b uint8 = -1"],
  ["mixed-types", "var a int8 = 1; var b int64 = a"],
]) {
  const file = join(tmp, `${name}.go`);
  await writeFile(file, `package main\n${code}\nfunc main() {}\n`);
  const r = spawnSync("go", ["build", "-o", join(tmp, name), file], {
    encoding: "utf8",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /overflows|cannot use/);
  rejected.push({
    name,
    exitCode: r.status,
    stderr: r.stderr.replaceAll(tmp, "<temp>"),
  });
}
const report = join(tmp, "go-verification.json");
await writeFile(
  report,
  JSON.stringify(
    {
      passed: true,
      tool: spawnSync("go", ["version"], { encoding: "utf8" }).stdout.trim(),
      validOutput: expected,
      rejected,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Go examples and rejection cases passed: ${report}`);
