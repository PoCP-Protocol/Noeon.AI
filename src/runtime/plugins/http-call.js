const http = require("http");
const https = require("https");
const dns = require("dns").promises;
const net = require("net");
const path = require("path");
const { spawnSync } = require("child_process");
const { URL } = require("url");

const MAX_BODY_BYTES = 64 * 1024;
const MAX_REDIRECTS = 3;

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase() === "true";
}

function parseCsvList(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function resolveUrl(binding) {
  return binding.endpoint || binding.url || "https://api.example.com/execute";
}

function resolveTimeoutMs(binding) {
  const raw = binding.timeout_ms ?? binding.latencyMs ?? 1000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

function resolveMethod(binding) {
  return String(binding.method || "GET").toUpperCase();
}

function parseHeaders(binding) {
  const raw = binding.headers;
  if (!raw) {
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...raw };
  }

  const text = String(raw).trim();
  if (!text) {
    return {};
  }

  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fall through to key=value parsing
    }
  }

  const headers = {};
  for (const pair of text.split(",")) {
    const segment = pair.trim();
    if (!segment) {
      continue;
    }
    const eq = segment.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = segment.slice(0, eq).trim();
    const value = segment.slice(eq + 1).trim();
    if (key) {
      headers[key] = value;
    }
  }
  return headers;
}

function resolveAllowlist(binding) {
  const fromBinding = parseCsvList(binding.allow_hosts);
  const fromEnv = parseCsvList(process.env.NOEON_HTTP_ALLOWLIST);
  return fromBinding.length > 0 ? fromBinding : fromEnv;
}

function hostMatchesPattern(host, pattern) {
  const h = String(host || "").toLowerCase();
  const p = String(pattern || "").toLowerCase();
  if (!h || !p) {
    return false;
  }
  if (p.startsWith("*.")) {
    const suffix = p.slice(1);
    const bare = p.slice(2);
    return h.endsWith(suffix) || h === bare;
  }
  return h === p;
}

function hostAllowed(host, allowlist) {
  if (!allowlist.length) {
    return true;
  }
  return allowlist.some((pattern) => hostMatchesPattern(host, pattern));
}

function isPrivateIp(ip) {
  const normalized = net.isIP(String(ip || ""));
  if (normalized === 4) {
    const parts = String(ip).split(".").map(Number);
    if (parts[0] === 10) {
      return true;
    }
    if (parts[0] === 127) {
      return true;
    }
    if (parts[0] === 169 && parts[1] === 254) {
      return true;
    }
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }
    if (parts[0] === 0) {
      return true;
    }
    return false;
  }
  if (normalized === 6) {
    const lower = String(ip).toLowerCase();
    if (lower === "::1") {
      return true;
    }
    if (lower.startsWith("fc") || lower.startsWith("fd")) {
      return true;
    }
    if (lower.startsWith("fe80:")) {
      return true;
    }
    return false;
  }
  return false;
}

async function resolveHostAddresses(hostname) {
  if (net.isIP(hostname)) {
    return [hostname];
  }
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => entry.address);
}

async function validateGovernance(urlString, binding) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return {
      blocked: true,
      reason: "invalid url",
      errorCode: "HTTP_BLOCKED"
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      blocked: true,
      reason: `unsupported protocol '${parsed.protocol}'`,
      errorCode: "HTTP_BLOCKED"
    };
  }

  const allowlist = resolveAllowlist(binding);
  if (!hostAllowed(parsed.hostname, allowlist)) {
    return {
      blocked: true,
      reason: `host '${parsed.hostname}' is not in allowlist`,
      errorCode: "HTTP_BLOCKED"
    };
  }

  const allowPrivate = normalizeBoolean(binding.allow_private, false);
  if (!allowPrivate) {
    const addresses = await resolveHostAddresses(parsed.hostname);
    const privateHit = addresses.find((addr) => isPrivateIp(addr));
    if (privateHit) {
      return {
        blocked: true,
        reason: `private or loopback address '${privateHit}' is blocked`,
        errorCode: "HTTP_BLOCKED"
      };
    }
  }

  return { blocked: false, url: parsed };
}

function buildFailure({
  reason,
  latencyMs,
  errorCode,
  failureCategory = "execution_error",
  pluginMeta
}) {
  return {
    status: "failed",
    reason,
    latencyMs: Math.max(1, Math.round(latencyMs)),
    failureCategory,
    pluginMeta,
    errorCode
  };
}

