import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createAppServer } from "../scripts/server.mjs";

const manifest = JSON.parse(await readFile(new URL("../dist/build-manifest.json", import.meta.url), "utf8"));
const server = await createAppServer();
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  const results = [];
  for (const asset of manifest.assets) {
    const response = await fetch(`${origin}${asset.path}`, { signal: AbortSignal.timeout(5000), redirect: "error" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(bytes.length, asset.bytes);
    assert.equal(sha256, asset.sha256);
    results.push({ path: asset.path, status: response.status, bytes: bytes.length, sha256 });
  }
  assert.match(await (await fetch(origin)).text(), /Dayboard/);
  assert.deepEqual(await (await fetch(`${origin}/build-manifest.json`)).json(), manifest);
  for (const path of ["/.env", "/package.json", "/scripts/server.mjs", "/unknown", "/%2e%2e/package.json"]) {
    assert.equal((await fetch(`${origin}${path}`)).status, 404);
  }
  assert.equal((await fetch(origin, { method: "POST" })).status, 405);
  assert.equal((await fetch(origin, { method: "HEAD" })).status, 200);
  console.log(`PROFORMA_APP_HTTP ${JSON.stringify({ host: "127.0.0.1", assets: results, negativeRouteChecks: 5, postStatus: 405, headStatus: 200 })}`);
} finally {
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
}
