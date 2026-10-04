/**
 * MongoDB Connection Manager
 *
 * Supports three connection modes:
 *   1. Local development (no auth)      — MONGO_URL
 *   2. MongoDB Compass (direct)         — MONGO_COMPASS_URL
 *   3. MongoDB Atlas (cloud / SRV)      — MONGO_ATLAS_URL
 *
 * Priority: MONGO_ATLAS_URL > MONGO_COMPASS_URL > MONGO_URL (fallback)
 *
 * Placeholder values in BE/.env mean the app uses the local URL by default.
 * To switch to Compass or Atlas, uncomment the relevant line in BE/.env
 * and fill in the real credentials.
 */

require("dotenv").config();
const mongoose = require("mongoose");

// ---------------------------------------------------------------------------
// Resolve the active connection URL
// ---------------------------------------------------------------------------

function resolveMongoUrl() {
  // Cloud Atlas (SRV) wins when provided — highest priority.
  if (process.env.MONGO_ATLAS_URL) {
    return {
      url: process.env.MONGO_ATLAS_URL,
      mode: "atlas",
    };
  }

  // MongoDB Compass / direct authenticated connection.
  if (process.env.MONGO_COMPASS_URL) {
    return {
      url: process.env.MONGO_COMPASS_URL,
      mode: "compass",
    };
  }

  // Local development fallback (default, no auth).
  return {
    url: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/predicta_db",
    mode: "local",
  };
}

// ---------------------------------------------------------------------------
// Connection options (tuned for production stability)
// ---------------------------------------------------------------------------

const MONGOOSE_OPTIONS = {
  // Buffer commands until the connection is ready — avoids race conditions
  // on app startup when connectDB() is called before the DB is reachable.
  bufferCommands: true,

  // Server selection timeout: fail fast if the cluster is unreachable.
  serverSelectionTimeoutMS: 5000,

  // Socket timeout: drop idle connections after 10 s.
  socketTimeoutMS: 10000,

  // Connection pool size — fine for a small minimarket backend.
  maxPoolSize: 10,
};

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

const connectDB = async () => {
  const { url, mode } = resolveMongoUrl();

  if (!url) {
    console.warn("No MongoDB URL configured. Database connection skipped.");
    return;
  }

  try {
    await mongoose.connect(url, MONGOOSE_OPTIONS);
    console.log(`MongoDB connected (${mode})`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    // In local mode a failure is fatal (the app cannot run without a DB).
    // In cloud mode we retry once after a short delay before giving up.
    if (mode !== "local") {
      console.log("Retrying MongoDB connection in 3 s…");
      await new Promise((r) => setTimeout(r, 3000));
      try {
        await mongoose.connect(url, MONGOOSE_OPTIONS);
        console.log(`MongoDB connected on retry (${mode})`);
        return;
      } catch (retryErr) {
        console.error("MongoDB retry failed:", retryErr.message);
      }
    }

    process.exit(1);
  }
};

// ---------------------------------------------------------------------------
// Health check — used by monitoring routes
// ---------------------------------------------------------------------------

async function healthCheck() {
  const state = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return {
    connected: state === 1,
    state,
    mode: resolveMongoUrl().mode,
    dbName: mongoose.connection.name || null,
  };
}

// ---------------------------------------------------------------------------
// Graceful disconnect — useful for tests and clean shutdowns
// ---------------------------------------------------------------------------

async function disconnectDB() {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}

module.exports = { connectDB, healthCheck, disconnectDB, resolveMongoUrl };
