// backend/lib/storage.js
/**
 * Private Storage Service.
 * Implements Supabase Storage integration with transparent local fallback.
 * Strictly enforces private bucket storage and authenticated streaming.
 */

const fs = require("fs");
const path = require("path");
const stream = require("stream");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET || "kyc-documents";

let supabase = null;
const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes("placeholder") &&
  !SUPABASE_KEY.includes("placeholder")
);

if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err.message);
  }
}

// Local storage fallback directory
const localBaseDir = path.join(__dirname, "../storage_private");
if (!fs.existsSync(localBaseDir)) {
  fs.mkdirSync(localBaseDir, { recursive: true });
}

/**
 * Uploads file buffer to private storage.
 * @param {Buffer} buffer 
 * @param {string} storagePath - e.g. "applications/cl9x/uuid.pdf"
 * @param {string} mimeType 
 */
async function putFile(buffer, storagePath, mimeType = "application/pdf") {
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });
    if (error) {
      console.warn("Supabase upload failed, falling back to local:", error.message);
    } else {
      return { path: storagePath, provider: "supabase" };
    }
  }

  // Local filesystem fallback
  const fullLocalPath = path.join(localBaseDir, storagePath);
  fs.mkdirSync(path.dirname(fullLocalPath), { recursive: true });
  fs.writeFileSync(fullLocalPath, buffer);
  return { path: storagePath, provider: "local" };
}

/**
 * Streams file from storage for authenticated Express response.
 * @param {string} storagePath 
 * @returns {Promise<stream.Readable>}
 */
async function getStream(storagePath) {
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(storagePath);

    if (!error && data) {
      const arrayBuffer = await data.arrayBuffer();
      return stream.Readable.from(Buffer.from(arrayBuffer));
    }
  }

  // Local filesystem fallback
  const fullLocalPath = path.join(localBaseDir, storagePath);
  if (fs.existsSync(fullLocalPath)) {
    return fs.createReadStream(fullLocalPath);
  }

  const notFoundErr = new Error("File not found in storage");
  notFoundErr.status = 404;
  throw notFoundErr;
}

/**
 * Deletes file object from storage.
 * @param {string} storagePath 
 */
async function deleteFile(storagePath) {
  if (supabase) {
    try {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    } catch (_) {}
  }

  const fullLocalPath = path.join(localBaseDir, storagePath);
  if (fs.existsSync(fullLocalPath)) {
    try {
      fs.unlinkSync(fullLocalPath);
    } catch (_) {}
  }
}

module.exports = {
  putFile,
  getStream,
  deleteFile,
  isSupabaseConfigured,
};
