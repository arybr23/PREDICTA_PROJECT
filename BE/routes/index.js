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
const requireInitialized = require("../middleware/requireInitialized");

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
      "GET  /api/catalog",
      "GET  /api/forecast/tomorrow",
      "GET  /api/forecast/metrics",
      "POST /api/sales/entry",
      "GET  /api/sales/history",
      "GET  /api/recipes/mapping",
      "POST /api/recipes/mapping",
      "GET  /api/pos/menu",
      "POST /api/pos/checkout",
      "PATCH /api/pos/item-status",
      "GET  /api/pos/transactions",
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

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
    python: python.pythonInfo(),
    mongo: MONGO_STATES[mongoose.connection.readyState] || "unknown",
    persistence: "json-file",
  });
});

router.get("/catalog", requireInitialized, (req, res) => {
  const { PRODUCTS, CATEGORY_LABEL } = require("../config/catalog");
  res.status(200).json({
    status: "success",
    count: PRODUCTS.length,
    categories: CATEGORY_LABEL,
    items: PRODUCTS.map((product) => ({
      item_id: product.itemId,
      name: product.name,
      category: product.category,
      category_label: CATEGORY_LABEL[product.category],
      price: product.price,
      icon: product.icon,
      recipe: product.recipe,
    })),
  });
});

router.use("/forecast", forecast);
router.use("/sales", sales);
router.use("/recipes", sales);
router.use("/pos", pos);
router.use("/account", account);
router.use("/firm", firm);
router.use("/stores", stores);

module.exports = router;
