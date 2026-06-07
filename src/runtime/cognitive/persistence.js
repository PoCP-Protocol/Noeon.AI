'use strict';

/**
 * Noeon Cognitive Persistence System
 * 
 * A brain doesn't lose its memories when it sleeps.
 * This module provides:
 * - State snapshots (like memory consolidation during sleep)
 * - Cross-session memory persistence
 * - Incremental state saving (journaling)
 * - State recovery from corruption
 * - Memory migration between versions
 * 
 * Neural Correlate: Hippocampal replay during sleep → long-term cortical storage
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================
// STATE SNAPSHOT (Memory Consolidation)
// ============================================================

class StateSnapshot {
  constructor(state, metadata = {}) {
    this.id = `snap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.version = metadata.version || '0.7.0';
    this.timestamp = Date.now();
    this.label = metadata.label || null;
    this.state = this._serialize(state);
    this.checksum = this._computeChecksum(this.state);
    this.size_bytes = Buffer.byteLength(JSON.stringify(this.state));
    this.metadata = {
      beliefs_count: state.beliefs ? state.beliefs.length : 0,
      memory_count: state.memories ? state.memories.length : 0,
      knowledge_nodes: state.knowledge ? state.knowledge.nodes_count : 0,
      cognitive_cycles: state.cycles || 0,
      ...metadata
    };
  }

  _serialize(state) {
    // Deep clone with handling of special types
    return JSON.parse(JSON.stringify(state, (key, value) => {
      if (value instanceof Map) return { __type: 'Map', entries: [...value.entries()] };
      if (value instanceof Set) return { __type: 'Set', values: [...value.values()] };
      if (value instanceof Date) return { __type: 'Date', iso: value.toISOString() };
      if (typeof value === 'function') return { __type: 'Function', name: value.name || 'anonymous' };
      return value;
    }));
  }

  _computeChecksum(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
  }

  verify() {
    const computed = this._computeChecksum(this.state);
    return computed === this.checksum;
  }

  restore() {
    if (!this.verify()) throw new Error(`Snapshot ${this.id} failed integrity check`);
    return this._deserialize(this.state);
  }

  _deserialize(data) {
    return JSON.parse(JSON.stringify(data), (key, value) => {
      if (value && typeof value === 'object') {
        if (value.__type === 'Map') return new Map(value.entries);
        if (value.__type === 'Set') return new Set(value.values);
        if (value.__type === 'Date') return new Date(value.iso);
      }
      return value;
    });
  }

  toJSON() {
    return {
      id: this.id, version: this.version, timestamp: this.timestamp,
      label: this.label, checksum: this.checksum, size_bytes: this.size_bytes,
      metadata: this.metadata, state: this.state
    };
  }

  static fromJSON(json) {
    const snap = Object.create(StateSnapshot.prototype);
    Object.assign(snap, json);
    return snap;
  }
}

// ============================================================
// JOURNAL (Incremental State Changes)
// ============================================================

class StateJournal {
  constructor(options = {}) {
    this.entries = [];
    this.max_entries = options.max_entries || 1000;
    this.auto_compact_at = options.auto_compact_at || 500;
    this.compaction_count = 0;
  }

  append(operation, data, metadata = {}) {
    const entry = {
      seq: this.entries.length,
      timestamp: Date.now(),
      operation,
      data,
      metadata
    };
    this.entries.push(entry);
    
    if (this.entries.length >= this.auto_compact_at) {
      this.compact();
    }
    return entry;
  }

  compact() {
    // Keep only the last N entries and create a compaction marker
    const keep = Math.floor(this.max_entries * 0.3);
    const removed = this.entries.length - keep;
    this.entries = this.entries.slice(-keep);
    this.compaction_count++;
    return { compacted: removed, remaining: this.entries.length };
  }

  replay(fromSeq = 0) {
    return this.entries.filter(e => e.seq >= fromSeq);
  }

  getStats() {
    return {
      total_entries: this.entries.length,
      compactions: this.compaction_count,
      oldest: this.entries[0]?.timestamp || null,
      newest: this.entries[this.entries.length - 1]?.timestamp || null
    };
  }

  toJSON() {
    return { entries: this.entries, compaction_count: this.compaction_count };
  }

  static fromJSON(json) {
    const journal = new StateJournal();
    journal.entries = json.entries || [];
    journal.compaction_count = json.compaction_count || 0;
    return journal;
  }
}

// ============================================================
// PERSISTENCE STORE (File-based Storage)
// ============================================================

class PersistenceStore {
  constructor(basePath, options = {}) {
    this.basePath = basePath || path.join(process.cwd(), '.noeon');
    this.options = {
      auto_save_interval: options.auto_save_interval || 60000, // 1 min
      max_snapshots: options.max_snapshots || 20,
      compress: options.compress || false,
      ...options
    };
    this._ensureDir();
    this._autoSaveTimer = null;
  }

  _ensureDir() {
    const dirs = [
      this.basePath,
      path.join(this.basePath, 'snapshots'),
      path.join(this.basePath, 'journals'),
      path.join(this.basePath, 'memories'),
      path.join(this.basePath, 'knowledge')
    ];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  // --- Snapshot Operations ---

  saveSnapshot(state, label = null) {
    const snapshot = new StateSnapshot(state, { label });
    const filePath = path.join(this.basePath, 'snapshots', `${snapshot.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot.toJSON(), null, 2));
    this._pruneSnapshots();
    return snapshot;
  }

  loadSnapshot(snapshotId) {
    const filePath = path.join(this.basePath, 'snapshots', `${snapshotId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return StateSnapshot.fromJSON(data);
  }

  loadLatestSnapshot() {
    const snapshots = this.listSnapshots();
    if (snapshots.length === 0) return null;
    return this.loadSnapshot(snapshots[0].id);
  }

  listSnapshots() {
    const dir = path.join(this.basePath, 'snapshots');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        return { id: data.id, timestamp: data.timestamp, label: data.label, size: data.size_bytes, metadata: data.metadata };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  _pruneSnapshots() {
    const snapshots = this.listSnapshots();
    if (snapshots.length > this.options.max_snapshots) {
      const toRemove = snapshots.slice(this.options.max_snapshots);
      toRemove.forEach(s => {
        const filePath = path.join(this.basePath, 'snapshots', `${s.id}.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
  }

  // --- Journal Operations ---

  saveJournal(journal, sessionId = 'default') {
    const filePath = path.join(this.basePath, 'journals', `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(journal.toJSON(), null, 2));
  }

  loadJournal(sessionId = 'default') {
    const filePath = path.join(this.basePath, 'journals', `${sessionId}.json`);
    if (!fs.existsSync(filePath)) return new StateJournal();
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return StateJournal.fromJSON(data);
  }

  // --- Memory Persistence ---

  saveMemories(memories, category = 'general') {
    const filePath = path.join(this.basePath, 'memories', `${category}.json`);
    const data = {
      category,
      count: memories.length,
      saved_at: Date.now(),
      memories: memories.map(m => ({
        content: m.content || m.value,
        type: m.memory_type || m.type || 'episodic',
        encoding_strength: m.encoding_strength || 0.5,
        associations: m.associations || [],
        created_at: m.timestamp || Date.now()
      }))
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return data.count;
  }

  loadMemories(category = 'general') {
    const filePath = path.join(this.basePath, 'memories', `${category}.json`);
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.memories || [];
  }

  listMemoryCategories() {
    const dir = path.join(this.basePath, 'memories');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  // --- Knowledge Graph Persistence ---

  saveKnowledge(graph) {
    const filePath = path.join(this.basePath, 'knowledge', 'graph.json');
    const data = {
      saved_at: Date.now(),
      nodes: graph.nodes || [],
      edges: graph.edges || [],
      causal_chains: graph.causal_chains || []
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { nodes: data.nodes.length, edges: data.edges.length };
  }

  loadKnowledge() {
    const filePath = path.join(this.basePath, 'knowledge', 'graph.json');
    if (!fs.existsSync(filePath)) return { nodes: [], edges: [], causal_chains: [] };
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  // --- Auto-save ---

  startAutoSave(getStateFn) {
    if (this._autoSaveTimer) return;
    this._autoSaveTimer = setInterval(() => {
      try {
        const state = getStateFn();
        this.saveSnapshot(state, 'auto');
      } catch (e) { /* silent fail on auto-save */ }
    }, this.options.auto_save_interval);
  }

  stopAutoSave() {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
  }

  // --- Cleanup ---

  getStorageStats() {
    const snapDir = path.join(this.basePath, 'snapshots');
    const memDir = path.join(this.basePath, 'memories');
    
    let totalSize = 0;
    const countFiles = (dir) => {
      if (!fs.existsSync(dir)) return 0;
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        const stat = fs.statSync(path.join(dir, f));
        totalSize += stat.size;
      });
      return files.length;
    };

    return {
      base_path: this.basePath,
      snapshots: countFiles(snapDir),
      memories: countFiles(memDir),
      total_size_kb: Math.round(totalSize / 1024),
      auto_save_active: this._autoSaveTimer !== null
    };
  }

  destroy() {
    this.stopAutoSave();
    // Don't actually delete files — just stop
  }
}

