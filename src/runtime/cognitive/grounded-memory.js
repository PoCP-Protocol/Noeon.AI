'use strict';

/**
 * GroundedMemory — a lightweight, fully deterministic memory substrate.
 *
 * Brain analogy: hippocampal store that perception writes into and that
 * reasoning recalls from. Unlike the vector SemanticMemory module, this
 * store uses no embeddings, no randomness, and no persistence — so recall
 * (and any confidence derived from it) is reproducible across runs and
 * works fully offline. It exists so Noeon's native cognition can produce
 * real, evidence-grounded conclusions WITHOUT an external LLM.
 *
 * Recall contract matches what DualProcessEngine expects:
 *   recall(query, { type, limit }) -> [{ content, relevance, strength }]
 */

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9一-鿿]+/)
    .filter(Boolean);
}

/** Deterministic relevance: Jaccard overlap of token sets in [0, 1]. */
function jaccard(aTokens, bTokens) {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

class GroundedMemory {
  constructor() {
    this.entries = [];          // { id, content, type, strength, tokens, storedAt }
    this._seq = 0;
    this.lastRecalled = [];     // ids returned by the most recent recall()
  }

  /**
   * Store a memory trace. Deterministic; returns the trace id.
   * @param {string} content
   * @param {{type?: string, strength?: number, source?: string}} [opts]
   */
  store(content, opts = {}) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const id = `gm_${this._seq++}`;
    const entry = {
      id,
      content: text,
      type: opts.type || 'semantic',
      strength: clamp01(opts.strength ?? 0.6),
      source: opts.source || null,
      tokens: tokenize(text),
      storedAt: this._seq
    };
    this.entries.push(entry);
    return id;
  }

  /**
   * Recall the most relevant traces for a query.
   * Relevance is a deterministic token-overlap score; only traces with
   * non-zero relevance are returned. Stable tie-break by storage order.
   * @returns {Array<{content:string, relevance:number, strength:number, id:string, type:string}>}
   */
  recall(query, opts = {}) {
    const limit = opts.limit || 3;
    const qTokens = tokenize(query);
    let scored = this.entries
      .filter((e) => (opts.type ? e.type === opts.type : true))
      .map((e) => ({
        id: e.id,
        content: e.content,
        type: e.type,
        strength: e.strength,
        relevance: jaccard(qTokens, e.tokens)
      }))
      .filter((e) => e.relevance > 0);

    scored.sort((a, b) =>
      b.relevance - a.relevance ||
      b.strength - a.strength ||
      a.id.localeCompare(b.id)
    );

    const top = scored.slice(0, limit);
    this.lastRecalled = top.map((e) => e.id);
    return top;
  }

  /**
   * Synaptic plasticity: reinforce (or weaken) traces by delta.
   * If ids omitted, reinforces the traces returned by the last recall().
   * Returns the number of traces adjusted.
   */
  reinforce(delta, ids = null) {
    const target = new Set(ids || this.lastRecalled);
    if (target.size === 0) return 0;
    let n = 0;
    for (const e of this.entries) {
      if (target.has(e.id)) {
        e.strength = clamp01(e.strength + delta);
        n++;
      }
    }
    return n;
  }

  size() {
    return this.entries.length;
  }
}

function clamp01(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

module.exports = { GroundedMemory, tokenize, jaccard };
