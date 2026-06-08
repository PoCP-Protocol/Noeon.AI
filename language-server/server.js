'use strict';

/**
 * Noeon Language Server — minimal LSP for diagnostics and completion.
 * Zero dependency on vscode-languageserver; implements JSON-RPC over stdio.
 */

const readline = require('readline');
const { TextDocument } = require('./document');
const { validateSource, getCompletions, getHover, getDocumentSymbols, getCodeLenses } = require('./noeon-service');

let documents = new Map();
let rootUri = '';

function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}

function publishDiagnostics(uri, source) {
  const diags = validateSource(source);
  send({
    jsonrpc: '2.0',
    method: 'textDocument/publishDiagnostics',
    params: {
      uri,
      diagnostics: diags.map((d) => ({
        range: {
          start: { line: Math.max(0, d.line - 1), character: 0 },
          end: { line: Math.max(0, d.line - 1), character: 200 }
        },
        message: d.message,
        severity: d.severity === 'error' ? 1 : 2,
        source: 'noeon'
      }))
    }
  });
}

function handleMessage(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    rootUri = params.rootUri || params.rootPath || '';
    send({
      jsonrpc: '2.0',
      id,
      result: {
        capabilities: {
          textDocumentSync: 1,
          completionProvider: { triggerCharacters: [' ', '=', '"'] },
          hoverProvider: true,
          documentSymbolProvider: true,
          codeLensProvider: { resolveProvider: false }
        },
        serverInfo: { name: 'noeon-language-server', version: '0.9.0' }
      }
    });
    return;
  }

  if (method === 'initialized') return;

  if (method === 'textDocument/didOpen') {
    const { textDocument } = params;
    documents.set(textDocument.uri, TextDocument.create(textDocument.uri, 'noeon', 1, textDocument.text));
    publishDiagnostics(textDocument.uri, textDocument.text);
    return;
  }

  if (method === 'textDocument/didChange') {
    const { textDocument, contentChanges } = params;
    const change = contentChanges[contentChanges.length - 1];
    const doc = documents.get(textDocument.uri);
    const text = change.text !== undefined ? change.text : doc?.getText() || '';
    documents.set(textDocument.uri, TextDocument.create(textDocument.uri, 'noeon', textDocument.version, text));
    publishDiagnostics(textDocument.uri, text);
    return;
  }

  if (method === 'textDocument/completion') {
    const { textDocument, position } = params;
    const doc = documents.get(textDocument.uri);
    const items = getCompletions(doc ? doc.getText() : '', position.line, position.character);
    send({
      jsonrpc: '2.0',
      id,
      result: items.map((label) => ({
        label,
        kind: 14,
        insertText: label
      }))
    });
    return;
  }

  if (method === 'textDocument/hover') {
    const { textDocument, position } = params;
    const doc = documents.get(textDocument.uri);
    const hover = getHover(doc ? doc.getText() : '', position.line, position.character);
    if (!hover) {
      send({ jsonrpc: '2.0', id, result: null });
      return;
    }
    send({
      jsonrpc: '2.0',
      id,
      result: {
        contents: [{ language: 'markdown', value: `**${hover.keyword}**\n\n${hover.doc}` }]
      }
    });
    return;
  }

  if (method === 'textDocument/documentSymbol') {
    const { textDocument } = params;
    const doc = documents.get(textDocument.uri);
    const symbols = getDocumentSymbols(doc ? doc.getText() : '');
    const kindMap = { intent: 18, goal: 12, cognitive: 14, agent: 5 };
    send({
      jsonrpc: '2.0',
      id,
      result: symbols.map((s, i) => ({
        name: s.name,
        kind: kindMap[s.kind] || 14,
        range: {
          start: { line: s.line - 1, character: 0 },
          end: { line: s.line - 1, character: 80 }
        },
        selectionRange: {
          start: { line: s.line - 1, character: 0 },
          end: { line: s.line - 1, character: 80 }
        },
        children: []
      }))
    });
    return;
  }

  if (method === 'textDocument/codeLens') {
    const doc = documents.get(params.textDocument.uri);
    const source = doc ? doc.getText() : '';
    const filename = decodeURIComponent(String(params.textDocument.uri).split('/').pop() || 'buffer.noeon');
    const lenses = getCodeLenses(source, filename);
    send({
      jsonrpc: '2.0',
      id,
      result: lenses.map((l) => ({
        range: {
          start: { line: Math.max(0, l.line - 1), character: 0 },
          end: { line: Math.max(0, l.line - 1), character: 120 }
        },
        command: l.command ? { title: l.title, command: l.command } : undefined,
        data: { title: l.title }
      }))
    });
    return;
  }

  if (method === 'noeon/architecture') {
    const doc = documents.get(params.textDocument?.uri || params.uri);
    const source = doc ? doc.getText() : params.source || '';
    const filename = params.filename || decodeURIComponent(String(params.textDocument?.uri || params.uri || '').split('/').pop() || 'buffer.noeon');
    const { resolveArchitectureRequest } = require('./noeon-service');
    send({
      jsonrpc: '2.0',
      id,
      result: resolveArchitectureRequest(source, filename, params.mode || 'summary')
    });
    return;
  }

  if (method === 'noeon/run') {
    const doc = documents.get(params.textDocument?.uri || params.uri);
    const source = doc ? doc.getText() : params.source || '';
    const filename = params.filename || decodeURIComponent(String(params.textDocument?.uri || params.uri || '').split('/').pop() || 'buffer.noeon');
    const { runPipelineRequest } = require('./noeon-service');
    void runPipelineRequest(source, filename, params.options || params)
      .then((result) => send({ jsonrpc: '2.0', id, result }))
      .catch((err) => send({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err.message || String(err) }
      }));
    return;
  }

  if (method === 'shutdown') {
    send({ jsonrpc: '2.0', id, result: null });
    return;
  }

  if (method === 'exit') {
    process.exit(0);
  }

  if (id !== undefined) {
    send({ jsonrpc: '2.0', id, result: null });
  }
}

const rl = readline.createInterface({ input: process.stdin });
let buffer = '';
let contentLength = null;

process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    buffer += chunk.toString('utf8');
    while (true) {
      if (contentLength === null) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        const header = buffer.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) { buffer = buffer.slice(headerEnd + 4); continue; }
        contentLength = Number(match[1]);
        buffer = buffer.slice(headerEnd + 4);
      }
      if (buffer.length < contentLength) break;
      const body = buffer.slice(0, contentLength);
      buffer = buffer.slice(contentLength);
      contentLength = null;
      try {
        handleMessage(JSON.parse(body));
      } catch (e) {
        // ignore malformed messages
      }
    }
  }
});
