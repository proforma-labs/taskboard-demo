import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const files = ["app.js", "board.js", "index.html", "styles.css"];
const dist = new URL("dist/", root);
await mkdir(dist, { recursive: true });
const existing = await readdir(dist);
if (existing.some((name) => !files.includes(name) && name !== "build-manifest.json")) {
  throw new Error("Build output contains an unexpected file; use a fresh checkout.");
}
const assets = [];
for (const name of files) {
  const bytes = await readFile(new URL(`src/${name}`, root));
  await writeFile(new URL(name, dist), bytes);
  assets.push({ path: `/${name}`, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const manifest = { schemaVersion: 1, application: "Dayboard", assets };
await writeFile(new URL("build-manifest.json", dist), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${assets.length} assets in ${fileURLToPath(dist)}`);
console.log(`PROFORMA_BUILD_MANIFEST ${JSON.stringify(manifest)}`);
