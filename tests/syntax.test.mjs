import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

test("all application JavaScript modules pass node --check", async () => {
  const files = (await readdir(new URL("../src/", import.meta.url)))
    .filter((name) => name.endsWith(".js"));

  assert.ok(files.length > 0, "expected JavaScript modules in src/");

  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", new URL(`../src/${file}`, import.meta.url).pathname], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${file} failed syntax check:\n${result.stderr}`);
  }
});
