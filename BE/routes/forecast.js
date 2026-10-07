const express = require("express");
const router = express.Router();

const requireInitialized = require("../middleware/requireInitialized");
const requireStore = require("../middleware/storeScope");

const { CATEGORY_LABEL, computeIngredients } = require("../config/catalog");
const python = require("../services/python");

router.use(requireInitialized);

// Errors that mean "this store does not have enough of its own data yet",
// which the API turns into an empty payload instead of a failure.
//
// Match on the concept, not the exact wording: predict.py says "Historical
// sales data missing" when the file is absent and "Historical sales data is
// empty" when it exists but has no rows, and only the first used to be listed
// here. A store with a model but an emptied history therefore returned a 503
// instead of an empty state.
const NOT_READY = /No trained model|No sales history|Label encoders missing|No items with known encodings|Historical sales data|Not enough history|No comparable rows/;

function menuById(store) {
  return new Map((store.menu || []).map((item) => [item.itemId, item]));
}

function recipeOverrides(store) {
  const overrides = {};
  for (const item of store.menu || []) {
    overrides[item.itemId] = (item.recipe || []).map((line) => ({
      ingredient: line.ingredient,
      qty: line.qty,
      unit: line.unit,
    }));
  }
  // Store-level overrides win over the menu's own recipe.
  const stored = store.recipeOverrides;
  if (stored && typeof stored.forEach === "function") {
    stored.forEach((lines, itemId) => {
      overrides[itemId] = (lines || []).map((line) => ({
        ingredient: line.ingredient,
        qty: line.qty,
        unit: line.unit,
      }));
    });
  }
  return overrides;
}

/** Average menu price — the store's own prices, not catalog demand weights. */
function averageUnitPrice(store) {
  const items = store.menu || [];
  if (!items.length) return 0;
  const priced = items.filter((item) => Number.isFinite(item.price) && item.price > 0);
  if (!priced.length) return 0;
  return Math.round(priced.reduce((sum, item) => sum + item.price, 0) / priced.length);
}

/**
 * Whether this store has any sales history yet.
 *
 * The store document no longer carries a copy of the history — it holds only
 * the current day's sales — so the ML layer's own history file is what answers
 * this. Cheap enough to call on every forecast request (an existence check).
 */
function hasHistory(storeId) {
  return python.hasStoreHistory(storeId);
}

/**
 * GET /api/forecast/tomorrow?storeId=
 *
 * Runs the forecast for one store's own model and history. Before that store
 * has logged sales the response is an empty payload (HTTP 200) so the
 * dashboard can render its empty state instead of an error.
 *
 * Query params: date, weather, temperature, model, refresh (skip cache)
 */
router.get("/tomorrow", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const store = ctx.store;
    const storeId = store.storeId;

    if (!(await hasHistory(storeId))) {
      return res.status(200).json({
        status: "success",
        storeId,
        empty: true,
        reason: "no_sales_history",
        message: "This store has no sales history yet",
      });
    }

    const options = {
      storeId,
      date: req.query.date,
      weather: req.query.weather,
      temperature: req.query.temperature != null ? Number(req.query.temperature) : null,
      model: req.query.model,
    };

    if (req.query.refresh) python.clearForecastCache();

    let forecast;
    try {
      forecast = await python.getForecast(options);
    } catch (error) {
      if (NOT_READY.test(error.message || "")) {
        return res.status(200).json({
          status: "success",
          storeId,
          empty: true,
          reason: "model_not_ready",
          message: error.message,
        });
      }
      throw error;
    }

    const items = menuById(store);
    const stockouts = store.stockouts;

    const menu = forecast.menu_breakdown.map((item) => {
      const own = items.get(item.item_id);
      const price = own ? own.price : 0;
      const isOut =
        stockouts && typeof stockouts.get === "function"
          ? Boolean(stockouts.get(item.item_id))
          : Boolean(stockouts && stockouts[item.item_id]);

      return {
        item_id: item.item_id,
        name: own ? own.name : item.name,
        category: own ? own.category : item.category,
        category_label:
          (own && own.categoryLabel) ||
          CATEGORY_LABEL[item.category] ||
          item.category,
        predicted_units: item.predicted_units,
        price,
        icon: own ? own.icon : "\u{1F37D}",
        estimated_revenue: price * item.predicted_units,
        stockout: isOut,
      };
    });

    const ingredients = computeIngredients(forecast.menu_breakdown, recipeOverrides(store));
    const totalPortions = menu.reduce((sum, i) => sum + i.predicted_units, 0);
    const totalRevenue = menu.reduce((sum, i) => sum + i.estimated_revenue, 0);

    res.status(200).json({
      status: "success",
      storeId,
      empty: false,
      target_date: forecast.target_date,
      generated_at: forecast.generated_at,
      model: forecast.model,
      history_through: forecast.history_through,
      history_days: forecast.history_days,
      context: forecast.context,
      totals: {
        portions: totalPortions,
        distinct_items: menu.length,
        ingredient_lines: ingredients.length,
        estimated_revenue: totalRevenue,
      },
      menu_breakdown: menu,
      ingredients,
      cached: Boolean(forecast.cached),
    });
  } catch (error) {
    console.error("[forecast] failed:", error.message);
    if (error.detail) console.error("[forecast] detail:", error.detail);
    res.status(503).json({
      status: "error",
      message: "Forecast engine unavailable",
      detail: error.message,
    });
  }
});

