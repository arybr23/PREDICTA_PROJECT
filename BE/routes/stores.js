const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const Firm = require("../models/Firms");
const Account = require("../models/Accounts");
const Store = require("../models/Stores");
const { PRODUCTS, CATEGORY_LABEL } = require("../config/catalog");

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const [key, ...rest] = pair.split("=");
    cookies[key.trim()] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

async function sessionAccount(req) {
  const cookies = parseCookies(req.headers.cookie);
  const userId = cookies.session;
  if (!userId) return null;
  return Account.findOne({ userId });
}

async function firmFor(account) {
  if (account.firmId) return Firm.findOne({ firmId: account.firmId });
  if (account.firmName) return Firm.findOne({ firmName: account.firmName });
  return null;
}

/** Resolve the caller's firm, or send an error response and return null. */
async function requireFirm(req, res, { adminOnly = false } = {}) {
  const account = await sessionAccount(req);
  if (!account) {
    res.status(401).json({ status: "error", message: "Not logged in" });
    return null;
  }

  const firm = await firmFor(account);
  if (!firm) {
    res.status(403).json({ status: "error", message: "You are not part of a firm" });
    return null;
  }

  if (adminOnly && account.role !== "admin") {
    res.status(403).json({ status: "error", message: "Admin access required" });
    return null;
  }

  return { account, firm };
}

async function generateStoreId() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `STR-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const exists = await Store.findOne({ storeId: candidate }).lean();
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique store ID");
}

function toPublic(store) {
  return {
    storeId: store.storeId,
    storeName: store.storeName,
    initialized: store.initialized === true,
  };
}

/** Default menu copied into a store when the admin asks for demo data. */
function defaultMenu() {
  return PRODUCTS.map((product) => ({
    itemId: product.itemId,
    name: product.name,
    category: product.category,
    categoryLabel: CATEGORY_LABEL[product.category] || "",
    price: product.price,
    icon: product.icon,
    recipe: product.recipe || [],
  }));
}

/** Resolve a firm store or send the appropriate error and return null. */
async function firmStore(ctx, storeId, res) {
  if (!(ctx.firm.stores || []).includes(storeId)) {
    res.status(404).json({
      status: "error",
      message: "Store not found in your firm",
    });
    return null;
  }

  const store = await Store.findOne({ storeId });
  if (!store) {
    res.status(404).json({
      status: "error",
      message: `Store '${storeId}' not found`,
    });
    return null;
  }

  return store;
}

/** GET /api/stores — the caller's firm stores (members and admins). */
router.get("/", async (req, res) => {
  try {
    const ctx = await requireFirm(req, res);
    if (!ctx) return;

    const ids = ctx.firm.stores || [];
    const docs = await Store.find({ storeId: { $in: ids } }).lean();
    const byId = new Map(docs.map((d) => [d.storeId, d]));
    const stores = ids.map((id) => byId.get(id)).filter(Boolean);

    res.status(200).json({
      status: "success",
      count: stores.length,
      stores: stores.map(toPublic),
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** POST /api/stores — add a store to the firm (admin only). */
router.post("/", async (req, res) => {
  const { storeName } = req.body || {};
  if (!storeName || !storeName.trim()) {
    return res.status(400).json({
      status: "error",
      message: "'storeName' is required",
    });
  }

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    const storeId = await generateStoreId();
    const store = await Store.create({ storeName: storeName.trim(), storeId });

    ctx.firm.stores.push(storeId);
    await ctx.firm.save();

    res.status(201).json({ status: "success", store: toPublic(store) });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** PATCH /api/stores/:storeId — rename a firm store (admin only). */
router.patch("/:storeId", async (req, res) => {
  const { storeId } = req.params;
  const { storeName } = req.body || {};

  if (!storeName || !storeName.trim()) {
    return res.status(400).json({
      status: "error",
      message: "'storeName' is required",
    });
  }

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    if (!(ctx.firm.stores || []).includes(storeId)) {
      return res.status(404).json({
        status: "error",
        message: "Store not found in your firm",
      });
    }

    const store = await Store.findOneAndUpdate(
      { storeId },
      { storeName: storeName.trim() },
      { new: true },
    );
    if (!store) {
      return res.status(404).json({
        status: "error",
        message: `Store '${storeId}' not found`,
      });
    }

    res.status(200).json({ status: "success", store: toPublic(store) });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** DELETE /api/stores/:storeId — remove a store from the firm (admin only). */
router.delete("/:storeId", async (req, res) => {
  const { storeId } = req.params;

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    if (!(ctx.firm.stores || []).includes(storeId)) {
      return res.status(404).json({
        status: "error",
        message: "Store not found in your firm",
      });
    }

    await Store.deleteOne({ storeId });
    ctx.firm.stores = (ctx.firm.stores || []).filter((id) => id !== storeId);
    await ctx.firm.save();

    res.status(200).json({ status: "success", storeId });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * POST /api/stores/:storeId/initialize — mark a store as set up (admin only).
 *
 * Body: { useDefaultData?: boolean }
 *   useDefaultData — also copy the default catalog into the store's own menu
 *                    (the "Use default demo data" button on the Stores page).
 *   omitted        — just flag the store as initialised; used when the admin
 *                    writes the first real data for it.
 */
router.post("/:storeId/initialize", async (req, res) => {
  const { storeId } = req.params;
  const useDefaultData = (req.body || {}).useDefaultData === true;

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    const store = await firmStore(ctx, storeId, res);
    if (!store) return;

    if (useDefaultData && (!store.menu || store.menu.length === 0)) {
      store.menu = defaultMenu();
    }
    store.initialized = true;
    await store.save();

    res.status(200).json({ status: "success", store: toPublic(store) });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** GET /api/stores/:storeId/menu — the store's own menu (admin only). */
router.get("/:storeId/menu", async (req, res) => {
  const { storeId } = req.params;

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    const store = await firmStore(ctx, storeId, res);
    if (!store) return;

    res.status(200).json({
      status: "success",
      storeId: store.storeId,
      initialized: store.initialized === true,
      items: store.menu || [],
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** POST /api/stores/:storeId/menu — add a menu item (admin only). */
router.post("/:storeId/menu", async (req, res) => {
  const { storeId } = req.params;
  const { name, category, price, icon, recipe } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ status: "error", message: "'name' is required" });
  }

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    const store = await firmStore(ctx, storeId, res);
    if (!store) return;

    const categoryKey = String(category || "makanan_berat");
    const item = {
      itemId: `M-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      name: String(name).trim(),
      category: categoryKey,
      categoryLabel: CATEGORY_LABEL[categoryKey] || categoryKey,
      price: Number(price) || 0,
      icon: String(icon || ""),
      recipe: Array.isArray(recipe) ? recipe : [],
    };

    store.menu = [...(store.menu || []), item];
    // Writing a menu item is one of the ways a store becomes initialised.
    store.initialized = true;
    await store.save();

    res.status(201).json({ status: "success", item, store: toPublic(store) });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** PATCH /api/stores/:storeId/menu/:itemId — edit a menu item (admin only). */
