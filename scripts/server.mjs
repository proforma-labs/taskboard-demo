import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function createAppServer() {
  const root = new URL("../dist/", import.meta.url);
  const manifestBytes = await readFile(new URL("build-manifest.json", root));
  const manifest = JSON.parse(manifestBytes);
  const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
  const assets = new Map();
  for (const asset of manifest.assets) {
    if (!/^\/[a-z-]+\.(?:html|js|css)$/.test(asset.path)) throw new Error("Invalid asset path.");
    const body = await readFile(new URL(asset.path.slice(1), root));
    if (body.length !== asset.bytes || createHash("sha256").update(body).digest("hex") !== asset.sha256) {
      throw new Error(`Build integrity failed for ${asset.path}`);
    }
    const extension = asset.path.slice(asset.path.lastIndexOf("."));
    assets.set(asset.path, { body, contentType: contentTypes[extension] });
  }
  assets.set("/", assets.get("/index.html"));
  assets.set("/build-manifest.json", { body: manifestBytes, contentType: "application/json; charset=utf-8" });
  return createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    response.setHeader("Cache-Control", "no-cache");
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const path = (request.url ?? "/").split("?")[0];
    const asset = assets.get(path);
    if (!asset) { response.writeHead(404).end("Not found"); return; }
    response.writeHead(200, { "Content-Type": asset.contentType, "Content-Length": asset.body.length });
    response.end(request.method === "HEAD" ? undefined : asset.body);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createAppServer();
  const port = Number(process.env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port.");
  server.listen(port, "0.0.0.0", () => console.log(`Dayboard listening on ${port}`));
  process.on("SIGTERM", () => { server.close(); server.closeIdleConnections(); });
}
