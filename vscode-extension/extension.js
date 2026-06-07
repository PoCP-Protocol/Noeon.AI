'use strict';

const vscode = require('vscode');
const path = require('path');
const { spawn } = require('child_process');

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const serverModule = path.join(context.extensionPath, '..', 'language-server', 'server.js');
  const fallbackServer = path.join(context.extensionPath, 'language-server', 'server.js');
  const fs = require('fs');
  const resolvedServer = fs.existsSync(serverModule) ? serverModule : fallbackServer;

  const serverOptions = {
    run: { command: process.execPath, args: [resolvedServer, '--stdio'] },
    debug: { command: process.execPath, args: [resolvedServer, '--stdio'] }
  };

  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'noeon' }],
    synchronize: { fileEvents: vscode.workspace.createFileSystemWatcher('**/*.ael') }
  };

  let client;
  try {
    const LanguageClient = require('vscode-languageclient/node').LanguageClient;
    client = new LanguageClient('noeonLanguageServer', 'Noeon Language Server', serverOptions, clientOptions);
    context.subscriptions.push(client.start());
  } catch {
    // Fallback: diagnostics via direct validation when language client unavailable
    const diagCollection = vscode.languages.createDiagnosticCollection('noeon');
    context.subscriptions.push(diagCollection);

    async function validateDocument(doc) {
      if (doc.languageId !== 'noeon' && !doc.fileName.endsWith('.ael')) return;
      try {
        const { validateSource } = require(path.join(context.extensionPath, '..', 'language-server', 'noeon-service'));
        const issues = validateSource(doc.getText());
        diagCollection.set(doc.uri, issues.map((d) => new vscode.Diagnostic(
          new vscode.Range(Math.max(0, d.line - 1), 0, Math.max(0, d.line - 1), 200),
          d.message,
          d.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
        )));
      } catch {
        // silent if service unavailable
      }
    }

    vscode.workspace.onDidOpenTextDocument(validateDocument);
    vscode.workspace.onDidChangeTextDocument((e) => validateDocument(e.document));
    vscode.workspace.textDocuments.forEach(validateDocument);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('noeon.runFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const file = editor.document.uri.fsPath;
      const term = vscode.window.createTerminal('Noeon Run');
      term.sendText(`node "${path.join(context.extensionPath, '..', 'src', 'cli.js')}" run "${file}" --trace`);
      term.show();
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
