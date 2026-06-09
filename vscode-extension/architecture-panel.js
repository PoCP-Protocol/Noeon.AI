'use strict';

const vscode = require('vscode');

const REGION_LABELS = {
  prefrontal_cortex: 'Executive',
  sensory_cortex: 'Perception',
  association_cortex: 'Reasoning',
  motor_cortex: 'Action',
  hippocampus: 'Memory',
  amygdala: 'Salience',
  basal_ganglia: 'Selection',
  cerebellum: 'Correction',
  thalamus: 'Routing',
  corpus_callosum: 'Integration',
  default_mode_network: 'Field',
  neuromodulatory: 'Evolution'
};

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRuntimePhases(model) {
  const phases = model.pipeline_phases || [];
  if (!phases.length && !model.runtime?.phases?.length) return '';

  const rows = phases.length
    ? phases.map((p) => {
        const regions = (p.regions || []).map((r) => REGION_LABELS[r] || r.replace(/_/g, ' ')).join(' + ');
        return `<div class="phase-row"><span class="phase-name">${escapeHtml(p.phase)}</span><span class="phase-regions">${escapeHtml(regions || '—')}</span></div>`;
      }).join('')
    : (model.runtime.phases || []).map((phase) =>
        `<div class="phase-row"><span class="phase-name">${escapeHtml(phase)}</span><span class="phase-regions">executed</span></div>`
      ).join('');

  const status = model.runtime
    ? `<div class="runtime-meta">scheduler: ${escapeHtml(model.runtime.scheduler || '—')} · success: ${model.runtime.success !== false} · blocked: ${model.runtime.blocked === true}</div>`
    : '';

  return `<h2>Runtime Pipeline</h2>${status}<div class="phases">${rows}</div>`;
}

function renderArchitectureHtml(model, filename) {
  if (model?.error) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:var(--vscode-font-family);font-size:12px;padding:12px;color:var(--vscode-errorForeground)}
    </style></head><body><p>${escapeHtml(model.error)}</p></body></html>`;
  }

  const chips = (model.active_regions || []).map((id) =>
    `<span class="chip" title="${escapeHtml(id)}">${escapeHtml(REGION_LABELS[id] || id.replace(/_/g, ' '))}</span>`
  ).join('');

  const flows = (model.agent_flows || []).map((agent) => {
    const steps = (agent.steps || []).map((s) =>
      `<span class="step"><b>${escapeHtml(String(s.kind || '?').toUpperCase())}</b><small>${escapeHtml(REGION_LABELS[s.region] || s.region || '')}</small></span>`
    ).join('<span class="arrow">→</span>');
    return `<div class="flow"><div class="flow-name">${escapeHtml(agent.name || 'Agent')}</div><div class="flow-steps">${steps || '—'}</div></div>`;
  }).join('');

  const cycle = (model.cognitive_cycle || []).map((c) =>
    `<span class="cycle">${escapeHtml(c.primitive || c.phase)}</span>`
  ).join('<span class="arrow">→</span>');

  const lenses = (model.code_lenses || []).slice(0, 12).map((l) =>
    `<li><code>L${l.line}</code> ${escapeHtml(l.title)}</li>`
  ).join('');

  const mermaidBlock = model.architectureMermaid
    ? `<h2>Architecture Map</h2><div class="mermaid-wrap"><pre class="mermaid" id="arch-mermaid"></pre></div>`
    : '';

  const mermaidScript = model.architectureMermaid
    ? `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
       <script>
         const diagram = ${JSON.stringify(model.architectureMermaid)};
         mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
         mermaid.render('arch-svg', diagram).then(({ svg }) => {
           document.getElementById('arch-mermaid').innerHTML = svg;
         }).catch(() => {
           document.getElementById('arch-mermaid').textContent = diagram;
         });
       </script>`
    : '';

  const exec = model.executionSummary;
  const execHtml = exec?.strategy
    ? `<div class="route exec">⚡ ${escapeHtml(exec.path || exec.strategy)} · ${escapeHtml(exec.strategy)}${exec.hybrid ? ' · hybrid' : ''}${exec.snapshotAct ? ' · snapshot-act' : ''}${exec.phases?.length ? ` · ${escapeHtml(exec.phases.join(' → '))}` : ''}</div>`
    : '';

  const csp = model.architectureMermaid
    ? "default-src 'none'; img-src data:; style-src 'unsafe-inline' https://cdn.jsdelivr.net; script-src https://cdn.jsdelivr.net 'unsafe-inline';"
    : "default-src 'none'; style-src 'unsafe-inline';";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <style>
    body { font-family: var(--vscode-font-family); font-size: 12px; color: var(--vscode-foreground); padding: 12px; line-height: 1.45; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.65; margin: 16px 0 8px; }
    h2:first-child { margin-top: 0; }
    .route { font-family: var(--vscode-editor-font-family, monospace); font-size: 13px; padding: 8px 10px; border-radius: 6px; background: var(--vscode-editor-inactiveSelectionBackground); border-left: 3px solid var(--vscode-textLink-foreground); }
    .route.exec { border-left-color: #d4a574; margin-top: 8px; }
    .meta, .runtime-meta { opacity: 0.75; margin-top: 6px; font-size: 11px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { padding: 2px 8px; border-radius: 999px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 11px; }
    .flow { margin-bottom: 10px; padding: 8px; border-radius: 6px; background: var(--vscode-editor-inactiveSelectionBackground); }
    .flow-name { font-weight: 600; margin-bottom: 6px; }
    .flow-steps, .cycle-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
    .step { display: inline-flex; flex-direction: column; align-items: center; padding: 4px 6px; border-radius: 4px; background: var(--vscode-input-background); min-width: 52px; }
    .step small { opacity: 0.7; font-size: 9px; }
    .cycle { padding: 2px 6px; border-radius: 4px; background: var(--vscode-input-background); font-size: 10px; }
    .arrow { opacity: 0.45; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
    code { font-family: var(--vscode-editor-font-family, monospace); }
    .file { opacity: 0.6; font-size: 10px; word-break: break-all; margin-bottom: 10px; }
    .phases { display: flex; flex-direction: column; gap: 6px; }
    .phase-row { display: flex; gap: 8px; align-items: baseline; padding: 6px 8px; border-radius: 6px; background: var(--vscode-editor-inactiveSelectionBackground); }
    .phase-name { font-family: var(--vscode-editor-font-family, monospace); min-width: 110px; color: var(--vscode-textLink-foreground); }
    .phase-regions { opacity: 0.85; }
    .mermaid-wrap { overflow: auto; padding: 8px; border-radius: 6px; background: var(--vscode-editor-background); }
    .mermaid-wrap svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="file">${escapeHtml(filename || 'untitled')}</div>
  <div class="route">▸ ${escapeHtml(model.routeLabel || 'plan')}</div>
  ${execHtml}
  <div class="meta">core: ${escapeHtml(REGION_LABELS[model.core_field] || model.core_field || 'field')} · executive: ${escapeHtml(REGION_LABELS[model.executive] || 'Executive')} · ${(model.active_regions || []).length} regions${model.runtime ? ' · runtime attached' : ''}${model.compileMode ? ` · compile: ${escapeHtml(model.compileMode)} (${escapeHtml(model.primaryIr || 'cognitive')})` : ''}</div>
  ${model.actionTrace?.lastFetch ? `<div class="meta">last_fetch: ${escapeHtml(String(model.actionTrace.lastFetch).slice(0, 160))}</div>` : ''}

  ${renderRuntimePhases(model)}

  <h2>Active Regions</h2>
  <div class="chips">${chips || '<span class="meta">none</span>'}</div>

  ${mermaidBlock}

  <h2>Agent Flow</h2>
  ${flows || '<p class="meta">No AGENT flow detected.</p>'}

  <h2>Cognitive Cycle</h2>
  <div class="cycle-row">${cycle || '<span class="meta">—</span>'}</div>

  <h2>CodeLens Map</h2>
  <ul>${lenses || '<li class="meta">—</li>'}</ul>
  ${mermaidScript}
</body>
</html>`;
}

