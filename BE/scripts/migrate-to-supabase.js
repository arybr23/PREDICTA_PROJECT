/**
 * Migrate all local ML files to Supabase Storage.
 *
 * Run: node /tmp/migrate-to-supabase.js
 */

require("dotenv").config({ path: "/Users/Arya-10B/Documents/Ongoing Projects/ISIF_PREDICTA/App/BE/.env" });
const fs = require("fs");
const path = require("path");
const supabase = require("/Users/Arya-10B/Documents/Ongoing Projects/ISIF_PREDICTA/App/BE/services/supabase");

const ML_DIR = "/Users/Arya-10B/Documents/Ongoing Projects/ISIF_PREDICTA/App/ML";

async function uploadFile(localPath, remotePath) {
  const buffer = fs.readFileSync(localPath);
  const { error, data } = await supabase.uploadFile(remotePath, buffer, {
    contentType: "application/octet-stream",
    upsert: true,
  });
  if (error) {
    console.error(`  ❌ FAIL ${remotePath}: ${error.message}`);
    return false;
  }
  console.log(`  ✅ OK   ${remotePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return true;
}

async function migrate() {
  if (!supabase.isConfigured) {
    console.error("Supabase is not configured. Check BE/.env");
    process.exit(1);
  }

  console.log("=== Migrating ML files to Supabase ===\n");
  let ok = 0, fail = 0;

  // 1. Per-store files under salesHistory/
  const salesHistory = path.join(ML_DIR, "salesHistory");
  for (const storeId of fs.readdirSync(salesHistory)) {
    const storeDir = path.join(salesHistory, storeId);
    if (!fs.statSync(storeDir).isDirectory()) continue;

    console.log(`Store: ${storeId}`);
    for (const sub of ["datasets", "raw", "processed", "models"]) {
      const subDir = path.join(storeDir, sub);
      if (!fs.existsSync(subDir)) continue;
      for (const file of fs.readdirSync(subDir)) {
        const local = path.join(subDir, file);
        if (!fs.statSync(local).isFile()) continue;
        const remote = `stores/${storeId}/${sub}/${file}`;
        const success = await uploadFile(local, remote);
        success ? ok++ : fail++;
      }
    }
  }

  // 2. Global data files
  console.log("\nGlobal data:");
  const globalPaths = [
    ["data/raw/historical_sales.csv", "global/data/raw/historical_sales.csv"],
    ["data/raw/train.csv", "global/data/raw/train.csv"],
    ["data/raw/test.csv", "global/data/raw/test.csv"],
    ["data/processed/train.csv", "global/data/processed/train.csv"],
    ["data/processed/test.csv", "global/data/processed/test.csv"],
    ["data/processed/feature_matrix.csv", "global/data/processed/feature_matrix.csv"],
    ["data/processed/label_encoders.json", "global/data/processed/label_encoders.json"],
    ["data/processed/data_size_models_comparison.csv", "global/data/processed/data_size_models_comparison.csv"],
  ];
  for (const [relLocal, remote] of globalPaths) {
    const local = path.join(ML_DIR, relLocal);
    if (!fs.existsSync(local)) {
      console.log(`  SKIP ${remote} (local missing)`);
      continue;
    }
    const success = await uploadFile(local, remote);
    success ? ok++ : fail++;
  }

  // 3. Global models
  console.log("\nGlobal models:");
  const modelsDir = path.join(ML_DIR, "models");
  for (const file of fs.readdirSync(modelsDir)) {
    const local = path.join(modelsDir, file);
    if (!fs.statSync(local).isFile()) continue;
    const remote = `global/models/${file}`;
    const success = await uploadFile(local, remote);
    success ? ok++ : fail++;
  }

  console.log(`\n=== Done: ${ok} uploaded, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
