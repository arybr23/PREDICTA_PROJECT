const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: "makanan_berat" },
    categoryLabel: { type: String, default: "Food" },
    price: { type: Number, default: 0 },
    icon: { type: String, default: "" },
    recipe: [
      {
        ingredient: String,
        qty: Number,
        unit: String,
      },
    ],
  },
  { _id: false },
);

const recipeLineSchema = new mongoose.Schema(
  {
    ingredient: String,
    qty: Number,
    unit: String,
  },
  { _id: false },
);

/**
 * Where the store is, so its weather can be looked up rather than typed in.
 *
 * Set from the fixed city list in BE/config/locations.js. `timezone` is not
 * decoration: Open-Meteo aggregates a day over the local calendar day, so a
 * store in WITA must not be fetched with the Jakarta offset.
 */
const locationSchema = new mongoose.Schema(
  {
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    timezone: { type: String, default: "" },
  },
  { _id: false },
);

const storesSchema = new mongoose.Schema(
  {
    storeName: { type: String, required: true },
    storeId: { type: String, required: true, unique: true },
    // Which city this store sits in. Empty until a manager picks one, and
    // weather cannot be fetched until they do.
    location: { type: locationSchema, default: () => ({}) },
    // Set once the manager seeds this store with default data or writes its
    // first real data (menu item / sales entry). Until then the frontend
    // blocks the data pages for this store.
    initialized: { type: Boolean, default: false },
    // The store's own menu. Every other page (cashier grid, data entry,
    // recipes) reads these items instead of the shared catalog.
    menu: { type: [menuItemSchema], default: [] },
    // Snapshot of the shared catalog, written by "Use default demo data".
    products: [
      {
        productName: String,
        productType: String,
        productId: { type: String, ref: "Products" },
      },
    ],
    // The current day's sales only, accumulated by the cashier's checkout
    // button. This is a staging area, not a log: the Data Entry page reads it,
    // shows it, and publishes it to the store's own dataset at
    // ML/salesHistory/<storeId>/datasets/<storeId>.csv (see
    // BE/services/storeDataset.js). A successful
    // publish empties `entries` and stamps `posted_at`, so the day's figures
    // leave the database only once they are safely on disk.
    dailySales: {
      date: { type: String, default: "" },
      updated_at: { type: Date, default: null },
      posted_at: { type: Date, default: null },
      entries: [
        {
          item_id: { type: String, default: "" },
          item_name: { type: String, default: "" },
          units_sold: { type: Number, default: 0 },
          stockout: { type: Boolean, default: false },
        },
      ],
    },
    // Recent checkout receipts, newest first (capped like the old JSON layer).
    transactions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Sold-out flags per menu item, keyed by itemId.
    stockouts: { type: Map, of: Boolean, default: {} },
    // Per-store bill-of-materials overrides, keyed by itemId.
    recipeOverrides: { type: Map, of: [recipeLineSchema], default: {} },
    // Adaptation state of this store's own model.
    training: {
      day: { type: Number, default: 0 },
      lastTrainedAt: { type: String, default: "" },
      lastStatus: { type: String, default: "" },
      lastResult: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Stores", storesSchema);
