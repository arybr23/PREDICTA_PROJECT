const mongoose = require("mongoose");

const firmsSchema = new mongoose.Schema(
  {
    firmName: { type: String, required: true },
    firmId: { type: String, required: true, unique: true },
    members: [
      {
        email: { type: String, required: true },
        role: { type: String, enum: ["manager", "employee"], default: "employee" },
      },
    ],
    stores: [{ type: String, ref: "Stores" }],
    accountRequest: [
      {
        email: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, enum: ["manager", "employee"], default: "employee" },
        storeId: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("firms", firmsSchema);
