const mongoose = require("mongoose");

const accountsSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    firmName: { type: String, default: "" },
    firmId: { type: String, default: "" },
    pendingFirmId: { type: String, default: "" },
    pendingFirmName: { type: String, default: "" },
    role: { type: String, enum: ["manager", "employee"], default: "employee" },
    initialized: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("accounts", accountsSchema);
