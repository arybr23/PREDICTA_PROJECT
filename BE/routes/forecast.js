const express = require("express");
const router = express.Router();

const {
  CATEGORY_LABEL,
  PRODUCTS,
  computeIngredients,
  getProduct,
} = require("../config/catalog");
const python = require("../services/python");
const store = require("../services/store");

/** Demand-weighted average selling price, used to price avoided overstock. */
function averageUnitPrice() {
  const totalDemand = PRODUCTS.reduce((sum, p) => sum + p.baseDemand, 0);
  if (!totalDemand) return 0;
  const weighted = PRODUCTS.reduce((sum, p) => sum + p.price * p.baseDemand, 0);
  return Math.round(weighted / totalDemand);
}

/**
 * GET /api/forecast/tomorrow
 *
 * Runs the LightGBM forecast and converts it into everything the dashboard
 * needs: per-item volumes, the raw-ingredient shopping list, and the
 * operational metrics that justify using a model at all.
 *
 * Query params: date, weather, temperature, model, refresh (skip cache)
 */
router.get("/tomorrow", async (req, res) => {
  try {
    const options = {
      date: req.query.date,
      weather: req.query.weather,
      temperature: req.query.temperature != null ? Number(req.query.temperature) : null,
      model: req.query.model,
    };

    if (req.query.refresh) python.clearForecastCache();

    const [forecast, overrides, stockouts] = await Promise.all([
      python.getForecast(options),
      store.getRecipeOverrides(),
      store.getStockouts(),
    ]);

    const menu = forecast.menu_breakdown.map((item) => {
      const product = getProduct(item.item_id);
      const price = product ? product.price : 0;
      return {
        item_id: item.item_id,
        name: item.name,
        category: item.category,
        category_label: CATEGORY_LABEL[item.category] || item.category,
        predicted_units: item.predicted_units,
        price,
        icon: product ? product.icon : "\u{1F37D}",
        estimated_revenue: price * item.predicted_units,
        stockout: Boolean(stockouts[item.item_id]),
      };
    });

    const ingredients = computeIngredients(forecast.menu_breakdown, overrides);
    const totalPortions = menu.reduce((sum, i) => sum + i.predicted_units, 0);
    const totalRevenue = menu.reduce((sum, i) => sum + i.estimated_revenue, 0);

    res.status(200).json({
      status: "success",
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
 * GET /api/forecast/metrics
 *
 * Real operational metrics from a rolling backtest against a naive
 * "average of the last 7 days" baseline.
 */
router.get("/metrics", async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const [benchmark, training, logs] = await Promise.all([
      python.getBenchmark({ days, model: req.query.model }),
      store.getTraining(),
      store.listDailyLogs(),
    ]);

    const loggedDays = logs.length;
    const unitPrice = averageUnitPrice();
    const avoidedUnits = benchmark.overstock_units_avoided_per_day;

    const adaptationProgress = Math.min(100, Math.round((training.day / 14) * 100));
    const adaptationStatus =
      training.day === 0
        ? "Baseline model"
        : training.day < 7
          ? "Calibrating"
          : "Personalization Active";

    res.status(200).json({
      status: "success",
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
        day: training.day,
        status: adaptationStatus,
        progress: adaptationProgress,
        last_trained_at: training.lastTrainedAt,
        last_status: training.lastStatus,
      },
      logged_days: loggedDays,
      cached: Boolean(benchmark.cached),
    });
  } catch (error) {
    console.error("[metrics] failed:", error.message);
    res.status(503).json({
      status: "error",
      message: "Metrics unavailable",
      detail: error.message,
    });
  }
});

module.exports = router;
