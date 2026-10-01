require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.warn("MONGO_URL is not set. MongoDB connection skipped.");
    return;
  }

  try {
    await mongoose.connect(mongoUrl);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
