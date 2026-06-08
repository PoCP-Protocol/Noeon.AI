'use strict';

const { parseNoeonInput, planNoeonProgram, runNoeonPipeline } = require('./core/pipeline');
const { buildArchitectureMermaid } = require('./core/cognitive-architecture');
const {
  buildBrainApiPayload,
  mergePipelineBrainView,
  formatPipelineJson
} = require('../language-server/noeon-service');
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
  return parseNoeonInput(body.source, { filename: body.filename || 'playground.ael' }).ast;
}

function attachArchitecturePayload(payload) {
  if (!payload) return payload;
  const architecture = payload.architecture || (
    payload.active_regions
      ? {
          active_regions: payload.active_regions,
          agent_flows: payload.agent_flows,
          cognitive_cycle: payload.cognitive_cycle,
          pipeline_phases: payload.pipeline_phases,
          core_field: payload.core_field,
          phase_regions: payload.phase_regions
        }
      : null
  );
  if (architecture) {
    payload.architectureMermaid = buildArchitectureMermaid(architecture);
    if (!payload.architecture) payload.architecture = architecture;
  }
  return payload;
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
      const cwd = body.cwd || process.cwd();
      const validation = validateProgram(ast, { cwd });
      const { searchPackages } = require('./pkg/registry');
      const imports = ast.general?.imports || [];
      sendJson(res, 200, {
        ...validation,
        imports,
        registryPackages: searchPackages(''),
        manifestHint: imports.length
          ? 'Declare imports in noeon.json and run noeon pkg install when using a project workspace.'
          : null
      });
    } catch (e) {
      sendJson(res, 400, { valid: false, errors: [e.message], line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/pkg/search' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const { searchPackagesAsync } = require('./pkg/registry');
      let query = '';
      if (req.method === 'GET') {
        const url = new URL(req.url || '/api/pkg/search', 'http://localhost');
        query = url.searchParams.get('q') || '';
      } else {
        const body = await readBody(req);
        query = body.q || body.query || '';
      }
      const results = await searchPackagesAsync(query);
      sendJson(res, 200, { query, results, count: results.length });
    } catch (e) {
      sendJson(res, 400, { error: e.message });
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
      const filename = body.filename || 'playground.noeon';
      const runOpts = {
        verbose: Boolean(body.verbose),
        trace: Boolean(body.trace),
        quiet: true,
        console: false,
        require_valid: body.require_valid !== false,
        with_protocol: body.with_protocol ?? 'auto',
        strict_protocol: Boolean(body.strict_protocol),
        feedback: body.feedback || {},
        filename,
        canonical_audit: body.canonical_audit !== false
      };

      if (body.pipeline === false) {
        const ast = parseBodyAst(body);
        const result = await runProgram(ast, runOpts);
        sendJson(res, 200, result);
        return true;
      }

      const input = body.ast || body.source;
      if (!input) throw new Error('Request body must include "source" string or "ast" object');
      const sourceText = typeof body.source === 'string' ? body.source : '';
      const out = await runNoeonPipeline(input, runOpts);
      const pipelineJson = formatPipelineJson(out);
      const brainView = sourceText ? mergePipelineBrainView(sourceText, filename, pipelineJson) : null;
      const payload = attachArchitecturePayload({
        ...(out.result || {}),
        report: out.report || out.result?.report || null,
        unifiedReport: out.report || out.result?.unifiedReport || null,
        architecture: out.architecture,
        stack: out.stack,
        route: out.route,
        routeLabel: out.routeLabel,
        cognitiveCycle: out.cognitiveCycle,
        pipeline: true,
        ...(brainView
          ? {
              code_lenses: brainView.code_lenses,
              decorations: brainView.decorations,
              runtime: brainView.runtime,
              architectureMermaid: brainView.architectureMermaid,
              agent_flows: brainView.agent_flows
            }
          : {})
      });
      sendJson(res, 200, payload);
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

  if (pathname === '/api/canonical' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { ast } = parseNoeonInput(body.source, { filename: body.filename || 'playground.noeon' });
      const plan = planNoeonProgram(ast, {
        filename: body.filename || 'playground.noeon'
      });
      sendJson(res, 200, attachArchitecturePayload({
        canonical: plan.canonical,
        governance: plan.governance,
        plan: plan.plan,
        route: plan.route,
        routeLabel: plan.routeLabel,
        stack: plan.stack,
        architecture: plan.architecture,
        cognitiveCycle: plan.cognitiveCycle,
        snapshot: plan.snapshot
      }));
    } catch (e) {
      sendJson(res, 400, { error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/plan' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const input = body.ast || body.source;
      if (!input) throw new Error('Request body must include "source" string or "ast" object');
      const plan = planNoeonProgram(
        body.ast ? body.ast : parseNoeonInput(body.source, { filename: body.filename || 'playground.noeon' }).ast,
        { filename: body.filename || 'playground.noeon', with_protocol: body.with_protocol ?? 'off' }
      );
      sendJson(res, 200, attachArchitecturePayload({
        profile: plan.profile,
        mode: plan.mode,
        route: plan.route,
        routeLabel: plan.routeLabel,
        stack: plan.stack,
        architecture: plan.architecture,
        cognitiveCycle: plan.cognitiveCycle,
        canonical: plan.canonical,
        governance: plan.governance,
        validation: plan.validation
      }));
    } catch (e) {
      sendJson(res, 400, { error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/brain' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (!body.source || typeof body.source !== 'string') {
        throw new Error('Request body must include "source" string');
      }
      const filename = body.filename || 'playground.noeon';
      const payload = buildBrainApiPayload(body.source, filename, {
        runtime: body.runtime || null
      });
      sendJson(res, 200, attachArchitecturePayload(payload));
    } catch (e) {
      sendJson(res, 400, { error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/fusion/triad' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const ast = parseBodyAst(body);
      const { runFusionTriad, buildTriadGraph } = require('./runtime/fusion/fusion-triad');
      const triad = await runFusionTriad(ast, {
        filename: body.filename || 'playground.noeon',
        field_memory_dir: body.field_memory_dir,
        publish_mycelium: false,
        hot_reload: false,
        save: Boolean(body.save || body.record)
      });
      const graph = buildTriadGraph(triad);
      sendJson(res, 200, { ...triad, mermaid: graph.mermaid, graph: graph.graph });
    } catch (e) {
      sendJson(res, 400, { error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/fusion/history' && req.method === 'GET') {
    const { readFusionHistory, summarizeHistoryStats } = require('./runtime/fusion/fusion-history');
    const url = new URL(req.url || '/api/fusion/history', 'http://localhost');
    const limit = url.searchParams.get('limit') || 30;
    const since = url.searchParams.get('since') || undefined;
    const dir = url.searchParams.get('dir') || undefined;
    const rows = readFusionHistory({ limit, since, fusion_dir: dir });
    sendJson(res, 200, {
      history: rows,
      stats: summarizeHistoryStats(rows),
      count: rows.length
    });
    return true;
  }

  if (pathname === '/api/fusion/graph' && (req.method === 'GET' || req.method === 'POST')) {
    const fs = require('fs');
    const path = require('path');
    const { runFusionGraph } = require('./runtime/fusion/fusion-graph');

    try {
      let ast;
      let filename = 'playground.noeon';

      let saveHistory = false;

      if (req.method === 'POST') {
        const body = await readBody(req);
        ast = parseBodyAst(body);
        filename = body.filename || filename;
        saveHistory = Boolean(body.save || body.record);
      } else {
        const url = new URL(req.url || '/api/fusion/graph', 'http://localhost');
        const fileParam = url.searchParams.get('file');
        if (!fileParam) throw new Error('Query param "file" is required');
        saveHistory = url.searchParams.get('save') === '1';
        const filePath = path.resolve(process.cwd(), fileParam);
        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${fileParam}`);
        filename = filePath;
        ast = parseFromSource(fs.readFileSync(filePath, 'utf8'), fileParam).ast;
      }

      const memDir = path.join(process.cwd(), 'artifacts', 'fusion-graph-mem');
      const result = await runFusionGraph(ast, {
        filename,
        source_path: filename,
        field_memory_dir: memDir,
        publish_mycelium: false,
        hot_reload: false
      });

      if (saveHistory) {
        const { recordFusionRun } = require('./runtime/fusion/fusion-history');
        recordFusionRun({
          file: filename,
          profile: result.profile,
          layers: result.layers,
          phases: result.phases,
          success: result.success,
          summary: result.summary,
          triad: result.triad,
          bidirectional: result.bidirectional
        });
      }

      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 400, { error: e.message, line: extractLine(e.message) });
    }
    return true;
  }

  if (pathname === '/api/convergence/matrix' && req.method === 'GET') {
    try {
      const path = require('path');
      const { loadConvergenceFromDir, DEFAULT_PARITY } = require('./core/canonical-convergence');
      const { computeSemanticPulse } = require('./core/canonical-pulse');
      const url = new URL(req.url || '/api/convergence/matrix', 'http://localhost');
      const dir = url.searchParams.get('dir') ||
        path.join(__dirname, '..', 'examples', 'parity');
      const matrix = loadConvergenceFromDir(dir, DEFAULT_PARITY);
      matrix.pulse = computeSemanticPulse(matrix);
      sendJson(res, 200, matrix);
    } catch (e) {
      sendJson(res, 400, { error: e.message });
    }
    return true;
  }

  if (pathname === '/api/report/history' && req.method === 'GET') {
    try {
      const { readCanonicalAudit } = require('./core/canonical-audit-read');
      const url = new URL(req.url || '/api/report/history', 'http://localhost');
      const report = readCanonicalAudit({
        dir: url.searchParams.get('dir') || undefined,
        limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 30
      });
      sendJson(res, 200, report);
    } catch (e) {
      sendJson(res, 400, { error: e.message });
    }
    return true;
  }

  if (pathname === '/api/fusion/preview' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const ast = parseBodyAst(body);
      const { runFusionPreview } = require('./runtime/fusion/fusion-preview');
      const preview = await runFusionPreview(ast, {
        filename: body.filename || 'playground.noeon',
        field_memory_dir: body.field_memory_dir,
        publish_mycelium: false,
        hot_reload: false,
        with_protocol: 'off',
        quiet: true
      });
      if (body.save || body.record) {
        const { recordFusionRun } = require('./runtime/fusion/fusion-history');
        recordFusionRun({
          file: body.filename || 'playground.noeon',
          profile: preview.profile,
          layers: preview.layers,
          phases: preview.phases,
          success: preview.success,
          summary: preview.summary,
          triad: preview.triad,
          bidirectional: preview.bidirectional
        }, body);
      }
      sendJson(res, 200, preview);
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
      { name: 'fusion_triad.noeon', title: 'Triad Fusion', description: 'FUSE triad — cross-file Next+Liminal+General loop', category: 'fusion' },
      { name: 'agent_field.noeon', title: 'Field Analyst', description: 'AGENT fused with Next field + Liminal observe', category: 'fusion' },
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

  if (pathname === '/api/field-memory/graph' && req.method === 'GET') {
    const path = require('path');
    const { loadFieldMemory } = require('./runtime/next/field-memory');
    const { buildMemoryGraph, formatMermaidGraph } = require('./runtime/next/memory-graph');

    const url = new URL(req.url || '/api/field-memory/graph', 'http://localhost');
    const program = url.searchParams.get('program') || 'genesis';
    const dir = url.searchParams.get('dir') || path.join(process.cwd(), 'artifacts', 'field-memory');
    const memory = loadFieldMemory(program, { dir });
    const graph = buildMemoryGraph({ program, memory, dir });
    const mermaid = formatMermaidGraph(graph);

    sendJson(res, 200, { program, graph, mermaid, nodeCount: graph.nodes.length, edgeCount: graph.edges.length });
    return true;
  }

  if (pathname === '/api/field-memory' && req.method === 'GET') {
    const path = require('path');
    const { loadFieldMemory, memoryPath } = require('./runtime/next/field-memory');

    const url = new URL(req.url || '/api/field-memory', 'http://localhost');
    const program = url.searchParams.get('program') || 'genesis';
    const dir = url.searchParams.get('dir') || path.join(process.cwd(), 'artifacts', 'field-memory');
    const memory = loadFieldMemory(program, { dir });

    sendJson(res, 200, {
      program,
      path: memoryPath(program, { dir }),
      runs: memory.runs || 0,
      cells: Object.keys(memory.cells || {}).length,
      semantic: memory.semantic || null,
      lineage: (memory.lineage || []).slice(-5),
      echoes: Object.fromEntries(
        Object.entries(memory.echoes || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
      memory
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
