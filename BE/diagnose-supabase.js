/**
 * Supabase Connection Diagnostic
 *
 * Run this to check if Supabase is reachable:
 *   cd BE && node diagnose-supabase.js
 */

require("dotenv").config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

console.log("=== Supabase Diagnostic ===\n");

// 1. Check if env vars are set
if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_URL is empty");
  console.error("   Add your Supabase Project URL to BE/.env");
  console.error("   Get it from: Supabase → Project Settings → API → Project URL");
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_KEY is empty");
  console.error("   Add your service_role key to BE/.env");
  console.error("   Get it from: Supabase → Project Settings → API → service_role secret");
  process.exit(1);
}

console.log("✅ Env vars are set");
console.log("   URL:", SUPABASE_URL);
console.log("   Key starts with:", SUPABASE_KEY.slice(0, 10) + "...");
console.log("");

// 2. Validate URL format
if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_URL.endsWith(".supabase.co")) {
  console.error("❌ SUPABASE_URL looks wrong");
  console.error("   Expected: https://<project-ref>.supabase.co");
  console.error("   Got:", SUPABASE_URL);
  process.exit(1);
}

// 3. Quick check: can we reach the Supabase health endpoint?
async function checkReachable() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (res.status === 200) {
      console.log("✅ Supabase API is reachable and key is valid");
      return true;
    } else if (res.status === 401) {
      console.error("❌ Key rejected (401)");
      console.error("   You may be using the 'anon' key instead of 'service_role'");
      console.error("   Go to Supabase → Project Settings → API → copy 'service_role secret'");
      return false;
    } else {
      console.error("❌ Unexpected status:", res.status);
      return false;
    }
  } catch (err) {
    console.error("❌ Cannot reach Supabase:", err.message);
    console.error("   Check your internet connection and the SUPABASE_URL value");
    return false;
  }
}

// 4. Check if @supabase/supabase-js is installed
async function checkLibrary() {
  try {
    const { createClient } = require("@supabase/supabase-js");
    console.log("✅ @supabase/supabase-js is installed");
    return createClient;
  } catch {
    console.error("❌ @supabase/supabase-js is NOT installed");
    console.error("   Run: cd BE && npm install @supabase/supabase-js");
    return null;
  }
}

// 5. Full client test
async function checkClient(createClient) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY);
  try {
    const { data, error } = await client.storage.listBuckets();
    if (error) throw error;
    const bucketNames = data.map((b) => b.name);
    console.log("✅ Storage client works");
    console.log("   Buckets:", bucketNames.length ? bucketNames.join(", ") : "(none yet)");

    const bucket = process.env.SUPABASE_BUCKET || "predicta-storage";
    if (bucketNames.includes(bucket)) {
      console.log("✅ Bucket '" + bucket + "' exists");
    } else {
      console.error("❌ Bucket '" + bucket + "' NOT found");
      console.error("   Create it in Supabase → Storage → New bucket");
    }
  } catch (err) {
    console.error("❌ Storage client failed:", err.message);
  }
}

async function main() {
  const ok = await checkReachable();
  if (!ok) process.exit(1);

  const createClient = await checkLibrary();
  if (!createClient) process.exit(1);

  await checkClient(createClient);
}

main();
