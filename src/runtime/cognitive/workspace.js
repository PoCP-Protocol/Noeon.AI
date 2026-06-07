/**
 * Global Workspace - Inspired by Baars' Global Workspace Theory
 * 
 * The workspace is a shared memory area with limited capacity,
 * attention-weighted slots, and time-based decay. All cognitive
 * modules (perception, reasoning, memory) read/write here.
 * 
 * Brain analogy: Prefrontal cortex + thalamic relay
 */

class WorkspaceSlot {
  constructor(key, value, weight = 1.0) {
    this.key = key;
    this.value = value;
    this.weight = weight;
    this.createdAt = Date.now();
    this.lastAccessedAt = Date.now();
    this.accessCount = 0;
  }

  access() {
    this.lastAccessedAt = Date.now();
    this.accessCount += 1;
    return this.value;
  }

  age() {
    return Date.now() - this.createdAt;
  }

  idleTime() {
    return Date.now() - this.lastAccessedAt;
  }
}

class GlobalWorkspace {
  constructor(config = {}) {
    this.name = config.name || "default";
    this.capacity = config.capacity || 7; // Miller's 7±2
    this.decay = config.decay || "time_based";
    this.ttl = (config.ttl || 30) * 1000; // convert to ms
    this.slots = new Map();
    this.history = [];
    this.listeners = new Map();
    this.broadcastLog = [];
  }

  /**
   * Focus: Bring information into conscious awareness (workspace)
   * Only items with sufficient attention weight enter the workspace.
   */
  focus(key, value, weight = 1.0) {
    if (this.slots.size >= this.capacity) {
      this._evict();
    }

    const slot = new WorkspaceSlot(key, value, weight);
    this.slots.set(key, slot);
    this._broadcast("focus", { key, value, weight });
    return slot;
  }

  /**
   * Retrieve: Access a slot (refreshes its timestamp)
   */
  retrieve(key) {
    const slot = this.slots.get(key);
    if (!slot) return null;

    if (this._isExpired(slot)) {
      this.slots.delete(key);
      this._moveToHistory(slot);
      return null;
    }

    return slot.access();
  }

  /**
   * Broadcast: Share information across all listening modules
   * This is the core GWT mechanism - making information globally available.
   */
  broadcast(message, source) {
    const entry = {
      timestamp: Date.now(),
      source,
      message,
      receivers: []
    };

    for (const [name, handler] of this.listeners) {
      try {
        handler(message, source);
        entry.receivers.push(name);
      } catch (e) {
        entry.receivers.push(`${name}:ERROR`);
      }
    }

    this.broadcastLog.push(entry);
    return entry;
  }

  /**
   * Subscribe: Register a cognitive module as a listener
   */
  subscribe(moduleName, handler) {
    this.listeners.set(moduleName, handler);
  }

  /**
   * Unsubscribe: Remove a listener
   */
  unsubscribe(moduleName) {
    this.listeners.delete(moduleName);
  }

  /**
   * Snapshot: Get current workspace state (for metacognition)
   */
  snapshot() {
    const items = [];
    for (const [key, slot] of this.slots) {
      if (this._isExpired(slot)) {
        this.slots.delete(key);
        this._moveToHistory(slot);
        continue;
      }
      items.push({
        key,
        value: slot.value,
        weight: slot.weight,
        age: slot.age(),
        accessCount: slot.accessCount
      });
    }
    return {
      name: this.name,
      capacity: this.capacity,
      used: items.length,
      items: items.sort((a, b) => b.weight - a.weight)
    };
  }

  /**
   * Evict: Remove the least relevant item (lowest weight × recency)
   */
  _evict() {
    let minScore = Infinity;
    let minKey = null;

    for (const [key, slot] of this.slots) {
      if (this._isExpired(slot)) {
        this.slots.delete(key);
        this._moveToHistory(slot);
        continue;
      }
      // Score = weight * recency_factor
      const recency = 1 / (1 + slot.idleTime() / 1000);
      const score = slot.weight * recency;
      if (score < minScore) {
        minScore = score;
        minKey = key;
      }
    }

    if (minKey) {
      const slot = this.slots.get(minKey);
      this.slots.delete(minKey);
      this._moveToHistory(slot);
    }
  }

  _isExpired(slot) {
    if (this.decay === "none") return false;
    if (this.decay === "time_based") {
      return slot.age() > this.ttl;
    }
    if (this.decay === "access_based") {
      return slot.idleTime() > this.ttl;
    }
    return false;
  }

  _moveToHistory(slot) {
    this.history.push({
      key: slot.key,
      value: slot.value,
      lifespan: slot.age(),
      accessCount: slot.accessCount,
      archivedAt: Date.now()
    });
    // Keep history bounded
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  _broadcast(event, data) {
    this.broadcast({ event, ...data }, "workspace");
  }

  /**
   * Clear: Reset workspace (sleep/reset cycle)
   */
  clear() {
    for (const [key, slot] of this.slots) {
      this._moveToHistory(slot);
    }
    this.slots.clear();
  }
}

module.exports = { GlobalWorkspace, WorkspaceSlot };
