/**
 * Migrate local MongoDB data to MongoDB Atlas.
 *
 * Prerequisites:
 *   1. MONGO_ATLAS_URL is set in BE/.env with a working connection string.
 *   2. Your IP is whitelisted in Atlas → Network Access.
 *   3. The database user has readWrite privileges.
 *
 * Run:
 *   cd BE && node scripts/migrate-to-atlas.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const EXPORT_DIR = path.join(__dirname, "mongo-export");
const COLLECTIONS = ["accounts", "stores", "firms"];

async function migrate() {
  const atlasUrl = process.env.MONGO_ATLAS_URL;
  if (!atlasUrl) {
    console.error("❌ MONGO_ATLAS_URL is not set in BE/.env");
    console.error("   1. Go to Atlas → Database → Connect → Drivers → Node.js");
    console.error("   2. Copy the connection string with your password");
    console.error("   3. Paste it into BE/.env as MONGO_ATLAS_URL=");
    process.exit(1);
  }

  console.log("=== MongoDB Atlas Migration ===\n");
  console.log("Target:", atlasUrl.replace(/:([^@]+)@/, ":***@"), "\n");

  // Connect to Atlas
  try {
    await mongoose.connect(atlasUrl, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    console.log("✅ Connected to Atlas\n");
  } catch (err) {
    console.error("❌ Cannot connect to Atlas:", err.message);
    if (err.message.includes("IP")) {
      console.error("   → Add your IP to Atlas → Network Access");
    } else if (err.message.includes("authentication")) {
      console.error("   → Wrong password. Use the DATABASE USER password,");
      console.error("     not your Atlas login password.");
    }
    process.exit(1);
  }

  // Import each collection
  for (const colName of COLLECTIONS) {
    const filePath = path.join(EXPORT_DIR, `${colName}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  SKIP ${colName}: export file missing`);
      continue;
    }

    const docs = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(docs) || docs.length === 0) {
      console.log(`⚠️  SKIP ${colName}: no documents`);
      continue;
    }

    // Remove MongoDB _id to avoid duplicate key errors on re-import
    const cleaned = docs.map((d) => {
      const { _id, ...rest } = d;
      return rest;
    });

    const collection = mongoose.connection.collection(colName);

    // Drop existing data (clean migration)
    await collection.deleteMany({});
    console.log(`  🗑️  Dropped existing ${colName}`);

    // Insert
    const result = await collection.insertMany(cleaned);
    console.log(`  ✅ Inserted ${result.insertedCount} docs into ${colName}`);
  }

  await mongoose.disconnect();
  console.log("\n=== Migration complete ===");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
