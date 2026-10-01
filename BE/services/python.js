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

const forecastCache = new Map();
const CACHE_TTL_MS = Number(process.env.FORECAST_CACHE_MS || 60_000);

function cacheKey(options) {
  return JSON.stringify({
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
  if (options.model) args.push("--model", String(options.model));
  if (options.date) args.push("--date", String(options.date));
  if (options.weather) args.push("--weather", String(options.weather));
  if (options.temperature != null) args.push("--temperature", String(options.temperature));

  const value = await runScript("predict.py", args);

  forecastCache.clear();
  forecastCache.set(key, { at: Date.now(), value });
  return { ...value, cached: false };
}

function clearForecastCache() {
  forecastCache.clear();
}

// ---- Benchmark cache ------------------------------------------------------
// The backtest is expensive (hundreds of row builds), so cache it much longer.

const BENCHMARK_TTL_MS = Number(process.env.BENCHMARK_CACHE_MS || 600_000);
let benchmarkCache = null;

async function getBenchmark({ days = 30, model = null } = {}) {
  if (benchmarkCache && Date.now() - benchmarkCache.at < BENCHMARK_TTL_MS) {
    return { ...benchmarkCache.value, cached: true };
  }

  const args = ["--days", String(days)];
  if (model) args.push("--model", String(model));

  const value = await runScript("benchmark.py", args, { timeout: TRAIN_TIMEOUT_MS });
  benchmarkCache = { at: Date.now(), value };
  return { ...value, cached: false };
}

function appendDailyLog(payload) {
  return runScript("append_daily_log.py", [], {
    timeout: TRAIN_TIMEOUT_MS,
    stdinData: JSON.stringify(payload),
  });
}

function trainIncremental(options = {}) {
  const args = [];
  if (options.tailDays != null) args.push("--tail-days", String(options.tailDays));
  if (options.rounds != null) args.push("--rounds", String(options.rounds));
  return runScript("incremental_train.py", args, { timeout: TRAIN_TIMEOUT_MS });
}

function pythonInfo() {
  const python = resolvePython();
  return {
    python,
    mlDir: ML_DIR,
    venv: fs.existsSync(VENV_PYTHON),
  };
}

module.exports = {
  ML_DIR,
  SRC_DIR,
  appendDailyLog,
  clearForecastCache,
  getBenchmark,
  getForecast,
  pythonInfo,
  runScript,
  trainIncremental,
};
