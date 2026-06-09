'use strict';

const vscode = require('vscode');
const path = require('path');
const { execFile } = require('child_process');
const { loadNoeonService, buildDecorationTypes, applyBrainDecorations } = require('./brain-decorations');
const { registerCodeLensProvider } = require('./code-lens');
const { registerArchitecturePanel } = require('./architecture-panel');

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const repoRoot = path.join(context.extensionPath, '..');
  const cliPath = path.join(repoRoot, 'src', 'cli.js');
  const service = loadNoeonService(context.extensionPath);
  const output = vscode.window.createOutputChannel('Noeon Architecture');
  context.subscriptions.push(output);

  const goldenGateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  goldenGateBar.command = 'noeon.refreshGoldenGateStatus';
  context.subscriptions.push(goldenGateBar);

  const executionBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  executionBar.name = 'Noeon Execution Path';
  context.subscriptions.push(executionBar);

  let architecturePanel = null;
  let lspClient = null;

  const brainHighlightEnabled = () =>
    vscode.workspace.getConfiguration('noeon').get('brainHighlight', true);

  let decorationTypes = service ? buildDecorationTypes(vscode, service) : {};
  context.subscriptions.push(...Object.values(decorationTypes));

  function refreshBrainDecorations(editor) {
    if (!brainHighlightEnabled() || !service || !editor) return;
    if (editor.document.languageId !== 'noeon' &&
        !editor.document.fileName.endsWith('.ael') &&
        !editor.document.fileName.endsWith('.noeon')) {
      return;
    }
    applyBrainDecorations(editor, service, decorationTypes, vscode);
  }

  function refreshActiveEditorChrome() {
    const editor = vscode.window.activeTextEditor;
    refreshBrainDecorations(editor);
    refreshFileExecutionStatusBar(editor);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => refreshActiveEditorChrome()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        refreshActiveEditorChrome();
      }
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (vscode.window.activeTextEditor?.document === doc) {
        refreshActiveEditorChrome();
      }
    })
  );
  refreshActiveEditorChrome();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('noeon.brainHighlight')) {
        refreshActiveEditorChrome();
      }
      if (e.affectsConfiguration('noeon.showGoldenGateStatus')) {
        refreshGoldenGateStatusBar();
      }
      if (e.affectsConfiguration('noeon.showExecutionStatus')) {
        refreshFileExecutionStatusBar(vscode.window.activeTextEditor);
      }
    })
  );

  function runCli(args, title, options = {}) {
    const { showOutput = true } = options;
    return new Promise((resolve, reject) => {
      execFile(process.execPath, [cliPath, ...args], { cwd: repoRoot, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }
        if (showOutput) {
          output.clear();
          output.appendLine(`── ${title} ──`);
          output.append(stdout);
          output.show(true);
        }
        resolve(stdout);
      });
    });
  }

  async function refreshGoldenGateStatusBar() {
    if (!vscode.workspace.getConfiguration('noeon').get('showGoldenGateStatus', true)) {
      goldenGateBar.hide();
      return;
    }
    try {
      const stdout = await runCli(['status', '--json'], '', { showOutput: false });
      const status = JSON.parse(stdout);
      const gg = status.goldenGate;
      if (!gg?.available) {
        goldenGateBar.text = '$(circle-outline) Golden Gate —';
        goldenGateBar.tooltip = 'Run npm run gate:golden to generate artifacts/golden-gate/';
      } else if (gg.ok) {
        const probes = gg.probes?.total != null ? ` · probes ${gg.probes.passed}/${gg.probes.total}` : '';
        goldenGateBar.text = `$(pass) Golden Gate${probes}`;
        goldenGateBar.tooltip = `AI ${gg.aiPath?.passed}/${gg.aiPath?.total} · hybrid ${gg.aiPath?.hybrid ?? 0}`;
      } else {
        goldenGateBar.text = '$(error) Golden Gate FAIL';
        goldenGateBar.tooltip = `AI ${gg.aiPath?.passed}/${gg.aiPath?.total}`;
      }
      goldenGateBar.show();
    } catch {
      goldenGateBar.text = '$(circle-outline) Noeon';
      goldenGateBar.show();
    }
  }

  function updateExecutionStatusBar(result) {
    if (!vscode.workspace.getConfiguration('noeon').get('showExecutionStatus', true)) {
      executionBar.hide();
      return;
    }
    const summary = result?.executionSummary;
    if (!summary?.strategy) {
      executionBar.hide();
      return;
    }
    executionBar.text = `$(play) ${summary.path || summary.strategy}`;
    executionBar.tooltip = [
      summary.strategy,
      summary.hybrid ? 'hybrid' : null,
      summary.snapshotAct ? 'snapshot-act' : null,
      summary.phases?.length ? summary.phases.join(' → ') : null
    ].filter(Boolean).join(' · ');
    executionBar.show();
  }

  function refreshFileExecutionStatusBar(editor) {
    if (!editor || !service?.getFileExecutionSummary) {
      executionBar.hide();
      return;
    }
    const doc = editor.document;
    if (doc.languageId !== 'noeon' &&
        !doc.fileName.endsWith('.ael') &&
        !doc.fileName.endsWith('.noeon')) {
      executionBar.hide();
      return;
    }
    const summary = service.getFileExecutionSummary(doc.getText(), doc.fileName);
    updateExecutionStatusBar({ executionSummary: summary });
  }

  async function applyPipelineJson(payload) {
    const result = typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (architecturePanel) {
      architecturePanel.applyRuntime({
        success: result.success,
        blocked: result.blocked,
        phases: result.phases,
        scheduler: result.scheduler,
        architecture: result.architecture,
        compileMode: result.compileMode,
        primaryIr: result.primaryIr,
        canonicalPrimary: result.canonicalPrimary,
        canonicalSource: result.canonicalSource,
        executionDriver: result.executionDriver,
        snapshotActCount: result.snapshotActCount,
        actDriver: result.actDriver,
        snapshotActExecution: result.snapshotActExecution,
        era: result.era,
        actionTrace: result.actionTrace,
        executionStrategy: result.executionStrategy,
        hybridActExecution: result.hybridActExecution,
        executionSummary: result.executionSummary
      });
      updateExecutionStatusBar(result);
      await vscode.commands.executeCommand('noeon.architecture.focus');
    }
    return result;
  }

  function generalCanonicalEnabled() {
    return vscode.workspace.getConfiguration('noeon').get('generalCanonicalPrimary', false);
  }

  async function runPipelineViaClient(file, options = {}) {
    const editor = vscode.window.activeTextEditor;
    const useLsp = vscode.workspace.getConfiguration('noeon').get('runViaLsp', true);
    const generalCanonical = options.generalCanonical ?? generalCanonicalEnabled();
    if (lspClient && useLsp) {
      try {
        return await lspClient.sendRequest('noeon/run', {
          textDocument: editor ? { uri: editor.document.uri.toString() } : undefined,
          source: editor?.document.getText(),
          filename: file,
          options: {
            with_protocol: options.withProtocol ?? 'off',
            trace: options.trace === true,
            canonical_audit: options.canonicalAudit !== false,
            general_canonical: generalCanonical
          }
        });
      } catch {
        // fall back to CLI subprocess
      }
    }
    const args = ['pipeline', file, '--json'];
    if (options.trace) args.push('--trace');
    if (generalCanonical) process.env.NOEON_GENERAL_CANONICAL = '1';
    const stdout = await runCli(args, 'Pipeline Run', { showOutput: false });
    if (generalCanonical) delete process.env.NOEON_GENERAL_CANONICAL;
    return JSON.parse(stdout);
  }

  async function getActiveFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active Noeon file.');
      return null;
    }
    return editor.document.uri.fsPath;
  }

  const serverModule = path.join(repoRoot, 'language-server', 'server.js');
  const fallbackServer = path.join(context.extensionPath, 'language-server', 'server.js');
  const fs = require('fs');
  const resolvedServer = fs.existsSync(serverModule) ? serverModule : fallbackServer;

  const serverOptions = {
    run: { command: process.execPath, args: [resolvedServer, '--stdio'] },
    debug: { command: process.execPath, args: [resolvedServer, '--stdio'] }
  };

  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'noeon' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{ael,noeon}')
    }
  };

  try {
    const LanguageClient = require('vscode-languageclient/node').LanguageClient;
    lspClient = new LanguageClient('noeonLanguageServer', 'Noeon Language Server', serverOptions, clientOptions);
    context.subscriptions.push(lspClient.start());
  } catch {
    const codeLensProvider = registerCodeLensProvider(vscode, service, context);
    if (codeLensProvider) context.subscriptions.push(codeLensProvider);

    const diagCollection = vscode.languages.createDiagnosticCollection('noeon');
    context.subscriptions.push(diagCollection);

    async function validateDocument(doc) {
      if (doc.languageId !== 'noeon' && !doc.fileName.endsWith('.ael') && !doc.fileName.endsWith('.noeon')) return;
      if (!service) return;
      const issues = service.validateSource(doc.getText());
      diagCollection.set(doc.uri, issues.map((d) => new vscode.Diagnostic(
        new vscode.Range(Math.max(0, d.line - 1), 0, Math.max(0, d.line - 1), 200),
        d.message,
        d.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
      )));
    }

    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(validateDocument),
      vscode.workspace.onDidChangeTextDocument((e) => validateDocument(e.document))
    );
    vscode.workspace.textDocuments.forEach(validateDocument);
  }

  if (service) {
    const resolveViewModel = async (editor) => {
      if (lspClient) {
        try {
          return await lspClient.sendRequest('noeon/architecture', {
            textDocument: { uri: editor.document.uri.toString() },
            filename: editor.document.fileName,
            mode: 'view'
          });
        } catch {
          // fall back to in-process service
        }
      }
      return service.buildArchitectureViewModel(editor.document.getText(), editor.document.fileName);
    };
    architecturePanel = registerArchitecturePanel(context, service, { resolveViewModel });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('noeon.runFile', async () => {
      const file = await getActiveFile();
      if (!file) return;
      const runInTerminal = vscode.workspace.getConfiguration('noeon').get('runInTerminal', false);
      if (runInTerminal) {
        const term = vscode.window.createTerminal('Noeon Run');
        term.sendText(`node "${cliPath}" pipeline "${file}" --json --trace`);
        term.show();
        return;
      }
      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Noeon pipeline', cancellable: false },
          async () => {
            const result = await runPipelineViaClient(file, { trace: true, withProtocol: 'off' });
            await applyPipelineJson(result);
            const phaseSummary = (result.phases || []).join(' → ') || 'done';
            vscode.window.showInformationMessage(`Noeon: ${phaseSummary} (${result.success !== false ? 'ok' : 'failed'})`);
          }
        );
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    }),
    vscode.commands.registerCommand('noeon.planFile', async () => {
      const file = await getActiveFile();
      if (!file) return;
      try {
        await runCli(['plan', file, '--json'], 'Plan');
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    }),
    vscode.commands.registerCommand('noeon.compileFile', async () => {
      const file = await getActiveFile();
      if (!file) return;
      try {
        const args = ['compile', file, '--json'];
        if (generalCanonicalEnabled()) args.push('--canonical');
        await runCli(args, 'Compile IR');
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    }),
    vscode.commands.registerCommand('noeon.brainMap', async () => {
      const editor = vscode.window.activeTextEditor;
      const file = await getActiveFile();
      if (!file || !service) return;
      try {
        const summary = service.getArchitectureSummary(editor.document.getText(), file);
        if (summary.error) throw new Error(summary.error);
        output.clear();
        output.appendLine('── Cognitive Architecture ──');
        output.appendLine(`route: ${summary.routeLabel || '—'}`);
        output.appendLine(`active: ${(summary.active_regions || []).join(', ')}`);
        for (const flow of summary.agent_flows || []) {
          const steps = (flow.steps || []).map((s) => `${s.kind}→${s.region}`).join(' · ');
          output.appendLine(`${flow.name}: ${steps}`);
        }
        output.appendLine('');
        output.appendLine(JSON.stringify(summary, null, 2));
        output.show(true);
        if (architecturePanel && editor) architecturePanel.refresh(editor);
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    }),
    vscode.commands.registerCommand('noeon.pipelineFile', async () => {
      const file = await getActiveFile();
      if (!file) return;
      try {
        const result = await runPipelineViaClient(file, { withProtocol: 'off' });
        if (result) await applyPipelineJson(result);
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    }),
    vscode.commands.registerCommand('noeon.toggleBrainHighlight', () => {
      const config = vscode.workspace.getConfiguration('noeon');
      const next = !config.get('brainHighlight', true);
      config.update('brainHighlight', next, vscode.ConfigurationTarget.Workspace);
      if (next) {
        refreshActiveEditorChrome();
      } else if (vscode.window.activeTextEditor) {
        for (const type of Object.values(decorationTypes)) {
          vscode.window.activeTextEditor.setDecorations(type, []);
        }
      }
      vscode.window.showInformationMessage(`Noeon brain highlight: ${next ? 'on' : 'off'}`);
    }),
    vscode.commands.registerCommand('noeon.refreshGoldenGateStatus', () => refreshGoldenGateStatusBar()),
    vscode.commands.registerCommand('noeon.showArchitecturePanel', async () => {
      await vscode.commands.executeCommand('noeon.architecture.focus');
      const editor = vscode.window.activeTextEditor;
      if (architecturePanel && editor) architecturePanel.refresh(editor);
    })
  );
  refreshGoldenGateStatusBar();
}

function deactivate() {}

module.exports = { activate, deactivate };