/**
 * GET /api/forecast/metrics?storeId=
 *
 * Backtest against a naive baseline, run over this store's own history.
 * Empty (HTTP 200) until the store has logged enough days to compare.
 */
router.get("/metrics", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const store = ctx.store;
    const storeId = store.storeId;
    const days = req.query.days ? Number(req.query.days) : 30;
    const loggedDays = await python.storeHistoryDays(storeId);

    if (!loggedDays) {
      return res.status(200).json({
        status: "success",
        storeId,
        empty: true,
        reason: "no_sales_history",
        message: "This store has no sales history yet",
      });
    }

    let benchmark;
    try {
      benchmark = await python.getBenchmark({ days, model: req.query.model, storeId });
    } catch (error) {
      if (NOT_READY.test(error.message || "")) {
        return res.status(200).json({
          status: "success",
          storeId,
          empty: true,
          reason: "not_enough_history",
          logged_days: loggedDays,
          message: error.message,
        });
      }
      throw error;
    }

    const training = store.training || { day: 0 };
    const unitPrice = averageUnitPrice(store);
    const avoidedUnits = benchmark.overstock_units_avoided_per_day;

    // Adaptation reflects the actual history days available, not just training
    // passes. A store with 720 imported days should show as fully adapted.
    const adaptationDay = loggedDays || 0;
    const adaptationProgress = Math.min(100, Math.round((adaptationDay / 14) * 100));
    const adaptationStatus =
      adaptationDay === 0 ? "Baseline model" : adaptationDay < 7 ? "Calibrating" : "Personalization Active";

    res.status(200).json({
      status: "success",
      storeId,
      empty: false,
      model: benchmark.model,
      window_days: benchmark.window_days,
      accuracy_pct: benchmark.accuracy_pct,
      mae: benchmark.model_mae,
      baseline_mae: benchmark.naive_mae,
      mae_improvement_pct: benchmark.mae_improvement_pct,
      waste_reduction_pct: benchmark.waste_reduction_pct,
      overstock_units_avoided_per_day: avoidedUnits,
      avg_unit_price: unitPrice,
      estimated_daily_savings: Math.round(avoidedUnits * unitPrice),
      estimated_monthly_savings: Math.round(avoidedUnits * unitPrice * 30),
      adaptation: {
        day: adaptationDay,
        status: adaptationStatus,
        progress: adaptationProgress,
        last_trained_at: training.lastTrainedAt || null,
        last_status: training.lastStatus || null,
      },
      logged_days: loggedDays,
      cached: Boolean(benchmark.cached),
    });
  } catch (error) {
    console.error("[metrics] failed:", error.message);
    if (error.detail) console.error("[metrics] detail:", error.detail);
    res.status(503).json({
      status: "error",
      message: "Metrics unavailable",
      detail: error.message,
    });
  }
});

module.exports = router;