class ArchitectureViewProvider {
  constructor(service, options = {}) {
    this.service = service;
    this.resolveViewModel = options.resolveViewModel || null;
    this.view = null;
    this.lastFilename = '';
    this.lastRuntime = null;
    this.refreshGeneration = 0;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: []
    };
    webviewView.webview.html = renderArchitectureHtml({ routeLabel: '—', active_regions: [] });
  }

  async refresh(editor) {
    if (!this.view || !this.service || !editor) return;
    if (editor.document.languageId !== 'noeon' &&
        !editor.document.fileName.endsWith('.ael') &&
        !editor.document.fileName.endsWith('.noeon')) {
      return;
    }
    const filename = editor.document.fileName;
    this.lastFilename = filename;
    const generation = ++this.refreshGeneration;

    let model;
    try {
      if (this.resolveViewModel) {
        model = await this.resolveViewModel(editor);
      } else {
        model = this.service.buildArchitectureViewModel(editor.document.getText(), filename);
      }
    } catch (err) {
      model = { error: err.message || String(err) };
    }

    if (generation !== this.refreshGeneration || !this.view) return;

    if (this.lastRuntime && this.service.mergeRuntimeIntoViewModel && !model?.error) {
      model = this.service.mergeRuntimeIntoViewModel(model, this.lastRuntime);
    }
    this.view.webview.html = renderArchitectureHtml(model, pathBasename(filename));
  }

  applyRuntime(runtime) {
    this.lastRuntime = runtime;
    const editor = vscode.window.activeTextEditor;
    if (editor) void this.refresh(editor);
  }

  clearRuntime() {
    this.lastRuntime = null;
  }

  reveal() {
    if (this.view) this.view.show?.(true);
  }
}

function pathBasename(filePath) {
  return String(filePath || '').split(/[/\\]/).pop() || filePath;
}

function registerArchitecturePanel(context, service, options = {}) {
  if (!service?.buildArchitectureViewModel && !options.resolveViewModel) return null;

  const provider = new ArchitectureViewProvider(service, options);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('noeon.architecture', provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  let timer = null;
  function scheduleRefresh(editor) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (provider.lastRuntime) provider.clearRuntime();
      void provider.refresh(editor);
    }, 400);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => scheduleRefresh(editor)),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const active = vscode.window.activeTextEditor;
      if (active?.document === e.document) scheduleRefresh(active);
    })
  );

  if (vscode.window.activeTextEditor) {
    void provider.refresh(vscode.window.activeTextEditor);
  }

  return provider;
}

module.exports = {
  ArchitectureViewProvider,
  registerArchitecturePanel,
  renderArchitectureHtml,
  REGION_LABELS
};
