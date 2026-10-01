const express = require("express");
const router = express.Router();

const { getProduct, roundQuantity } = require("../config/catalog");
const python = require("../services/python");
const store = require("../services/store");

const WEATHER_LABELS = ["cerah", "berawan", "hujan_ringan", "hujan_deras", "panas_extreme"];

function normaliseEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      item_id: String(entry.item_id || "").trim(),
      units_sold: Number(entry.units_sold),
      stockout: Boolean(entry.stockout),
    }))
    .filter((entry) => entry.item_id && Number.isFinite(entry.units_sold) && entry.units_sold >= 0);
}

/**
 * POST /api/sales/entry
 *
 * Records end-of-day sales, folds them into the ML history and (by default)
 * runs an incremental training pass so tomorrow's forecast reflects them.
 *
 * Body: { date, weather?, temperature?, entries: [{ item_id, units_sold, stockout }], train?: boolean }
 */
router.post("/entry", async (req, res) => {
  const { date, weather, temperature } = req.body || {};
  const entries = normaliseEntries((req.body || {}).entries);
  const shouldTrain = (req.body || {}).train !== false;

  if (!date) {
    return res.status(400).json({ status: "error", message: "'date' is required (YYYY-MM-DD)" });
  }
  if (!entries.length) {
    return res.status(400).json({
      status: "error",
      message: "'entries' must contain at least one { item_id, units_sold }",
    });
  }

  const unknown = entries.filter((e) => !getProduct(e.item_id)).map((e) => e.item_id);
  if (unknown.length) {
    return res.status(400).json({
      status: "error",
      message: `Unknown item id(s): ${unknown.join(", ")}`,
    });
  }

  const payload = {
    date,
    entries: entries.map((e) => ({
      item_id: e.item_id,
      units_sold: Math.round(e.units_sold),
      stockout: e.stockout ? 1 : 0,
    })),
  };

  if (weather && WEATHER_LABELS.includes(weather)) payload.weather = weather;
  else if (weather) {
    return res.status(400).json({
      status: "error",
      message: `Unknown weather label '${weather}'`,
      allowed: WEATHER_LABELS,
    });
  }
  if (temperature != null && Number.isFinite(Number(temperature))) {
    payload.temperature = Number(temperature);
  }

  try {
    const appended = await python.appendDailyLog(payload);
    python.clearForecastCache();

    await store.saveDailyLog(date, {
      entries: payload.entries,
      weather: payload.weather || null,
      temperature: payload.temperature ?? null,
      submitted_at: new Date().toISOString(),
    });

    let training = null;
    let trainingError = null;
    if (shouldTrain) {
      try {
        const result = await python.trainIncremental({ tailDays: 120 });
        python.clearForecastCache();
        const adaptation = await store.recordTraining(result);
        training = { ...result, adaptation };
      } catch (trainErr) {
        trainingError = trainErr.message;
        console.error("[sales] incremental training failed:", trainErr.message);
        await store.recordTraining({ status: "error", error: trainErr.message });
      }
    }

    res.status(200).json({
      status: "success",
      message: trainingError
        ? "Daily log saved, but model retraining failed"
        : "Daily log saved and model updated",
      date,
      rows_updated: appended.rows_updated,
      history_days: appended.history_days,
      training,
      training_error: trainingError,
    });
  } catch (error) {
    console.error("[sales] entry failed:", error.message);
    if (error.detail) console.error("[sales] detail:", error.detail);
    res.status(503).json({
      status: "error",
      message: "Could not save daily log",
      detail: error.message,
    });
  }
});

/** GET /api/sales/history — days already logged, newest first. */
router.get("/history", async (req, res) => {
  try {
    const logs = await store.listDailyLogs();
    res.status(200).json({ status: "success", count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * POST /api/recipes/mapping
 *
 * Override the bill of materials for one menu item.
 * Body: { item_id, recipe: [{ ingredient, qty, unit }] }
 */
router.post("/mapping", async (req, res) => {
  const { item_id: itemId, recipe } = req.body || {};

  if (!itemId || !getProduct(itemId)) {
    return res.status(400).json({ status: "error", message: "Valid 'item_id' is required" });
  }
  if (!Array.isArray(recipe) || !recipe.length) {
    return res.status(400).json({ status: "error", message: "'recipe' must be a non-empty array" });
  }

  const cleaned = [];
  for (const part of recipe) {
    const qty = Number(part.qty);
    if (!part.ingredient || !Number.isFinite(qty) || qty < 0) continue;
    cleaned.push({
      ingredient: String(part.ingredient).trim(),
      qty,
      unit: part.unit || "kg",
    });
  }

  if (!cleaned.length) {
    return res.status(400).json({
      status: "error",
      message: "No valid recipe lines supplied",
    });
  }

  try {
    await store.setRecipeOverride(itemId, cleaned);
    python.clearForecastCache();
    res.status(200).json({
      status: "success",
      message: `Recipe updated for ${getProduct(itemId).name}`,
      item_id: itemId,
      recipe: cleaned,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** GET /api/recipes/mapping — current overrides plus the built-in defaults. */
router.get("/mapping", async (req, res) => {
  try {
    const overrides = await store.getRecipeOverrides();
    const defaults = {};
    for (const product of require("../config/catalog").PRODUCTS) {
      defaults[product.itemId] = product.recipe.map((r) => ({
        ...r,
        qty: roundQuantity(r.qty, r.unit),
      }));
    }
    res.status(200).json({ status: "success", overrides, defaults });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
