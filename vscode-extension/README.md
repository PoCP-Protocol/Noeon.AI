# Noeon AI — VS Code Extension

Syntax highlighting, code snippets, and a cognitive-inspired color theme for the Noeon programming language.

## Features

### Syntax Highlighting
- **8 semantic color categories** mapped to brain functions:
  - Blue: Contract structure (TASK, BUDGET, VERIFY)
  - Green: Perception (PERCEIVE, ATTEND, SENSE)
  - Purple: Reasoning (INTUIT, REASON, PREDICT, DECIDE)
  - Gold: Memory (KNOW, RECALL, CONSOLIDATE)
  - Pink: Metacognition (REFLECT, MONITOR, ADAPT)
  - Cyan: Flow control (STREAM, THINK_UNTIL, WHEN_CONFIDENT)
  - Orange: Social (CONSULT, DEBATE_MULTI, SPAWN)
  - Red: Evolution (EVOLVE, MUTATE, SYNTHESIZE)

### Code Snippets (17 templates)
- `contract` — Full cognitive contract
- `cogloop` — Minimal perceive-think-decide-reflect loop
- `drive`, `perceive`, `predict`, `intuit`, `reason`, `decide`
- `reflect`, `consolidate`, `know`, `stream`, `thinkuntil`
- `debate`, `debatemulti`, `define`, `evolve`

### Noeon Cognitive Dark Theme
A custom dark theme where colors represent cognitive functions.

## Installation

### From VSIX (local)
```bash
cd vscode-extension
npx vsce package
code --install-extension noeon-language-0.7.0.vsix
```

### Manual
Copy the `vscode-extension` folder to `~/.vscode/extensions/noeon-language/`

## File Extensions

- `.ael` — Noeon AEL contracts
- `.noeon` — Noeon cognitive programs

## Color Semantics

The theme uses color to convey **cognitive meaning**:

| Color | Brain Function | Keywords |
|---|---|---|
| Blue | Structure/Goals | TASK, BUDGET, VERIFY |
| Green | Sensing | PERCEIVE, ATTEND |
| Purple | Thinking | REASON, INTUIT, PREDICT |
| Gold | Memory | KNOW, RECALL, CONSOLIDATE |
| Pink | Self-awareness | REFLECT, MONITOR |
| Cyan | Flow | STREAM, THINK_UNTIL |
| Orange | Social | CONSULT, DEBATE |
| Red | Evolution | EVOLVE, MUTATE |

When you read Noeon code, the colors tell you which part of the brain is active.
