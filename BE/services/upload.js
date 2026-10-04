/**
 * File upload handling for the sales-history importer.
 *
 * Files land in a temp directory outside the repo and are deleted by the caller
 * once the import has run — nothing uploaded is kept.
 *
 * The stored filename is generated, never taken from the client: the original
 * name is only used to read its extension. That keeps a crafted name like
 * "../../BE/.env" from writing anywhere it should not.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const multer = require("multer");

const UPLOAD_DIR = path.join(os.tmpdir(), "predicta-uploads");

// Extensions the importer can read. .xls is listed so the error message can
// explain that it needs a conversion, rather than a bare "unsupported".
const ACCEPTED = new Set([".csv", ".txt", ".tsv", ".xlsx", ".xlsm"]);
const READABLE = ".csv, .xlsx, .tsv or .txt";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — a decade of daily rows is far smaller

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = ACCEPTED.has(ext) ? ext : ".bin";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safe}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext === ".xls") {
    const error = new Error(
      "Legacy .xls files are not supported. Save the file as .xlsx or .csv and try again.",
    );
    error.status = 400;
    return cb(error);
  }
  if (!ACCEPTED.has(ext)) {
    const error = new Error(
      `Unsupported file type '${ext || "unknown"}'. Upload a ${READABLE} file.`,
    );
    error.status = 400;
    return cb(error);
  }
  return cb(null, true);
}

const singleFile = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter,
}).single("file");

/**
 * Run the upload as a promise so the route can catch multer's errors (wrong
 * type, too large) in the same place as everything else, instead of them
 * escaping to a generic Express error handler.
 */
function parseSingleFile(req, res) {
  return new Promise((resolve, reject) => {
    singleFile(req, res, (error) => (error ? reject(error) : resolve()));
  });
}

/** Remove a temp file, ignoring the case where it is already gone. */
function removeQuietly(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[upload] could not remove temp file:", error.message);
    }
  }
}

/** Write a short-lived JSON sidecar (used for the menu) and return its path. */
function writeTempJson(prefix, value) {
  const file = path.join(UPLOAD_DIR, `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.json`);
  fs.writeFileSync(file, JSON.stringify(value), "utf8");
  return file;
}

module.exports = {
  ACCEPTED,
  MAX_BYTES,
  UPLOAD_DIR,
  parseSingleFile,
  removeQuietly,
  singleFile,
  writeTempJson,
};
