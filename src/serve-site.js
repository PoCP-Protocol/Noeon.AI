const http = require("http");
const fs = require("fs");
const path = require("path");

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

const server = http.createServer((req, res) => {
  const rawPath = req.url ? req.url.split("?")[0] : "/";
  const safePath = path.normalize(rawPath).replace(/^([.][.][/\\])+/, "");

  const requested = safePath === "/" ? "/index.html" : safePath;
  const isArtifactRequest = requested.startsWith("/artifacts/");
  const relativePath = isArtifactRequest
    ? requested.slice("/artifacts/".length)
    : requested.replace(/^\//, "");

  const baseRoot = isArtifactRequest ? ARTIFACTS_ROOT : ROOT;
  const filePath = path.join(baseRoot, relativePath);

  if (!filePath.startsWith(baseRoot)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        send(res, 404, "Not found");
        return;
      }
      send(res, 500, "Internal server error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || "application/octet-stream");
  });
});

server.listen(PORT, () => {
  console.log(`Noeon site available at http://localhost:${PORT}`);
});
