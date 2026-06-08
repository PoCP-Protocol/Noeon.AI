'use strict';

function registerCodeLensProvider(vscode, service, context) {
  if (!service?.getCodeLenses) return null;

  const selector = [
    { language: 'noeon', scheme: 'file' },
    { pattern: '**/*.{noeon,ael}' }
  ];

  return vscode.languages.registerCodeLensProvider(selector, {
    provideCodeLenses(document) {
      const enabled = vscode.workspace.getConfiguration('noeon').get('codeLens', true);
      if (!enabled) return [];

      const lenses = service.getCodeLenses(document.getText(), document.fileName);
      return lenses.map((l) => {
        const range = new vscode.Range(Math.max(0, l.line - 1), 0, Math.max(0, l.line - 1), 120);
        return new vscode.CodeLens(
          range,
          l.command ? { title: l.title, command: l.command } : { title: l.title, command: '' }
        );
      });
    }
  });
}

module.exports = { registerCodeLensProvider };
