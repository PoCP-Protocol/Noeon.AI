'use strict';

function parseQuoted(value, lineNo) {
  const m = String(value || '').match(/^"([\s\S]*)"$/);
  if (!m) throw new Error(`Line ${lineNo}: expected quoted string, got '${value}'`);
  return m[1];
}

function parseKeyValuePairs(input, lineNo) {
  const parts = String(input || '').match(/(?:[^\s"]+="[\s\S]*?"|[^\s"]+)/g) || [];
  const out = {};
  for (const part of parts) {
    const m = part.match(/^([a-zA-Z_][\w]*)=(.+)$/);
    if (!m) throw new Error(`Line ${lineNo}: invalid key=value token '${part}'`);
    const key = m[1];
    const raw = m[2];
    out[key] = /^"[\s\S]*"$/.test(raw) ? parseQuoted(raw, lineNo) : raw;
  }
  return out;
}

function parseGovernanceLine(value, lineNo, tier) {
  const kv = parseKeyValuePairs(value, lineNo);
  return {
    tier,
    type: tier,
    name: kv.name || null,
    rule: kv.rule || kv.pledge || kv.objective || null,
    pledge: kv.pledge || null,
    objective: kv.objective || null,
    priority: kv.priority != null ? Number(kv.priority) : null,
    ...kv,
    source: `noeon.${tier}`
  };
}

function lineIndent(rawLine) {
  const m = String(rawLine || '').match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function isSkippableLine(rawLine) {
  const trimmed = String(rawLine || '').trim();
  return (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('*/') ||
    trimmed === "'use strict';" ||
    trimmed === '"use strict";'
  );
}

function collectIndentedLines(lines, startIndex, parentIndent) {
  const blockLines = [];
  let index = startIndex;

  while (index < lines.length) {
    const raw = lines[index];
    if (isSkippableLine(raw)) {
      index += 1;
      continue;
    }

    const indent = lineIndent(raw);
    if (indent <= parentIndent) break;

    blockLines.push({ raw, lineNo: index + 1, indent });
    index += 1;
  }

  return { blockLines, nextIndex: index };
}

function interpolate(rawValue, variables, lineNo) {
  return String(rawValue || '').replace(/\$\{([a-zA-Z_][\w]*)\}/g, (_m, name) => {
    if (!(name in variables)) {
      throw new Error(`Line ${lineNo}: undefined variable '${name}'`);
    }
    return String(variables[name]);
  });
}

module.exports = {
  parseQuoted,
  parseKeyValuePairs,
  parseGovernanceLine,
  lineIndent,
  isSkippableLine,
  collectIndentedLines,
  interpolate
};