// ============================================================
// STATE MANAGER (Orchestrates Persistence)
// ============================================================

class CognitiveStateManager {
  constructor(options = {}) {
    this.store = new PersistenceStore(options.path, options);
    this.journal = this.store.loadJournal(options.session || 'default');
    this.sessionId = options.session || `session_${Date.now()}`;
    this.dirty = false;
    this.last_save = null;
    this.save_count = 0;
  }

  // Record a state change
  record(operation, data) {
    this.journal.append(operation, data, { session: this.sessionId });
    this.dirty = true;
  }

  // Save current state
  save(state, label = null) {
    const snapshot = this.store.saveSnapshot(state, label || `session_${this.sessionId}`);
    this.store.saveJournal(this.journal, this.sessionId);
    this.dirty = false;
    this.last_save = Date.now();
    this.save_count++;
    return snapshot;
  }

  // Restore from latest or specific snapshot
  restore(snapshotId = null) {
    const snapshot = snapshotId 
      ? this.store.loadSnapshot(snapshotId)
      : this.store.loadLatestSnapshot();
    
    if (!snapshot) return null;
    if (!snapshot.verify()) throw new Error('Snapshot integrity check failed');
    return snapshot.restore();
  }

  // Save long-term memories
  saveMemories(memories, category = 'general') {
    return this.store.saveMemories(memories, category);
  }

  // Load long-term memories
  loadMemories(category = 'general') {
    return this.store.loadMemories(category);
  }

  // Save knowledge graph
  saveKnowledge(graph) {
    return this.store.saveKnowledge(graph);
  }

  // Load knowledge graph
  loadKnowledge() {
    return this.store.loadKnowledge();
  }

  // Get status
  getStatus() {
    return {
      session: this.sessionId,
      dirty: this.dirty,
      last_save: this.last_save,
      save_count: this.save_count,
      journal: this.journal.getStats(),
      storage: this.store.getStorageStats(),
      snapshots: this.store.listSnapshots().slice(0, 5)
    };
  }

  // Cleanup
  destroy() {
    if (this.dirty) {
      // Force save journal before shutdown
      this.store.saveJournal(this.journal, this.sessionId);
    }
    this.store.destroy();
  }
}

module.exports = {
  StateSnapshot,
  StateJournal,
  PersistenceStore,
  CognitiveStateManager
};
