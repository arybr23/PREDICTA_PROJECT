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

const storesSchema = new mongoose.Schema(
  {
    storeName: { type: String, required: true },
    storeId: { type: String, required: true, unique: true },
    // Set once the admin seeds this store with default data or writes its
    // first real data (menu item / sales entry). Until then the frontend
    // blocks the data pages for this store.
    initialized: { type: Boolean, default: false },
    menu: { type: [menuItemSchema], default: [] },
    dailySales: [
      {
        productId: { type: String, ref: "Products" },
        quantitySold: { type: Number },
      },
    ],
    products: [
      {
        productName: String,
        productType: String,
        productId: { type: String, ref: "Products" },
      },
    ],
    dailySalesHistory: [
      {
        date: { type: Date },
        totalSales: { type: Number },
        breakdown: { type: Map, of: Number },
        hijriDate: { year: Number, month: Number, day: Number },
        weather: {
          temperature: { type: Number },
          condition: { type: String },
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Stores", storesSchema);
