/**
 * Bridge between the Express API and the Python/LightGBM layer.
 *
 * Each ML script is a standalone CLI that prints a single JSON object on
 * stdout. This module spawns them, enforces a timeout, and parses the result.
 */

const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const ML_DIR = path.resolve(__dirname, "..", "..", "ML");
const SRC_DIR = path.join(ML_DIR, "src");
const VENV_PYTHON = path.join(ML_DIR, "venv", "bin", "python");

const DEFAULT_TIMEOUT_MS = 60_000;
const TRAIN_TIMEOUT_MS = 180_000;

function resolvePython() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON;
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Run a python script and resolve with its parsed JSON payload.
 * Rejects with an Error carrying `.detail` for diagnostics.
 */
function runScript(script, args = [], { timeout = DEFAULT_TIMEOUT_MS, stdinData = null } = {}) {
  return new Promise((resolve, reject) => {
    const python = resolvePython();
    const child = spawn(python, [path.join(SRC_DIR, script), ...args], {
      cwd: ML_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      const err = new Error(`Python script '${script}' timed out after ${timeout}ms`);
      err.detail = stderr.trim();
      reject(err);
    }, timeout);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const wrapped = new Error(`Failed to start python (${python}): ${err.message}`);
      wrapped.detail = stderr.trim();
      reject(wrapped);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const line = lastJsonObject(stdout);

      if (!line) {
        const err = new Error(
          `Python script '${script}' produced no JSON (exit code ${code})`
        );
        err.detail = (stderr.trim() || stdout.trim()).slice(-2000);
        reject(err);
        return;
      }

      try {
        const parsed = JSON.parse(line);
        if (parsed.status === "error") {
          const err = new Error(parsed.message || "Python script reported an error");
          err.detail = stderr.trim();
          err.payload = parsed;
          reject(err);
          return;
        }
        resolve(parsed);
      } catch (parseError) {
        const err = new Error(`Could not parse JSON from '${script}': ${parseError.message}`);
        err.detail = stdout.trim().slice(-2000);
        reject(err);
      }
    });

    if (stdinData != null) {
      child.stdin.write(stdinData);
    }
    child.stdin.end();
  });
}

/** ML scripts print diagnostics to stderr, so grab the last {...} line of stdout. */
function lastJsonObject(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].startsWith("{") && lines[i].endsWith("}")) return lines[i];
  }
  return null;
}

// ---- Forecast cache -------------------------------------------------------
// Predicting spawns a python process; cache briefly so page refreshes are cheap.
// The cache is keyed per store: each store has its own history and model.

const forecastCache = new Map();
const CACHE_TTL_MS = Number(process.env.FORECAST_CACHE_MS || 60_000);

function cacheKey(options) {
  return JSON.stringify({
    storeId: options.storeId || null,
    date: options.date || null,
    weather: options.weather || null,
    temperature: options.temperature ?? null,
    model: options.model || null,
  });
}

async function getForecast(options = {}) {
  const key = cacheKey(options);
  const hit = forecastCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ...hit.value, cached: true };
  }

  const args = [];
  if (options.storeId) args.push("--store", String(options.storeId));
  if (options.model) args.push("--model", String(options.model));
  if (options.date) args.push("--date", String(options.date));
  if (options.weather) args.push("--weather", String(options.weather));
  if (options.temperature != null) args.push("--temperature", String(options.temperature));

  const value = await runScript("predict.py", args);

  forecastCache.set(key, { at: Date.now(), value });
  return { ...value, cached: false };
}

function clearForecastCache() {
  forecastCache.clear();
}

// ---- Benchmark cache ------------------------------------------------------
// The backtest is expensive (hundreds of row builds), so cache it much longer.
// Keyed per store/day-window because every store backtests its own history.

const BENCHMARK_TTL_MS = Number(process.env.BENCHMARK_CACHE_MS || 600_000);
const benchmarkCache = new Map();

async function getBenchmark({ days = 30, model = null, storeId = null } = {}) {
  const key = JSON.stringify({ storeId, days, model });
  const hit = benchmarkCache.get(key);
  if (hit && Date.now() - hit.at < BENCHMARK_TTL_MS) {
    return { ...hit.value, cached: true };
  }

  const args = ["--days", String(days)];
  if (model) args.push("--model", String(model));
  if (storeId) args.push("--store", String(storeId));

  const value = await runScript("benchmark.py", args, { timeout: TRAIN_TIMEOUT_MS });
  benchmarkCache.set(key, { at: Date.now(), value });
  return { ...value, cached: false };
}

function appendDailyLog(payload, storeId = null) {
  const args = storeId ? ["--store", String(storeId)] : [];
  return runScript("append_daily_log.py", args, {
    timeout: TRAIN_TIMEOUT_MS,
    stdinData: JSON.stringify(payload),
  });
}

