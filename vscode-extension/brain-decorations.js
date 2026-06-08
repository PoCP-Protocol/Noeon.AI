'use strict';

const path = require('path');

function loadNoeonService(extensionPath) {
  const candidates = [
    path.join(extensionPath, '..', 'language-server', 'noeon-service.js'),
    path.join(extensionPath, 'language-server', 'noeon-service.js')
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }
  return null;
}

function buildDecorationTypes(vscode, service) {
  const colors = service?.BRAIN_REGION_COLORS || {};
  const types = {};
  for (const [region, color] of Object.entries(colors)) {
    types[region] = vscode.window.createTextEditorDecorationType({
      backgroundColor: `${color}22`,
      borderColor: `${color}88`,
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      overviewRulerColor: color,
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });
  }
  return types;
}

function applyBrainDecorations(editor, service, decorationTypes, vscode) {
  if (!editor || !service) return;

  const source = editor.document.getText();
  const lines = service.getBrainLineDecorations(source);
  const byRegion = {};

  for (const deco of lines) {
    if (!byRegion[deco.region]) byRegion[deco.region] = [];
    const lineIndex = Math.max(0, deco.line - 1);
    const lineText = editor.document.lineAt(lineIndex).text;
    const startChar = Math.min(deco.character, lineText.length);
    const endChar = Math.min(startChar + deco.length, lineText.length);
    byRegion[deco.region].push({
      range: new vscode.Range(lineIndex, startChar, lineIndex, endChar),
      hoverMessage: `${deco.keyword} → ${deco.role} (${deco.region})`
    });
  }

  for (const [region, type] of Object.entries(decorationTypes)) {
    editor.setDecorations(type, byRegion[region] || []);
  }
}

module.exports = {
  loadNoeonService,
  buildDecorationTypes,
  applyBrainDecorations
};
