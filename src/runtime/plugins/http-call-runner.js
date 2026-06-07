"use strict";

const { executeHttp } = require("./http-call");

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

readStdin()
  .then((raw) => {
    const payload = JSON.parse(raw || "{}");
    return executeHttp(payload.urlString, payload.binding || {});
  })
  .then((result) => {
    process.stdout.write(JSON.stringify({ ok: true, value: result }));
  })
  .catch((err) => {
    process.stderr.write(
      JSON.stringify({
        message: err.message || "http call failed",
        code: err.code || "HTTP_ERROR"
      })
    );
    process.exit(1);
  });
