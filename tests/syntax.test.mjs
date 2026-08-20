import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

async function jsFiles(relative) {
  const dir = new URL(relative, import.meta.url);
  return (await readdir(dir))
    .filter((name) => name.endsWith(".js") || name.endsWith(".cjs"))
    .map((name) => new URL(name, dir));
}

test("all application JavaScript modules pass node --check", async () => {
  const files = [...await jsFiles("../src/"), ...await jsFiles("../electron/")];
  assert.ok(files.length > 0);
  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file.pathname], { encoding:"utf8" });
    assert.equal(result.status, 0, `${file.pathname} failed syntax check:\n${result.stderr}`);
  }
});
