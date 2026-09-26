import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

let count = 0;
for (const directory of ["src", "scripts", "tests"]) {
  const root = new URL(`../${directory}/`, import.meta.url);
  for (const name of await readdir(root)) {
    if (!/\.(?:mjs|js)$/.test(name)) continue;
    const result = spawnSync(process.execPath, ["--check", fileURLToPath(new URL(name, root))], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
    count += 1;
  }
}
console.log(`Syntax checks passed for ${count} JavaScript modules.`);
