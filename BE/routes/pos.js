const express = require("express");
const router = express.Router();

const requireInitialized = require("../middleware/requireInitialized");
const requireStore = require("../middleware/storeScope");

const { CATEGORY_LABEL, CATEGORY_ORDER } = require("../config/catalog");

router.use(requireInitialized);

const TAX_RATE = 0.10; // PPN
const MAX_TRANSACTIONS = 500;

/**
 * Today's date in the server's local timezone (YYYY-MM-DD).
 *
 * Deliberately not `toISOString().slice(0,10)`: that is the UTC date, which is
 * still yesterday for a UTC+7 store until 07:00 local. A checkout at 06:00 in
 * Jakarta would otherwise be filed under the previous day.
 */
function localDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stockoutFlag(store, itemId) {
  const flags = store.stockouts;
  if (!flags) return false;
  if (typeof flags.get === "function") return Boolean(flags.get(itemId));
  return Boolean(flags[itemId]);
}

/** Categories that actually appear in this store's menu, in catalog order. */
function storeCategoryKeys(menu) {
  const keys = [];
  for (const key of CATEGORY_ORDER) {
    if (menu.some((item) => item.category === key)) keys.push(key);
  }
  for (const item of menu) {
    if (item.category && !keys.includes(item.category)) keys.push(item.category);
  }
  return keys;
}

/**
 * GET /api/pos/menu?storeId=
 * The cashier grid for one store: its own menu with live stockout flags.
 */
router.get("/menu", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const menu = ctx.store.menu || [];
    const keys = storeCategoryKeys(menu);

    const items = menu.map((item, index) => ({
      id: index + 1,
      item_id: item.itemId,
      name: item.name,
      price: item.price,
      category: item.categoryLabel || CATEGORY_LABEL[item.category] || item.category,
      category_key: item.category,
      icon: item.icon,
      stockout: stockoutFlag(ctx.store, item.itemId),
    }));

    res.status(200).json({
      status: "success",
      storeId: ctx.store.storeId,
      count: items.length,
      categories: ["All Items", ...keys.map((key) => CATEGORY_LABEL[key] || key)],
      category_keys: keys,
      tax_rate: TAX_RATE,
      items,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * POST /api/pos/checkout?storeId=
 * Body: { items: [{ item_id, qty }] }
 */
router.post("/checkout", async (req, res) => {
  const rawItems = Array.isArray((req.body || {}).items) ? req.body.items : [];

  if (!rawItems.length) {
    return res.status(400).json({ status: "error", message: "Cart is empty" });
  }

  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const menu = ctx.store.menu || [];
    const menuById = new Map(menu.map((item) => [item.itemId, item]));

    const lines = [];
    const problems = [];

    for (const raw of rawItems) {
      const itemId = String(raw.item_id || raw.itemId || "").trim();
      const qty = Number(raw.qty);
      const item = menuById.get(itemId);

      if (!item) {
        problems.push(`Unknown item '${itemId}'`);
        continue;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        problems.push(`Invalid quantity for ${item.name}`);
        continue;
      }
      if (stockoutFlag(ctx.store, itemId)) {
        problems.push(`${item.name} is flagged sold out`);
        continue;
      }

      lines.push({
        item_id: itemId,
        name: item.name,
        unit_price: item.price,
        qty: Math.round(qty),
        subtotal: item.price * Math.round(qty),
      });
    }

    if (problems.length) {
      return res.status(400).json({ status: "error", message: problems.join("; "), problems });
    }
    if (!lines.length) {
      return res.status(400).json({ status: "error", message: "No valid items in cart" });
    }

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

    // ---- Today's sales -------------------------------------------------
    // The store document keeps a live view of the current day only, so a
    // checkout on a new day starts a fresh set rather than appending to
    // yesterday's. The durable day-by-day record goes to the store's own
    // dataset file below.
    const date = localDate();
    const sameDay = ctx.store.dailySales?.date === date;
    const today = new Map();

    if (sameDay) {
      for (const entry of ctx.store.dailySales.entries || []) {
        today.set(entry.item_id, {
          item_id: entry.item_id,
          item_name: entry.item_name,
          units_sold: Number(entry.units_sold) || 0,
          stockout: Boolean(entry.stockout),
        });
      }
    }

    for (const line of lines) {
      const previous = today.get(line.item_id);
      today.set(line.item_id, {
        item_id: line.item_id,
        item_name: line.name,
        units_sold: (previous?.units_sold || 0) + line.qty,
        stockout: stockoutFlag(ctx.store, line.item_id),
      });
    }

    const dailyEntries = [...today.values()];

    ctx.store.dailySales = {
      date,
      updated_at: new Date(),
      entries: dailyEntries,
    };
    ctx.store.transactions = [transaction, ...(ctx.store.transactions || [])].slice(
      0,
      MAX_TRANSACTIONS,
    );
    await ctx.store.save();

    // ---- The store's own dataset ---------------------------------------
    // Deliberately NOT written here. Checkout only stages the sale in
    // store.dailySales; publishing it to
    // ML/salesHistory/<storeId>/datasets/<storeId>.csv is a separate, explicit
    // step on the Data Entry page (POST /api/sales/entry), so the day's figures
    // are reviewed before they leave the database.
    res.status(201).json({
      status: "success",
      storeId: ctx.store.storeId,
      transaction,
      dailySales: {
        date,
        units_today: dailyEntries.reduce((sum, entry) => sum + entry.units_sold, 0),
        distinct_items_today: dailyEntries.length,
        posted: false,
      },
      message: "Sale recorded — publish today's figures from the Data Entry page",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * PATCH /api/pos/item-status?storeId=
 * Body: { item_id, stockout }
 */
router.patch("/item-status", async (req, res) => {
  const itemId = String((req.body || {}).item_id || "").trim();
  const hasFlag = Object.prototype.hasOwnProperty.call(req.body || {}, "stockout");
  const stockout = hasFlag ? Boolean(req.body.stockout) : true;

  if (!itemId) {
    return res.status(400).json({ status: "error", message: "Valid 'item_id' is required" });
  }

  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const menu = ctx.store.menu || [];
    if (!menu.some((item) => item.itemId === itemId)) {
      return res.status(400).json({
        status: "error",
        message: `Item '${itemId}' is not on this store's menu`,
      });
    }

    if (!ctx.store.stockouts) ctx.store.stockouts = {};
    if (stockout) ctx.store.stockouts.set(itemId, true);
    else ctx.store.stockouts.delete(itemId);
    await ctx.store.save();

    res.status(200).json({
      status: "success",
      storeId: ctx.store.storeId,
      item_id: itemId,
      stockout: stockoutFlag(ctx.store, itemId),
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** GET /api/pos/transactions?storeId= — this store's recent orders. */
router.get("/transactions", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const all = ctx.store.transactions || [];
    const transactions = Number.isFinite(limit) && limit > 0 ? all.slice(0, limit) : all;

    res.status(200).json({
      status: "success",
      storeId: ctx.store.storeId,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
