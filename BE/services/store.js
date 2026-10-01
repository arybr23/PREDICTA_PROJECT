/**
 * Lightweight JSON-file persistence.
 *
 * The Mongoose models (Firms / Accounts / Stores) remain the intended
 * long-term store, but they need a running MongoDB. This module keeps the API
 * fully functional without one: everything is written to BE/data/store.json.
 *
 * Swapping to Mongo later only requires reimplementing the exported functions.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const { initialStock } = require("../config/firm");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const EMPTY_STATE = {
  stockouts: {},
  transactions: [],
  dailyLogs: {},
  recipeOverrides: {},
  stock: null,
  training: {
    day: 0,
    lastTrainedAt: null,
    lastStatus: null,
    lastResult: null,
  },
};

let cache = null;
let writeQueue = Promise.resolve();

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readState() {
  if (cache) return cache;

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    cache = { ...structuredClone(EMPTY_STATE), ...JSON.parse(raw) };
    cache.training = { ...EMPTY_STATE.training, ...(cache.training || {}) };
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn(`[store] Could not read ${STORE_PATH}: ${err.message}`);
    }
    cache = structuredClone(EMPTY_STATE);
  }

  return cache;
}

async function writeState() {
  const state = await readState();
  await ensureDir();

  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STORE_PATH);
}

/** Serialise writes so concurrent requests cannot clobber each other. */
function persist() {
  writeQueue = writeQueue.then(writeState).catch((err) => {
    console.error(`[store] Write failed: ${err.message}`);
  });
  return writeQueue;
}

async function mutate(fn) {
  const state = await readState();
  const result = fn(state);
  await persist();
  return result;
}

// ---- Stockouts ------------------------------------------------------------

async function getStockouts() {
  const state = await readState();
  return { ...state.stockouts };
}

async function setStockout(itemId, isOut) {
  return mutate((state) => {
    if (isOut) state.stockouts[itemId] = true;
    else delete state.stockouts[itemId];
    return { ...state.stockouts };
  });
}

// ---- Transactions ---------------------------------------------------------

const MAX_TRANSACTIONS = 500;

async function addTransaction(transaction) {
  return mutate((state) => {
    state.transactions.unshift(transaction);
    if (state.transactions.length > MAX_TRANSACTIONS) {
      state.transactions.length = MAX_TRANSACTIONS;
    }
    return transaction;
  });
}

async function listTransactions(limit = 50) {
  const state = await readState();
  return state.transactions.slice(0, limit);
}

// ---- Daily logs -----------------------------------------------------------

async function saveDailyLog(date, log) {
  return mutate((state) => {
    state.dailyLogs[date] = log;
    return log;
  });
}

async function getDailyLog(date) {
  const state = await readState();
  return state.dailyLogs[date] || null;
}

async function listDailyLogs() {
  const state = await readState();
  return Object.entries(state.dailyLogs)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, log]) => ({ date, ...log }));
}

// ---- Recipe overrides -----------------------------------------------------

async function getRecipeOverrides() {
  const state = await readState();
  return { ...state.recipeOverrides };
}

async function setRecipeOverride(itemId, recipe) {
  return mutate((state) => {
    state.recipeOverrides[itemId] = recipe;
    return { ...state.recipeOverrides };
  });
}

// ---- Ingredient stock -----------------------------------------------------
// The seed is deterministic, so it does not need persisting until it is edited.

async function getStock() {
  const state = await readState();
  if (!Array.isArray(state.stock) || state.stock.length === 0) {
    state.stock = initialStock();
  }
  return state.stock.map((item) => ({ ...item }));
}

async function setStockLevel(ingredient, unit, onHand) {
  return mutate((state) => {
    if (!Array.isArray(state.stock) || state.stock.length === 0) {
      state.stock = initialStock();
    }
    const row = state.stock.find((s) => s.ingredient === ingredient && s.unit === unit);
    if (!row) return null;
    row.onHand = onHand;
    return { ...row };
  });
}

// ---- Training / adaptation ------------------------------------------------

async function getTraining() {
  const state = await readState();
  return { ...state.training };
}

async function recordTraining(result) {
  return mutate((state) => {
    state.training.day += 1;
    state.training.lastTrainedAt = new Date().toISOString();
    state.training.lastStatus = result.status || (result.error ? "error" : "success");
    state.training.lastResult = result;
    return { ...state.training };
  });
}

module.exports = {
  STORE_PATH,
  addTransaction,
  getDailyLog,
  getRecipeOverrides,
  getStock,
  getStockouts,
  getTraining,
  listDailyLogs,
  listTransactions,
  readState,
  recordTraining,
  saveDailyLog,
  setRecipeOverride,
  setStockLevel,
  setStockout,
};
