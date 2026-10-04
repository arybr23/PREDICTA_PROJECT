const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const forecast = require("./forecast");
const sales = require("./sales");
const pos = require("./pos");
const account = require("./account");
const firm = require("./firm");
const stores = require("./stores");
const python = require("../services/python");
const supabase = require("../services/supabase");
const { healthCheck: mongoHealth } = require("../config/db");
const requireInitialized = require("../middleware/requireInitialized");
const requireStore = require("../middleware/storeScope");

const MONGO_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

router.get("/", (req, res) => {
  res.json({
    message: "Welcome to ISIF Predicta API",
    status: "success",
    endpoints: [
      "GET  /api/health",
      "GET  /api/catalog?storeId=",
      "GET  /api/forecast/tomorrow?storeId=",
      "GET  /api/forecast/metrics?storeId=",
      "POST /api/sales/entry?storeId=",
      "GET  /api/sales/history?storeId=",
      "GET  /api/sales/daily?storeId=&date=",
      "GET  /api/sales/weather?storeId=&date=",
      "POST /api/sales/import?storeId=",
      "GET  /api/recipes/mapping?storeId=",
      "POST /api/recipes/mapping?storeId=",
      "GET  /api/pos/menu?storeId=",
      "POST /api/pos/checkout?storeId=",
      "PATCH /api/pos/item-status?storeId=",
      "GET  /api/pos/transactions?storeId=",
      "GET  /api/account/profile",
      "GET  /api/account/stores",
      "GET  /api/account/stock",
      "PATCH /api/account/stock",
      "POST /api/account/initialize",
      "POST /api/account/firm-request",
      "POST /api/firm",
      "GET  /api/firm",
      "POST /api/firm/:firmId/accept",
      "POST /api/firm/:firmId/reject",
      "GET  /api/stores",
      "POST /api/stores",
      "GET  /api/stores/locations",
      "PATCH /api/stores/:storeId",
      "DELETE /api/stores/:storeId",
      "POST /api/stores/:storeId/initialize",
      "GET  /api/stores/:storeId/menu",
      "POST /api/stores/:storeId/menu",
      "PATCH /api/stores/:storeId/menu/:itemId",
      "DELETE /api/stores/:storeId/menu/:itemId",
    ],
  });
});

router.get("/health", async (req, res) => {
  const mongo = await mongoHealth();
  res.status(200).json({
    status: "ok",
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
    python: python.pythonInfo(),
    mongo: {
      state: MONGO_STATES[mongoose.connection.readyState] || "unknown",
      connected: mongo.connected,
      mode: mongo.mode,
      dbName: mongo.dbName,
    },
    supabase: supabase.status(),
    persistence: "mongodb",
  });
});

router.get("/catalog", requireInitialized, async (req, res) => {
  try {
    // The catalog is the selected store's own menu, never the shared one.
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const { CATEGORY_LABEL } = require("../config/catalog");
    // The sold-out flag comes from the same store.stockouts map the POS menu
    // reads, so the Data Entry toggles and the Cashier toggles cannot disagree.
    const soldOut = ctx.store.stockouts;
    const isSoldOut = (itemId) => {
      if (!soldOut) return false;
      if (typeof soldOut.get === "function") return Boolean(soldOut.get(itemId));
      return Boolean(soldOut[itemId]);
    };

    const items = (ctx.store.menu || []).map((item) => ({
      item_id: item.itemId,
      name: item.name,
      category: item.category,
      category_label:
        item.categoryLabel || CATEGORY_LABEL[item.category] || item.category,
      price: item.price,
      icon: item.icon,
      stockout: isSoldOut(item.itemId),
      recipe: item.recipe || [],
    }));

    res.status(200).json({
      status: "success",
      storeId: ctx.store.storeId,
      count: items.length,
      categories: CATEGORY_LABEL,
      items,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.use("/forecast", forecast);
router.use("/sales", sales);
router.use("/recipes", sales);
router.use("/pos", pos);
router.use("/account", account);
router.use("/firm", firm);
router.use("/stores", stores);

module.exports = router;
