'use strict';

const { parseFromSource, validateProgram, compileProgram, runProgram, explainProgram, getRuntimeStatus } = require('./runtime/unified-runtime');

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function parseBodyAst(body) {
  if (body.ast) return body.ast;
  if (!body.source || typeof body.source !== 'string') {
    throw new Error('Request body must include "source" string or "ast" object');
  }
  return parseFromSource(body.source, body.filename || 'playground.ael').ast;
}

async function handlePlaygroundApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return true;
  }

  if (pathname === '/api/status' && req.method === 'GET') {
    sendJson(res, 200, getRuntimeStatus());
    return true;
  }

  if (pathname === '/api/validate' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const ast = parseBodyAst(body);
      const validation = validateProgram(ast);
      sendJson(res, 200, validation);
    } catch (e) {
      sendJson(res, 400, { valid: false, errors: [e.message], line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/compile' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const ast = parseBodyAst(body);
      const format = body.format === 'ael' ? 'ael' : body.format === 'both' ? 'both' : 'ir';
      const compiled = compileProgram(ast, format);
      sendJson(res, 200, {
        format,
        output: format === 'ir'
          ? compiled.program.toJSON()
          : format === 'both'
            ? { ir: compiled.program.toJSON(), artifact: compiled.artifact }
            : compiled.artifact,
        warnings: compiled.warnings || []
      });
    } catch (e) {
      sendJson(res, 400, { error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/run' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const ast = parseBodyAst(body);
      const result = await runProgram(ast, {
        verbose: Boolean(body.verbose),
        trace: Boolean(body.trace),
        quiet: true,
        console: false,
        require_valid: body.require_valid !== false,
        with_protocol: body.with_protocol ?? 'auto',
        strict_protocol: Boolean(body.strict_protocol),
        feedback: body.feedback || {}
      });
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 400, { success: false, error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/explain' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const ast = parseBodyAst(body);
      sendJson(res, 200, { explanation: explainProgram(ast) });
    } catch (e) {
      sendJson(res, 400, { error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/examples' && req.method === 'GET') {
    const fs = require('fs');
    const path = require('path');
    const examplesDir = path.resolve(__dirname, '..', 'examples');
    const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.ael'));
    sendJson(res, 200, {
      examples: files.map((name) => ({
        name,
        source: fs.readFileSync(path.join(examplesDir, name), 'utf8')
      }))
    });
    return true;
  }

  return false;
}

function extractLine(message) {
  const m = String(message).match(/Line (\d+)/i);
  return m ? Number(m[1]) : null;
}

module.exports = {
  handlePlaygroundApi,
  sendJson
};
