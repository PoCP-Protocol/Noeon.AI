'use strict';

const { parseFromSource, validateProgram, compileProgram, runProgram, explainProgram, getRuntimeStatus } = require('./runtime/unified-runtime');

const MAX_BODY_BYTES = 1024 * 1024;

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
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
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
    const url = new URL(req.url || '/api/examples', 'http://localhost');
    const listAll = url.searchParams.get('all') === '1';

    if (listAll) {
      const files = fs.readdirSync(examplesDir)
        .filter((f) => f.endsWith('.noeon') || f.endsWith('.ael'))
        .sort();
      sendJson(res, 200, {
        examples: files.map((name) => ({
          name,
          title: name,
          description: '',
          category: name.endsWith('.noeon') ? 'noeon' : 'ael',
          profile: name.endsWith('.noeon') ? 'general' : 'ael',
          source: fs.readFileSync(path.join(examplesDir, name), 'utf8')
        }))
      });
      return true;
    }

    const curated = [
      { name: 'hello.noeon', title: 'Hello World', description: 'Minimal cognitive cycle', category: 'getting-started' },
      { name: 'agent_research.noeon', title: 'Research Analyst', description: 'Industry research with citations', category: 'agents' },
      { name: 'agent_risk_review.noeon', title: 'Risk Reviewer', description: 'Payment approval with escalation', category: 'agents' },
      { name: 'agent_customer_service.noeon', title: 'Support Agent', description: 'Customer issue resolution', category: 'agents' }
    ];

    const examples = [];
    for (const entry of curated) {
      const filePath = path.join(examplesDir, entry.name);
      if (!fs.existsSync(filePath)) continue;
      examples.push({
        name: entry.name,
        title: entry.title,
        description: entry.description,
        category: entry.category,
        profile: 'general',
        source: fs.readFileSync(filePath, 'utf8')
      });
    }

    sendJson(res, 200, { examples });
    return true;
  }

  if (pathname === '/api/mycelium/graph' && req.method === 'GET') {
    const fs = require('fs');
    const path = require('path');
    const { buildMyceliumGraph, buildNextFieldGraph, mergeGraphs, formatMermaidGraph } = require('./runtime/next/mycelium-graph');
    const { runFieldEngine } = require('./runtime/next/field-engine');
    const { parseNextSource } = require('./grammar');

    const url = new URL(req.url || '/api/mycelium/graph', 'http://localhost');
    const myceliumDir = url.searchParams.get('dir') || path.join(process.cwd(), 'artifacts', 'mycelium');
    const fileParam = url.searchParams.get('file');
    let field = null;
    let ast = null;

    if (fileParam) {
      const filePath = path.resolve(process.cwd(), fileParam);
      if (fs.existsSync(filePath) && filePath.endsWith('.next')) {
        const source = fs.readFileSync(filePath, 'utf8');
        ast = parseNextSource(source);
        if (ast?.next?.cells?.length) {
          field = runFieldEngine(ast.next, { mycelium_dir: myceliumDir });
        }
      }
    }

    const parts = [];
    if (ast && field) parts.push(buildNextFieldGraph(ast, field));
    parts.push(buildMyceliumGraph({ dir: myceliumDir, field }));
    const graph = mergeGraphs(...parts);
    const mermaid = formatMermaidGraph(graph);

    sendJson(res, 200, {
      graph,
      mermaid,
      dir: myceliumDir,
      file: fileParam,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length
    });
    return true;
  }

  if (pathname === '/api/mycelium/events' && req.method === 'GET') {
    const path = require('path');
    const { readEvents } = require('./runtime/next/mycelium-bus');

    const url = new URL(req.url || '/api/mycelium/events', 'http://localhost');
    const cluster = url.searchParams.get('cluster') || 'dream_cluster';
    const myceliumDir = url.searchParams.get('dir') || path.join(process.cwd(), 'artifacts', 'mycelium');
    const sinceTs = url.searchParams.get('since') || undefined;
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 30;

    const events = readEvents(cluster, { dir: myceliumDir, sinceTs, limit });
    sendJson(res, 200, { cluster, events, count: events.length });
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
