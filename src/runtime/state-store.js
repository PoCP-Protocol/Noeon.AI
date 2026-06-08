const fs = require("fs");
const path = require("path");

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function defaultState() {
  return {
    version: 1,
    rounds: [],
    currentPolicy: null,
    updatedAt: new Date().toISOString()
  };
}

function loadState(filePath) {
  if (!filePath) {
    return defaultState();
  }
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return defaultState();
  }

  const raw = fs.readFileSync(resolved, "utf8");
  const parsed = JSON.parse(raw);
  return {
    ...defaultState(),
    ...parsed
  };
}

function saveState(filePath, state) {
  if (!filePath) {
    return;
  }
  const resolved = path.resolve(process.cwd(), filePath);
  ensureDirFor(resolved);
  fs.writeFileSync(
    resolved,
    JSON.stringify(
      {
        ...state,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
}

function rollbackState(filePath, steps = 1) {
  const state = loadState(filePath);
  if (!Array.isArray(state.rounds) || state.rounds.length === 0) {
    return state;
  }

  const toDrop = Math.max(1, Number(steps) || 1);
  state.rounds = state.rounds.slice(0, Math.max(0, state.rounds.length - toDrop));
  const lastRound = state.rounds.length > 0 ? state.rounds[state.rounds.length - 1] : null;
  state.currentPolicy = lastRound ? lastRound.updates : null;

  if (lastRound && lastRound.nextMemorySnapshot) {
    state.currentNextMemory = lastRound.nextMemorySnapshot;
  } else {
    delete state.currentNextMemory;
  }

  saveState(filePath, state);
  return state;
}

module.exports = {
  loadState,
  saveState,
  rollbackState
};
