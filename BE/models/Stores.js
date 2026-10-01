const mongoose = require("mongoose");

const storesSchema = new mongoose.Schema(
  {
    storeName: { type: String, required: true },
    storeId: { type: String, required: true, unique: true },
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