router.patch("/:storeId/menu/:itemId", async (req, res) => {
  const { storeId, itemId } = req.params;
  const { name, category, price, icon, recipe } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ status: "error", message: "'name' is required" });
  }

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    const store = await firmStore(ctx, storeId, res);
    if (!store) return;

    const item = (store.menu || []).find((entry) => entry.itemId === itemId);
    if (!item) {
      return res.status(404).json({
        status: "error",
        message: `Menu item '${itemId}' not found in this store`,
      });
    }

    const categoryKey = String(category || item.category);
    item.name = String(name).trim();
    item.category = categoryKey;
    item.categoryLabel = CATEGORY_LABEL[categoryKey] || categoryKey;
    item.price = Number(price) || 0;
    item.icon = String(icon === undefined ? item.icon : icon);
    if (Array.isArray(recipe)) item.recipe = recipe;

    store.initialized = true;
    await store.save();

    res.status(200).json({ status: "success", item, store: toPublic(store) });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** DELETE /api/stores/:storeId/menu/:itemId — remove a menu item (admin only). */
router.delete("/:storeId/menu/:itemId", async (req, res) => {
  const { storeId, itemId } = req.params;

  try {
    const ctx = await requireFirm(req, res, { adminOnly: true });
    if (!ctx) return;

    const store = await firmStore(ctx, storeId, res);
    if (!store) return;

    const next = (store.menu || []).filter((entry) => entry.itemId !== itemId);
    if (next.length === (store.menu || []).length) {
      return res.status(404).json({
        status: "error",
        message: `Menu item '${itemId}' not found in this store`,
      });
    }

    store.menu = next;
    await store.save();

    res.status(200).json({ status: "success", storeId, itemId });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
