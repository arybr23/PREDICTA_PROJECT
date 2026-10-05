/**
 * Bridge between the Express API and the Python/LightGBM layer.
 *
 * Two modes:
 *   1. HTTP (default when ML_API_URL is set) — calls the FastAPI service on
 *      port 5001. No subprocess spawning, timeout handled by AbortController.
 *   2. Subprocess — spawns the Python scripts directly.
 *
 * HTTP is preferred but never a hard dependency: when the service cannot be
 * reached at all (connection refused, unknown host), the call transparently
 * falls back to the subprocess path so the API keeps working. Errors the
 * service reports about the ML work itself ({"status": "error", ...}, or a 500
 * carrying one) are surfaced as-is and never retried — the service is up, the
 * job genuinely failed.
 *
 * To start the FastAPI service:
 *   npm run ml:api          (from the repo root)
 *   cd ML && ./venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 5001
 *
 * Environment:
 *   ML_API_URL=http://127.0.0.1:5001   (optional, unset = subprocess mode)
 */

const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const ML_DIR = path.resolve(__dirname, "..", "..", "ML");
const SRC_DIR = path.join(ML_DIR, "src");
const VENV_PYTHON = path.join(ML_DIR, "venv", "bin", "python");

const ML_API_URL = (process.env.ML_API_URL || "").replace(/\/$/, "");
const USE_HTTP = Boolean(ML_API_URL);

const DEFAULT_TIMEOUT_MS = 60_000;
const TRAIN_TIMEOUT_MS = 180_000;

function resolvePython() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON;
  return process.platform === "win32" ? "python" : "python3";
}

// ---------------------------------------------------------------------------
// HTTP mode — call FastAPI endpoints
// ---------------------------------------------------------------------------

// Transport failures only: the service was never there to answer. Anything it
// answered with (application error, 500 from a crashed script) is a real result
// and is never retried elsewhere.
const UNREACHABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "EPIPE",
]);

function markUnreachable(err) {
  const code = err && err.cause && err.cause.code;
  if (code && UNREACHABLE_CODES.has(code)) err.unreachable = true;
  else if (!code && /fetch failed/i.test((err && err.message) || "")) err.unreachable = true;
  return err;
}

async function httpPost(endpoint, body, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const url = `${ML_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`ML API ${endpoint} returned ${res.status}: ${text.slice(0, 500)}`);
      err.payload = safeJson(text);
      throw err;
    }

    const data = await res.json();
    if (data.status === "error") {
      const err = new Error(data.message || `ML API error on ${endpoint}`);
      err.payload = data;
      err.detail = data.detail;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`ML API ${endpoint} timed out after ${timeoutMs}ms`);
    }
    throw markUnreachable(err);
  }
}

async function httpGet(endpoint, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const url = `${ML_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`ML API ${endpoint} returned ${res.status}: ${text.slice(0, 500)}`);
      err.payload = safeJson(text);
      throw err;
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`ML API ${endpoint} timed out after ${timeoutMs}ms`);
    }
    throw markUnreachable(err);
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Try the ML service; if it is not reachable, run the script here instead.
 * `runSubprocess` is only invoked for transport failures, never for an answer
 * the service actually gave.
 */
async function callML(endpoint, body, timeoutMs, runSubprocess) {
  try {
    return await httpPost(endpoint, body, timeoutMs);
  } catch (err) {
    if (!err.unreachable) throw err;
    console.warn(`[ml] ${endpoint} unreachable (${err.cause && err.cause.code}) — falling back to subprocess`);
    return runSubprocess();
  }
}

async function callMLGet(endpoint, timeoutMs, runLocal) {
  try {
    return await httpGet(endpoint, timeoutMs);
  } catch (err) {
    if (!err.unreachable) throw err;
    console.warn(`[ml] ${endpoint} unreachable (${err.cause && err.cause.code}) — reading local files instead`);
    return runLocal();
  }
}

// ---------------------------------------------------------------------------
// Subprocess mode (fallback when FastAPI is not available)
// ---------------------------------------------------------------------------

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
        const err = new Error(`Python script '${script}' produced no JSON (exit code ${code})`);
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

function lastJsonObject(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].startsWith("{") && lines[i].endsWith("}")) return lines[i];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Operations — HTTP first, subprocess when the service is unreachable
// ---------------------------------------------------------------------------

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

  const value = USE_HTTP
    ? await callML(
        "/predict",
        {
          storeId: options.storeId || null,
          date: options.date || null,
          weather: options.weather || null,
          temperature: options.temperature ?? null,
          model: options.model || null,
        },
        DEFAULT_TIMEOUT_MS,
        () => runScript("predict.py", args),
      )
    : await runScript("predict.py", args);

  forecastCache.set(key, { at: Date.now(), value });
  return { ...value, cached: false };
}

function clearForecastCache() {
  forecastCache.clear();
}

// ---- Benchmark -----------------------------------------------------------

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

  const value = USE_HTTP
    ? await callML("/benchmark", { days, model, storeId }, TRAIN_TIMEOUT_MS, () =>
        runScript("benchmark.py", args, { timeout: TRAIN_TIMEOUT_MS }),
      )
    : await runScript("benchmark.py", args, { timeout: TRAIN_TIMEOUT_MS });

  benchmarkCache.set(key, { at: Date.now(), value });
  return { ...value, cached: false };
}

// ---- Append daily log ----------------------------------------------------

async function appendDailyLog(payload, storeId = null) {
  const run = () =>
    runScript("append_daily_log.py", storeId ? ["--store", String(storeId)] : [], {
      timeout: TRAIN_TIMEOUT_MS,
      stdinData: JSON.stringify(payload),
    });
  return USE_HTTP ? callML("/append-log", { storeId, payload }, TRAIN_TIMEOUT_MS, run) : run();
}

