const mongoose = require("mongoose");

const forecastSchema = new mongoose.Schema(
  {
    // TODO: define your fields here
    // example:
    // productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // date: { type: Date, required: true },
    // predictedValue: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Forecast", forecastSchema);
