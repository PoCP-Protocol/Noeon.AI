'use strict';

const { parseQuoted, lineIndent, collectIndentedLines } = require('./parse-utils');

function parseFuseConfigBlock(blockLines, lineNo) {
  const cfg = {};
  for (const bl of blockLines) {
    const trimmedLine = (typeof bl === 'string' ? bl : bl.raw).trim();
    if (!trimmedLine) continue;
    const idx = trimmedLine.indexOf(':');
    if (idx === -1) continue;
    const key = trimmedLine.slice(0, idx).trim();
    const valRaw = trimmedLine.slice(idx + 1).trim().replace(/,$/, '');
    if (/^\[/.test(valRaw)) {
      cfg[key] = valRaw.slice(1, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else if (/^"[\s\S]*"$/.test(valRaw)) {
      cfg[key] = parseQuoted(valRaw, lineNo);
    } else if (/^(true|false)$/i.test(valRaw)) {
      cfg[key] = valRaw.toLowerCase() === 'true';
    } else {
      cfg[key] = valRaw;
    }
  }
  return cfg;
}

function parseFuseStatement(lines, lineIndex, lineNo, rawLine, rawValue) {
  const targetMatch = rawValue.match(/^([a-zA-Z_]+)\s*\{\s*$/i);
  if (!targetMatch) {
    return { fusionEntries: [], fusionTriad: null, fusionCoherence: null, fusionRelay: null, nextIndex: lineIndex };
  }

  const parentIndent = lineIndent(rawLine);
  const { blockLines, nextIndex } = collectIndentedLines(lines, lineIndex + 1, parentIndent);
  const cfg = parseFuseConfigBlock(blockLines, lineNo);
  const target = targetMatch[1].toLowerCase();
  const fusionEntries = [];

  if (target === 'triad') {
    const { expandTriadFusionBlocks } = require('../runtime/fusion/fusion-triad');
    fusionEntries.push(...expandTriadFusionBlocks(cfg));
    return {
      fusionEntries,
      fusionTriad: { enabled: true, ...cfg },
      fusionCoherence: null,
      fusionRelay: null,
      nextIndex
    };
  }

  if (target === 'coherence') {
    fusionEntries.push({ target: 'coherence', enabled: true, ...cfg });
    return {
      fusionEntries,
      fusionTriad: null,
      fusionCoherence: { enabled: true, ...cfg },
      fusionRelay: null,
      nextIndex
    };
  }

  if (target === 'relay') {
    fusionEntries.push({ target: 'relay', enabled: true, ...cfg });
    return {
      fusionEntries,
      fusionTriad: null,
      fusionCoherence: null,
      fusionRelay: { enabled: true, ...cfg },
      nextIndex
    };
  }

  fusionEntries.push({ target, enabled: true, ...cfg });
  return { fusionEntries, fusionTriad: null, fusionCoherence: null, fusionRelay: null, nextIndex };
}

module.exports = {
  parseFuseConfigBlock,
  parseFuseStatement
};