// ---- Train ---------------------------------------------------------------

async function trainIncremental(options = {}) {
  const args = [];
  if (options.storeId) args.push("--store", String(options.storeId));
  if (options.tailDays != null) args.push("--tail-days", String(options.tailDays));
  if (options.rounds != null) args.push("--rounds", String(options.rounds));

  const run = () => runScript("incremental_train.py", args, { timeout: TRAIN_TIMEOUT_MS });
  if (!USE_HTTP) return run();

  return callML(
    "/train",
    {
      storeId: options.storeId || null,
      tailDays: options.tailDays ?? null,
      rounds: options.rounds ?? null,
    },
    TRAIN_TIMEOUT_MS,
    run,
  );
}

// ---- Import sales --------------------------------------------------------

async function importSales({ storeId, file, menuFile, sheet, dryRun = false } = {}) {
  const args = ["--store", String(storeId), "--file", String(file)];
  if (menuFile) args.push("--menu", String(menuFile));
  if (sheet) args.push("--sheet", String(sheet));
  if (dryRun) args.push("--dry-run");

  const run = () => runScript("import_sales.py", args, { timeout: TRAIN_TIMEOUT_MS });
  if (!USE_HTTP) return run();

  return callML(
    "/import-sales",
    { storeId, file, menuFile, sheet, dryRun },
    TRAIN_TIMEOUT_MS,
    run,
  );
}

// ---- Rebuild history -----------------------------------------------------

async function rebuildStoreHistory({ storeId, weatherFile, menuFile, skipFeatures = false } = {}) {
  const args = ["--store", String(storeId)];
  if (weatherFile) args.push("--weather", String(weatherFile));
  if (menuFile) args.push("--menu", String(menuFile));
  if (skipFeatures) args.push("--skip-features");

  const run = () => runScript("rebuild_store_history.py", args, { timeout: TRAIN_TIMEOUT_MS });
  if (!USE_HTTP) return run();

  return callML(
    "/rebuild",
    { storeId, weatherFile, menuFile, skipFeatures },
    TRAIN_TIMEOUT_MS,
    run,
  );
}

// ---- Info ----------------------------------------------------------------

/**
 * What /api/health reports about the Python layer. In HTTP mode the service is
 * pinged, so `reachable: false` means ML_API_URL is set but nothing answers
 * there (calls will be falling back to subprocess).
 */
async function pythonInfo() {
  if (USE_HTTP) {
    const info = { mode: "http", mlApiUrl: ML_API_URL, reachable: false };
    try {
      const health = await httpGet("/health", 3000);
      info.reachable = true;
      info.python = health.python;
      info.mlDir = health.ml_dir;
    } catch (err) {
      info.error = err.message;
    }
    return info;
  }
  const python = resolvePython();
  return {
    mode: "subprocess",
    python,
    mlDir: ML_DIR,
    venv: fs.existsSync(VENV_PYTHON),
  };
}

// ---- Per-store ML files --------------------------------------------------
// These read the local filesystem on purpose: the API and the ML layer share
// ML/salesHistory/<storeId>/, so an existence check or a header read needs no
// network hop. (The FastAPI service exposes /has-store-history,
// /dataset-path and /store-history-path as debug equivalents.)

const SALES_HISTORY_ROOT = path.join(ML_DIR, "salesHistory");
const UNSAFE_ID = /[^A-Za-z0-9_-]/g;

function storeHistoryPath(storeId) {
  const safe = String(storeId || "").trim().replace(UNSAFE_ID, "");
  if (!safe) return null;
  return path.join(SALES_HISTORY_ROOT, safe, "raw", "historical_sales.csv");
}

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

async function datasetSpan(storeId) {
  // The local reader answers with the same envelope the service returns, so a
  // mid-call fallback is invisible to the caller.
  const readLocal = () => {
    const file = datasetPath(storeId);
    if (!file || !fs.existsSync(file)) return { span: null };

    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      return { span: null };
    }

    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return { span: null };

    const dateIndex = lines[0].split(",").indexOf("date");
    if (dateIndex === -1) return { span: null };

    let min = null;
    let max = null;
    for (let i = 1; i < lines.length; i += 1) {
      const value = lines[i].split(",")[dateIndex]?.trim();
      if (!value) continue;
      if (min == null || value < min) min = value;
      if (max == null || value > max) max = value;
    }
    return { span: min && max ? { from: min, to: max } : null };
  };

  if (!USE_HTTP) return readLocal().span;

  const data = await callMLGet(`/dataset-span/${encodeURIComponent(storeId)}`, DEFAULT_TIMEOUT_MS, readLocal);
  return data.span;
}

async function storeHistoryDays(storeId) {
  const readLocal = () => {
    const file = storeHistoryPath(storeId);
    if (!file) return { days: 0 };

    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      return { days: 0 };
    }

    const lines = text.split("\n");
    if (!lines.length) return { days: 0 };

    const dateIndex = lines[0].split(",").indexOf("date");
    if (dateIndex === -1) return { days: 0 };

    const dates = new Set();
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) continue;
      const value = line.split(",")[dateIndex];
      if (value && value.trim()) dates.add(value.trim());
    }
    return { days: dates.size };
  };

  if (!USE_HTTP) return readLocal().days;

  const data = await callMLGet(`/store-history-days/${encodeURIComponent(storeId)}`, DEFAULT_TIMEOUT_MS, readLocal);
  return data.days;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

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
