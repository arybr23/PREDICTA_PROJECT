const express = require("express");
const router = express.Router();

const requireInitialized = require("../middleware/requireInitialized");

const { CATEGORY_LABEL, CATEGORY_ORDER, CATEGORIES, PRODUCTS, getProduct } = require("../config/catalog");
const store = require("../services/store");

router.use(requireInitialized);

const TAX_RATE = 0.10; // PPN

/**
 * GET /api/pos/menu
 * Full catalog with live stockout flags for the cashier grid.
 */
router.get("/menu", async (req, res) => {
  try {
    const stockouts = await store.getStockouts();

    const items = PRODUCTS.map((product, index) => ({
      id: index + 1,
      item_id: product.itemId,
      name: product.name,
      price: product.price,
      category: CATEGORY_LABEL[product.category],
      category_key: product.category,
      icon: product.icon,
      stockout: Boolean(stockouts[product.itemId]),
    }));

    res.status(200).json({
      status: "success",
      count: items.length,
      categories: CATEGORIES,
      category_keys: CATEGORY_ORDER,
      tax_rate: TAX_RATE,
      items,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * POST /api/pos/checkout
 * Body: { items: [{ item_id, qty }] }
 */
router.post("/checkout", async (req, res) => {
  const rawItems = Array.isArray((req.body || {}).items) ? req.body.items : [];

  if (!rawItems.length) {
    return res.status(400).json({ status: "error", message: "Cart is empty" });
  }

  const stockouts = await store.getStockouts();
  const lines = [];
  const problems = [];

  for (const raw of rawItems) {
    const itemId = String(raw.item_id || raw.itemId || "").trim();
    const qty = Number(raw.qty);
    const product = getProduct(itemId);

    if (!product) {
      problems.push(`Unknown item '${itemId}'`);
      continue;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      problems.push(`Invalid quantity for ${product.name}`);
      continue;
    }
    if (stockouts[itemId]) {
      problems.push(`${product.name} is flagged sold out`);
      continue;
    }

    lines.push({
      item_id: itemId,
      name: product.name,
      unit_price: product.price,
      qty: Math.round(qty),
      subtotal: product.price * Math.round(qty),
    });
  }

  if (problems.length) {
    return res.status(400).json({ status: "error", message: problems.join("; "), problems });
  }
  if (!lines.length) {
    return res.status(400).json({ status: "error", message: "No valid items in cart" });
  }

  try {
    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;
    const units = lines.reduce((sum, line) => sum + line.qty, 0);

    const transaction = {
      id: `TRX-${Date.now()}`,
      created_at: new Date().toISOString(),
      lines,
      units,
      subtotal,
      tax,
      total,
    };

    await store.addTransaction(transaction);

    res.status(201).json({ status: "success", transaction });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * PATCH /api/pos/item-status
 * Body: { item_id, stockout }
 */
router.patch("/item-status", async (req, res) => {
  const itemId = String((req.body || {}).item_id || "").trim();
  const hasFlag = Object.prototype.hasOwnProperty.call(req.body || {}, "stockout");
  const stockout = hasFlag ? Boolean(req.body.stockout) : true;

  if (!getProduct(itemId)) {
    return res.status(400).json({ status: "error", message: "Valid 'item_id' is required" });
  }

  try {
    const stockouts = await store.setStockout(itemId, stockout);
    res.status(200).json({
      status: "success",
      item_id: itemId,
      stockout: Boolean(stockouts[itemId]),
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** GET /api/pos/transactions — recent completed orders. */
router.get("/transactions", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const transactions = await store.listTransactions(limit);
    res.status(200).json({ status: "success", count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
