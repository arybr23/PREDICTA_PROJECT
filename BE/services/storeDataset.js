/**
 * Per-store sales datasets.
 *
 * Every store owns exactly one CSV under ML/salesHistory/<storeId>/datasets/,
 * named after its store id. Store ids are unique (enforced by the Stores schema
 * and by generateStoreId's collision check), so the file name is a stable key
 * and no store can ever read another store's rows.
 *
 * Layout — one row per item per day:
 *
 *     date,item_id,item_name,units_sold,stockout
 *     2026-10-04,P01,Nasi Goreng Spesial,42,0
 *     2026-10-04,P08,Es Teh Manis,88,1
 *
 * This is the same grain the ML layer trains on, so a store's dataset can be
 * handed straight to the feature pipeline without reshaping.
 *
 * Rows are *upserted*, and the values written are the caller's running totals
 * for that day — not deltas. Writing the same day twice therefore converges on
 * the same file instead of double-counting.
 */

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const ML_DIR = path.resolve(__dirname, "..", "..", "ML");
const SALES_HISTORY_ROOT = path.join(ML_DIR, "salesHistory");

const COLUMNS = ["date", "item_id", "item_name", "units_sold", "stockout"];
const HEADER = COLUMNS.join(",");

const UNSAFE_ID = /[^A-Za-z0-9_-]/g;

/** Keep store ids filesystem-safe; they arrive from the API layer. */
function safeStoreId(storeId) {
  const cleaned = String(storeId || "").trim().replace(UNSAFE_ID, "");
  if (!cleaned) throw new Error("store id is empty");
  return cleaned;
}

function datasetPath(storeId) {
  return path.join(
    SALES_HISTORY_ROOT,
    safeStoreId(storeId),
    "datasets",
    `${safeStoreId(storeId)}.csv`,
  );
}

// ---- CSV primitives -------------------------------------------------------
// The backend has no CSV dependency, and the column set is fixed and small, so
// a minimal RFC-4180 subset is enough: quote any cell containing a comma,
// quote or newline, and double up embedded quotes.

function escapeCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  cells.push(current);
  return cells;
}

function toRow(cells) {
  const row = {};
  COLUMNS.forEach((column, index) => {
    row[column] = cells[index] ?? "";
  });
  return row;
}

function rowKey(row) {
  return `${row.date}::${row.item_id}`;
}

function serialise(row) {
  return [
    escapeCell(row.date),
    escapeCell(row.item_id),
    // A newline in an item name would break the line-per-row format.
    escapeCell(String(row.item_name ?? "").replace(/[\r\n]+/g, " ")),
    escapeCell(Number(row.units_sold) || 0),
    escapeCell(row.stockout ? 1 : 0),
  ].join(",");
}

// ---- Per-store write serialisation ---------------------------------------
// The dataset is a read-modify-write file, so two concurrent checkouts on the
// same store could otherwise interleave and lose one another's rows. Each
// store gets its own promise chain; different stores never block each other.

const queues = new Map();

function withStoreLock(storeId, task) {
  const previous = queues.get(storeId) || Promise.resolve();
  const run = previous.then(task, task);
  // Keep the chain alive even when this task rejects.
  queues.set(storeId, run.then(() => undefined, () => undefined));
  return run;
}

// ---- Public API -----------------------------------------------------------

/** Read every row for a store. Returns [] when the dataset does not exist yet. */
async function readRows(storeId) {
  const file = datasetPath(storeId);
  let text;
  try {
    text = await fsp.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const lines = text.split("\n").filter((line) => line.trim());
  if (!lines.length) return [];

  // Drop the header, but only if it really is one.
  const start = lines[0].split(",")[0] === "date" ? 1 : 0;
  return lines.slice(start).map((line) => toRow(parseLine(line)));
}

/**
 * Upsert one row per item for a date.
 *
 * `entries` are the caller's running totals for that day, so this overwrites
 * rather than accumulates. Returns the day count for the store afterwards.
 */
async function upsertDailySales(storeId, date, entries) {
  if (!date) throw new Error("date is required");
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error("entries must be a non-empty array");
  }

  return withStoreLock(storeId, async () => {
    const file = datasetPath(storeId);
    const rows = await readRows(storeId);
    const byKey = new Map(rows.map((row) => [rowKey(row), row]));

    for (const entry of entries) {
      const itemId = String(entry.item_id || "").trim();
      if (!itemId) continue;

      const next = {
        date,
        item_id: itemId,
        item_name: entry.item_name || itemId,
        units_sold: Math.max(0, Math.round(Number(entry.units_sold) || 0)),
        stockout: entry.stockout ? 1 : 0,
      };
      byKey.set(rowKey(next), next);
    }

    const merged = [...byKey.values()].sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) ||
        String(a.item_id).localeCompare(String(b.item_id)),
    );

    await fsp.mkdir(path.dirname(file), { recursive: true });
    const body = [HEADER, ...merged.map(serialise)].join("\n");
    await fsp.writeFile(file, `${body}\n`, "utf8");

    return {
      path: file,
      rows: merged.length,
      days: new Set(merged.map((row) => row.date)).size,
    };
  });
}

/** Distinct dates for a store, newest first. */
async function listDays(storeId) {
  const rows = await readRows(storeId);
  return [...new Set(rows.map((row) => row.date))].sort((a, b) =>
    String(b).localeCompare(String(a)),
  );
}

/** Rows for one date. Returns [] when that day has nothing recorded. */
async function rowsForDate(storeId, date) {
  const rows = await readRows(storeId);
  return rows
    .filter((row) => row.date === date)
    .map((row) => ({
      item_id: row.item_id,
      item_name: row.item_name,
      units_sold: Number(row.units_sold) || 0,
      stockout: row.stockout === 1 || row.stockout === "1" || row.stockout === true,
    }));
}

/**
 * Whether a date already has rows.
 *
 * The dataset is the record of which days have been logged, so this is what the
 * once-per-day rule keys off — it covers both the daily log and a bulk import
 * without needing a separate marker that could drift out of step.
 */
async function hasDate(storeId, date) {
  const rows = await readRows(storeId);
  return rows.some((row) => row.date === date);
}

/** Rows grouped into one entry per day, newest first. */
async function readByDate(storeId) {
  const rows = await readRows(storeId);
  const byDate = new Map();

  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date).push({
      item_id: row.item_id,
      item_name: row.item_name,
      units_sold: Number(row.units_sold) || 0,
      stockout: row.stockout === 1 || row.stockout === "1" || row.stockout === true,
    });
  }

  return [...byDate.entries()]
    .map(([date, entries]) => ({ date, entries }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** True when a store has at least one dataset file on disk. */
function hasDataset(storeId) {
  return fs.existsSync(datasetPath(storeId));
}

module.exports = {
  COLUMNS,
  SALES_HISTORY_ROOT,
  datasetPath,
  hasDataset,
  hasDate,
  listDays,
  readByDate,
  readRows,
  rowsForDate,
  safeStoreId,
  upsertDailySales,
};