function trainIncremental(options = {}) {
  const args = [];
  if (options.storeId) args.push("--store", String(options.storeId));
  if (options.tailDays != null) args.push("--tail-days", String(options.tailDays));
  if (options.rounds != null) args.push("--rounds", String(options.rounds));
  return runScript("incremental_train.py", args, { timeout: TRAIN_TIMEOUT_MS });
}

/**
 * Import a pre-existing sales file into the store's dataset.
 *
 * `menuFile` is a JSON sidecar the caller writes, listing the store's items, so
 * the importer can resolve the uploaded product names or codes against them.
 */
function importSales({ storeId, file, menuFile, sheet, dryRun = false } = {}) {
  const args = ["--store", String(storeId), "--file", String(file)];
  if (menuFile) args.push("--menu", String(menuFile));
  if (sheet) args.push("--sheet", String(sheet));
  if (dryRun) args.push("--dry-run");
  return runScript("import_sales.py", args, { timeout: TRAIN_TIMEOUT_MS });
}

/**
 * Derive a store's ML history + feature matrix from its imported dataset.
 *
 * This is the bridge the import needs: uploading a back-catalogue writes only
 * ML/salesHistory/<id>/datasets/<id>.csv, but the forecast reads
 * salesHistory/<id>/raw and salesHistory/<id>/processed.
 * `weatherFile` is a JSON map { "YYYY-MM-DD": { weather, temperature } } and
 * `menuFile` carries item categories; either may be omitted.
 */
function rebuildStoreHistory({ storeId, weatherFile, menuFile, skipFeatures = false } = {}) {
  const args = ["--store", String(storeId)];
  if (weatherFile) args.push("--weather", String(weatherFile));
  if (menuFile) args.push("--menu", String(menuFile));
  if (skipFeatures) args.push("--skip-features");
  return runScript("rebuild_store_history.py", args, { timeout: TRAIN_TIMEOUT_MS });
}

function pythonInfo() {
  const python = resolvePython();
  return {
    python,
    mlDir: ML_DIR,
    venv: fs.existsSync(VENV_PYTHON),
  };
}

// ---- Per-store ML files ---------------------------------------------------
// Mirrors ML/src/store_paths.py: a store's artifacts live under
// ML/salesHistory/<storeId>/{datasets,raw,processed,models}/. The store document
// no longer keeps its own copy, so these are how the API answers "does this
// store have any history yet?"

const SALES_HISTORY_ROOT = path.join(ML_DIR, "salesHistory");
const UNSAFE_ID = /[^A-Za-z0-9_-]/g;

function storeHistoryPath(storeId) {
  const safe = String(storeId || "").trim().replace(UNSAFE_ID, "");
  if (!safe) return null;
  return path.join(SALES_HISTORY_ROOT, safe, "raw", "historical_sales.csv");
}

/** True when the ML layer already holds a history file for this store. */
function hasStoreHistory(storeId) {
  const file = storeHistoryPath(storeId);
  return Boolean(file) && fs.existsSync(file);
}

const DATASET_DIR = path.join(SALES_HISTORY_ROOT);

function datasetPath(storeId) {
  const safe = String(storeId || "").trim().replace(UNSAFE_ID, "");
  if (!safe) return null;
  return path.join(DATASET_DIR, safe, "datasets", `${safe}.csv`);
}

/**
 * { from, to } min/max date present in a store's imported dataset, or null when
 * the dataset is missing or has no usable date column. Used to size the weather
 * backfill so a rebuild fetches only the days the store actually has.
 */
function datasetSpan(storeId) {
  const file = datasetPath(storeId);
  if (!file || !fs.existsSync(file)) return null;

  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }

  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;

  const dateIndex = lines[0].split(",").indexOf("date");
  if (dateIndex === -1) return null;

  let min = null;
  let max = null;
  for (let i = 1; i < lines.length; i += 1) {
    const value = lines[i].split(",")[dateIndex]?.trim();
    if (!value) continue;
    if (min == null || value < min) min = value;
    if (max == null || value > max) max = value;
  }
  return min && max ? { from: min, to: max } : null;
}

/**
 * Distinct dates in a store's ML history, or 0 when it has none.
 *
 * The date column is always first, so a plain split is safe even when a later
 * column (item_name) contains a quoted comma.
 */
function storeHistoryDays(storeId) {
  const file = storeHistoryPath(storeId);
  if (!file) return 0;

  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return 0;
  }

  const lines = text.split("\n");
  if (!lines.length) return 0;

  const dateIndex = lines[0].split(",").indexOf("date");
  if (dateIndex === -1) return 0;

  const dates = new Set();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const value = line.split(",")[dateIndex];
    if (value && value.trim()) dates.add(value.trim());
  }
  return dates.size;
}

module.exports = {
  ML_DIR,
  SRC_DIR,
  appendDailyLog,
  clearForecastCache,
  datasetPath,
  datasetSpan,
  getBenchmark,
  getForecast,
  hasStoreHistory,
  importSales,
  pythonInfo,
  rebuildStoreHistory,
  runScript,
  storeHistoryDays,
  storeHistoryPath,
  trainIncremental,
};
