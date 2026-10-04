/**
 * Supabase Client — Primary Storage Backend for Datasets & Model Files
 *
 * This module initialises a Supabase client using environment variables and
 * exposes file-storage operations for datasets (CSV) and trained models.
 *
 * Prerequisites
 * -------------
 * npm install @supabase/supabase-js
 *
 * Environment variables (add to BE/.env):
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   SUPABASE_KEY=<service_role_key>   ← NOT the anon key; see docs below
 *   SUPABASE_BUCKET=predicta-storage
 *
 * Placeholder defaults are provided below so the app boots without crash
 * even when the real credentials are not yet configured.  Operations will
 * return a clear error until the placeholders are replaced.
 */

const { createClient } = require("@supabase/supabase-js");

// ---------------------------------------------------------------------------
// Configuration — replace placeholders with real values in BE/.env
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const BUCKET_NAME = process.env.SUPABASE_BUCKET || "predicta-storage";

/** Whether the client is ready for real operations. */
const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Lazy-initialised Supabase client.  Returns null when not configured. */
function getClient() {
  if (!isConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ---------------------------------------------------------------------------
// Helper: bucket path helpers
// ---------------------------------------------------------------------------

const STORE_PREFIX = "stores";
const DATASET_PREFIX = "datasets";
const MODEL_PREFIX = "models";

function datasetPath(storeId, filename = null) {
  const base = `${STORE_PREFIX}/${storeId}/${DATASET_PREFIX}`;
  return filename ? `${base}/${filename}` : base;
}

function modelPath(storeId, filename = null) {
  const base = `${STORE_PREFIX}/${storeId}/${MODEL_PREFIX}`;
  return filename ? `${base}/${filename}` : base;
}

// ---------------------------------------------------------------------------
// File Storage Operations
// ---------------------------------------------------------------------------

/**
 * Upload a local file to Supabase Storage.
 *
 * @param {string} path   — storage path (e.g. "stores/STR-4418/datasets/STR-4418.csv")
 * @param {Buffer|ReadableStream} data  — file content
 * @param {object} options  — optional: { contentType, upsert }
 * @returns {Promise<{error?:Error, data?:object}>}
 */
async function uploadFile(path, data, options = {}) {
  const client = getClient();
  if (!client) {
    return {
      error: new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in BE/.env"
      ),
    };
  }

  const { error, data: result } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, data, {
      contentType: options.contentType || "application/octet-stream",
      upsert: options.upsert !== false,
    });

  if (error) console.error("[supabase] upload failed:", error.message);
  return { error, data: result };
}

/**
 * Download a file from Supabase Storage into a Buffer.
 *
 * @param {string} path
 * @returns {Promise<{error?:Error, data?:Buffer}>}
 */
async function downloadFile(path) {
  const client = getClient();
  if (!client) {
    return {
      error: new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in BE/.env"
      ),
    };
  }

  const { error, data } = await client.storage.from(BUCKET_NAME).download(path);
  if (error) console.error("[supabase] download failed:", error.message);
  return { error, data };
}

/**
 * List files under a prefix.
 *
 * @param {string} prefix  — e.g. "stores/STR-4418/datasets"
 * @returns {Promise<{error?:Error, data?:Array}>}
 */
async function listFiles(prefix = "") {
  const client = getClient();
  if (!client) {
    return {
      error: new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in BE/.env"
      ),
    };
  }

  const { error, data } = await client.storage
    .from(BUCKET_NAME)
    .list(prefix, { limit: 1000 });
  if (error) console.error("[supabase] list failed:", error.message);
  return { error, data };
}

/**
 * Remove one or more files.
 *
 * @param {string|string[]} paths
 * @returns {Promise<{error?:Error, data?:object}>}
 */
async function deleteFile(paths) {
  const client = getClient();
  if (!client) {
    return {
      error: new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in BE/.env"
      ),
    };
  }

  const toRemove = Array.isArray(paths) ? paths : [paths];
  const { error, data } = await client.storage
    .from(BUCKET_NAME)
    .remove(toRemove);
  if (error) console.error("[supabase] delete failed:", error.message);
  return { error, data };
}

/**
 * Generate a signed URL for temporary public access (default 60 minutes).
 *
 * @param {string} path
 * @param {number} expiresIn  — seconds
 * @returns {Promise<{error?:Error, signedUrl?:string}>}
 */
async function createSignedUrl(path, expiresIn = 3600) {
  const client = getClient();
  if (!client) {
    return {
      error: new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in BE/.env"
      ),
    };
  }

  const { error, data } = await client.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);
  if (error) console.error("[supabase] signed-url failed:", error.message);
  return { error, signedUrl: data?.signedUrl };
}

// ---------------------------------------------------------------------------
// Convenience: dataset-specific helpers
// ---------------------------------------------------------------------------

/**
 * Upload a store's dataset CSV.
 * @param {string} storeId
 * @param {Buffer} csvBuffer
 * @returns {Promise<{error?:Error, data?:object}>}
 */
async function uploadDataset(storeId, csvBuffer) {
  return uploadFile(
    datasetPath(storeId, `${storeId}.csv`),
    csvBuffer,
    { contentType: "text/csv", upsert: true }
  );
}

/**
 * Download a store's dataset CSV.
 * @param {string} storeId
 * @returns {Promise<{error?:Error, data?:Buffer}>}
 */
async function downloadDataset(storeId) {
  return downloadFile(datasetPath(storeId, `${storeId}.csv`));
}

// ---------------------------------------------------------------------------
// Convenience: model-specific helpers
// ---------------------------------------------------------------------------

/**
 * Upload a trained model file.
 * @param {string} storeId
 * @param {string} filename  — e.g. "active_model.model"
 * @param {Buffer} modelBuffer
 * @returns {Promise<{error?:Error, data?:object}>}
 */
async function uploadModel(storeId, filename, modelBuffer) {
  return uploadFile(
    modelPath(storeId, filename),
    modelBuffer,
    { contentType: "application/octet-stream", upsert: true }
  );
}

/**
 * Download a trained model file.
 * @param {string} storeId
 * @param {string} filename
 * @returns {Promise<{error?:Error, data?:Buffer}>}
 */
async function downloadModel(storeId, filename) {
  return downloadFile(modelPath(storeId, filename));
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

function status() {
  return {
    configured: isConfigured,
    url: isConfigured ? SUPABASE_URL : "<not set — placeholder>",
    bucket: BUCKET_NAME,
    clientReady: isConfigured,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Core storage
  uploadFile,
  downloadFile,
  listFiles,
  deleteFile,
  createSignedUrl,

  // Domain helpers
  uploadDataset,
  downloadDataset,
  uploadModel,
  downloadModel,

  // Path builders
  datasetPath,
  modelPath,
  BUCKET_NAME,

  // Diagnostics
  status,
  isConfigured,
};
