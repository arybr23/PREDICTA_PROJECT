const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema(
  {
    // TODO: define your fields here
    // example:
    // productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // quantity: { type: Number, required: true },
    // revenue: { type: Number, required: true },
    // date: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sales", salesSchema);