function buildAuditMeta({
  url,
  method,
  statusCode,
  bytes,
  durationMs,
  mocked,
  endpoint,
  extract,
  contentPreview
}) {
  return {
    template: "http_call",
    endpoint: endpoint || url,
    url,
    method,
    statusCode,
    bytes,
    durationMs,
    mocked: !!mocked,
    extract: extract || null,
    contentPreview: contentPreview || null
  };
}

function extractWebContent(body, mode) {
  if (body == null) return '';
  const raw = String(body);
  if (mode === 'title') {
    const match = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? match[1].replace(/\s+/g, ' ').trim() : '';
  }
  if (mode === 'text') {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4096);
  }
  return raw.slice(0, 4096);
}

function mockWebContent(binding) {
  if (binding.extract === 'title') return 'Mock Page Title';
  if (binding.extract === 'text') return 'Mock web page text content for research preview.';
  return 'mock http body';
}

function executeMock({ stepName, binding, feedback, url, latencyMs, method }) {
  const injected = feedback?.actionResults?.[stepName];
  if (injected?.status === "failed") {
    return {
      status: "failed",
      reason: injected.reason || "http call failed",
      latencyMs: Number(injected.latencyMs || latencyMs),
      failureCategory: "execution_error",
      pluginMeta: buildAuditMeta({
        url,
        method,
        statusCode: injected.statusCode ?? null,
        bytes: 0,
        durationMs: Number(injected.latencyMs || latencyMs),
        mocked: true,
        endpoint: url
      }),
      errorCode: injected.errorCode || "HTTP_CALL_FAILED"
    };
  }

  return {
    status: "done",
    reason: "http call succeeded",
    latencyMs,
    failureCategory: null,
    content: extractWebContent(mockWebContent(binding), binding.extract),
    pluginMeta: buildAuditMeta({
      url,
      method,
      statusCode: 200,
      bytes: 0,
      durationMs: latencyMs,
      mocked: true,
      endpoint: url,
      extract: binding.extract,
      contentPreview: extractWebContent(mockWebContent(binding), binding.extract)?.slice(0, 512)
    })
  };
}

function requestOnce(urlObj, { method, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const isHttps = urlObj.protocol === "https:";
    const lib = isHttps ? https : http;
    const started = Date.now();

    const req = lib.request(
      {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: `${urlObj.pathname}${urlObj.search}`,
        method,
        headers,
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        let totalBytes = 0;
        let truncatedBytes = 0;

        res.on("data", (chunk) => {
          totalBytes += chunk.length;
          if (truncatedBytes < MAX_BODY_BYTES) {
            const remaining = MAX_BODY_BYTES - truncatedBytes;
            const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
            chunks.push(slice);
            truncatedBytes += slice.length;
          }
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers || {},
            body: Buffer.concat(chunks).toString("utf8"),
            bytes: totalBytes,
            durationMs: Date.now() - started
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("HTTP_TIMEOUT"));
    });

    req.on("error", (err) => {
      if (String(err.message) === "HTTP_TIMEOUT") {
        reject(Object.assign(new Error("HTTP_TIMEOUT"), { code: "HTTP_TIMEOUT" }));
        return;
      }
      reject(err);
    });

    if (body && method !== "GET" && method !== "HEAD") {
      req.write(body);
    }
    req.end();
  });
}

