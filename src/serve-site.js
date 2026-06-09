const http = require("http");
const fs = require("fs");
const path = require("path");
const { handlePlaygroundApi } = require("./playground-api");

const PORT = Number(process.env.PORT || 5177);
const ROOT = path.resolve(__dirname, "..", "site");
const ARTIFACTS_ROOT = path.resolve(__dirname, "..", "artifacts");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function normalizeUrlPath(rawPath) {
  const decodedPath = decodeURIComponent(rawPath || "/").replace(/\\/g, "/");
  if (decodedPath.split("/").includes("..")) {
    return null;
  }
  return path.posix.normalize(decodedPath).replace(/^([.][.][/])+/, "");
}

function resolveStaticRequest(rawPath) {
  const safePath = normalizeUrlPath(rawPath);
  if (!safePath) {
    return { forbidden: true, filePath: null, baseRoot: null };
  }
  const requested = safePath === "/" ? "/index.html" : safePath;
  const isArtifactRequest = requested.startsWith("/artifacts/");
  const relativePath = isArtifactRequest
    ? requested.slice("/artifacts/".length)
    : requested.replace(/^\//, "");

  const baseRoot = isArtifactRequest ? ARTIFACTS_ROOT : ROOT;
  const filePath = path.resolve(baseRoot, relativePath);
  const relativeToRoot = path.relative(baseRoot, filePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return { forbidden: true, filePath, baseRoot };
  }

  return { forbidden: false, filePath, baseRoot };
}

const server = http.createServer(async (req, res) => {
  const rawPath = req.url ? req.url.split("?")[0] : "/";
  let safePath;
  try {
    safePath = normalizeUrlPath(rawPath);
  } catch {
    send(res, 400, "Bad request");
    return;
  }
  if (!safePath) {
    send(res, 403, "Forbidden");
    return;
  }

  if (safePath.startsWith("/api/")) {
    const handled = await handlePlaygroundApi(req, res, safePath);
    if (handled) return;
    send(res, 404, JSON.stringify({ error: "API route not found" }), "application/json; charset=utf-8");
    return;
  }

  const resolved = resolveStaticRequest(rawPath);

  if (resolved.forbidden) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(resolved.filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        send(res, 404, "Not found");
        return;
      }
      send(res, 500, "Internal server error");
      return;
    }

    const ext = path.extname(resolved.filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || "application/octet-stream");
  });
});

function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Noeon site + playground API at http://localhost:${port}`);
      console.log(`  Playground: http://localhost:${port}/playground.html`);
      console.log(`  Studio:     http://localhost:${port}/studio.html`);
      console.log(`  Mycelium:   http://localhost:${port}/mycelium.html`);
      console.log(`  Memory:     http://localhost:${port}/memory.html`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, resolveStaticRequest, PORT };
