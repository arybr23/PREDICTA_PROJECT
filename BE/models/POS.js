const mongoose = require("mongoose");

const posSchema = new mongoose.Schema(
  {
    // TODO: define your fields here
    // example:
    // storeId: { type: String, required: true },
    // transactionId: { type: String, required: true, unique: true },
    // items: [{ name: String, quantity: Number, price: Number }],
    // totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("POS", posSchema);