async function performHttp(urlString, binding) {
  const method = resolveMethod(binding);
  const timeoutMs = resolveTimeoutMs(binding);
  const headers = parseHeaders(binding);
  const body = binding.body != null ? String(binding.body) : null;

  if (body && !headers["Content-Length"] && !headers["content-length"]) {
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  let currentUrl = urlString;
  let redirectCount = 0;
  const started = Date.now();

  while (true) {
    const governance = await validateGovernance(currentUrl, binding);
    if (governance.blocked) {
      const err = new Error(governance.reason);
      err.code = governance.errorCode;
      throw err;
    }

    const response = await requestOnce(governance.url, {
      method,
      headers,
      body,
      timeoutMs: Math.max(1, timeoutMs - (Date.now() - started))
    });

    const status = response.statusCode;
    const isRedirect = status >= 300 && status < 400 && response.headers.location;
    if (isRedirect) {
      if (redirectCount >= MAX_REDIRECTS) {
        const err = new Error(`exceeded max redirects (${MAX_REDIRECTS})`);
        err.code = "HTTP_ERROR";
        throw err;
      }
      redirectCount += 1;
      currentUrl = new URL(response.headers.location, governance.url).toString();
      continue;
    }

    return {
      url: currentUrl,
      method,
      statusCode: status,
      body: response.body,
      bytes: response.bytes,
      durationMs: Date.now() - started
    };
  }
}

function performHttpSync(urlString, binding) {
  const timeoutMs = resolveTimeoutMs(binding);
  const child = spawnSync(
    process.execPath,
    [path.join(__dirname, "http-call-runner.js")],
    {
      input: JSON.stringify({ urlString, binding }),
      encoding: "utf8",
      maxBuffer: MAX_BODY_BYTES + 4096,
      timeout: timeoutMs + 5000,
      env: process.env
    }
  );

  if (child.error) {
    const err = new Error(child.error.message || "http subprocess failed");
    err.code = child.error.code === "ETIMEDOUT" ? "HTTP_TIMEOUT" : "HTTP_ERROR";
    throw err;
  }

  if (child.status !== 0) {
    let parsed = null;
    try {
      parsed = JSON.parse(child.stderr || "{}");
    } catch {
      parsed = null;
    }
    const err = new Error(parsed?.message || child.stderr || "http call failed");
    err.code = parsed?.code || "HTTP_ERROR";
    throw err;
  }

  return JSON.parse(child.stdout || "{}").value;
}

async function execute({ stepName, binding = {}, feedback = {} }) {
  const url = resolveUrl(binding);
  const latencyMs = resolveTimeoutMs(binding);
  const method = resolveMethod(binding);
  const mockEnabled =
    normalizeBoolean(binding.mock, false) ||
    normalizeBoolean(process.env.NOEON_HTTP_MOCK, false);

  if (mockEnabled) {
    return executeMock({ stepName, binding, feedback, url, latencyMs, method });
  }

  const injected = feedback?.actionResults?.[stepName];
  if (injected?.status === "failed") {
    return executeMock({ stepName, binding, feedback, url, latencyMs, method });
  }

  const governance = await validateGovernance(url, binding);
  if (governance.blocked) {
    return buildFailure({
      reason: governance.reason || "http call blocked by governance",
      latencyMs: 0,
      errorCode: "HTTP_BLOCKED",
      failureCategory: "policy_block",
      pluginMeta: buildAuditMeta({
        url,
        method,
        statusCode: null,
        bytes: 0,
        durationMs: 0,
        mocked: false,
        endpoint: url
      })
    });
  }

  const started = Date.now();

  try {
    const response = await performHttp(url, binding);
    const durationMs = response.durationMs;

    if (response.statusCode >= 400) {
      return buildFailure({
        reason: `http ${response.statusCode}`,
        latencyMs: durationMs,
        errorCode: "HTTP_ERROR",
        pluginMeta: buildAuditMeta({
          url: response.url,
          method: response.method,
          statusCode: response.statusCode,
          bytes: response.bytes,
          durationMs,
          mocked: false,
          endpoint: url
        })
      });
    }

    return {
      status: "done",
      reason: "http call succeeded",
      latencyMs: durationMs,
      failureCategory: null,
      content: extractWebContent(response.body, binding.extract),
      pluginMeta: buildAuditMeta({
        url: response.url,
        method: response.method,
        statusCode: response.statusCode,
        bytes: response.bytes,
        durationMs,
        mocked: false,
        endpoint: url,
        extract: binding.extract,
        contentPreview: extractWebContent(response.body, binding.extract)?.slice(0, 512)
      })
    };
  } catch (err) {
    const durationMs = Date.now() - started;
    const code = String(err.code || err.message || "");

    if (code === "HTTP_BLOCKED") {
      return buildFailure({
        reason: err.message || "http call blocked by governance",
        latencyMs: durationMs,
        errorCode: "HTTP_BLOCKED",
        failureCategory: "policy_block",
        pluginMeta: buildAuditMeta({
          url,
          method,
          statusCode: null,
          bytes: 0,
          durationMs,
          mocked: false,
          endpoint: url
        })
      });
    }

    if (code === "HTTP_TIMEOUT" || String(err.message) === "HTTP_TIMEOUT") {
      return buildFailure({
        reason: "http call timed out",
        latencyMs: durationMs,
        errorCode: "HTTP_TIMEOUT",
        failureCategory: "timeout",
        pluginMeta: buildAuditMeta({
          url,
          method,
          statusCode: null,
          bytes: 0,
          durationMs,
          mocked: false,
          endpoint: url
        })
      });
    }

    return buildFailure({
      reason: err.message || "http call failed",
      latencyMs: durationMs,
      errorCode: "HTTP_ERROR",
      pluginMeta: buildAuditMeta({
        url,
        method,
        statusCode: null,
        bytes: 0,
        durationMs,
        mocked: false,
        endpoint: url
      })
    });
  }
}

module.exports = {
  execute,
  executeHttp: performHttp,
  validateGovernance,
  hostAllowed,
  isPrivateIp,
  parseHeaders,
  resolveAllowlist
};
