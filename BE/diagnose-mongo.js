/**
 * MongoDB Atlas Connection Diagnostic
 *
 * Run this to pinpoint exactly why the connection fails:
 *   cd BE && node diagnose-mongo.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function diagnose() {
  const url = process.env.MONGO_ATLAS_URL || process.env.MONGO_COMPASS_URL || process.env.MONGO_URL;

  if (!url) {
    console.error("❌ No MongoDB URL found in BE/.env");
    console.error("   Set MONGO_ATLAS_URL, MONGO_COMPASS_URL, or MONGO_URL");
    process.exit(1);
  }

  // Mask the password for safe display
  const safeUrl = url.replace(/:([^@]+)@/, ":***@");
  console.log("URL (password hidden):", safeUrl);
  console.log("");

  try {
    await mongoose.connect(url, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    console.log("✅ Connected successfully!");
    console.log("   Database:", mongoose.connection.name);
    console.log("   Host:", mongoose.connection.host);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed");
    console.error("   Error:", err.message);
    console.error("");

    // Decode the specific error
    if (err.message.includes("authentication failed")) {
      console.error("→ CAUSE: Wrong username or password.");
      console.error("   Make sure you use the DATABASE USER password,");
      console.error("   not your Atlas login password.");
      console.error("   Go to Atlas → Database Access → verify the user exists.");
    } else if (err.message.includes("IP that isn't whitelisted")) {
      console.error("→ CAUSE: Your IP is not whitelisted.");
      console.error("   Your current public IP:", "158.140.166.37");
      console.error("   Go to Atlas → Network Access → add this IP.");
    } else if (err.message.includes("getaddrinfo") || err.message.includes("ENOTFOUND")) {
      console.error("→ CAUSE: Cannot resolve the cluster hostname.");
      console.error("   The cluster name in your URL may be wrong.");
      console.error("   Go to Atlas → Database → check the exact cluster name.");
    } else if (err.message.includes("self-signed certificate") || err.message.includes("SSL")) {
      console.error("→ CAUSE: SSL/TLS issue (rare).");
      console.error("   Try adding tlsAllowInvalidCertificates=true to the URL.");
    } else if (err.message.includes("connection timed out")) {
      console.error("→ CAUSE: Firewall or network blocking port 27017.");
      console.error("   Check if you're on a corporate VPN or restricted network.");
    } else {
      console.error("→ UNKNOWN CAUSE. Full error below:");
      console.error(err);
    }

    process.exit(1);
  }
}

diagnose();
