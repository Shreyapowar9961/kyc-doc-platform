// backend/lib/mlClient.js
/**
 * Internal Client for calling Python FastAPI ML Microservice.
 * Enforces X-Internal-Key authentication and graceful error handling.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
const ML_INTERNAL_KEY = process.env.ML_INTERNAL_KEY || "local-dev-internal-ml-key";

/**
 * Sends a file buffer to FastAPI for OCR and 9-Class Classification.
 * @param {Buffer} fileBuffer 
 * @param {string} originalName 
 * @param {string} mimeType 
 * @returns {Promise<{class: string|null, confidence: number, outcome: string, ocr_chars: number, text: string}>}
 */
async function classifyFile(fileBuffer, originalName, mimeType) {
  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, originalName);

    const res = await fetch(`${ML_SERVICE_URL}/classify`, {
      method: "POST",
      headers: {
        "X-Internal-Key": ML_INTERNAL_KEY,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      const err = new Error(`ML service error (${res.status}): ${errText}`);
      err.status = res.status === 401 ? 500 : 503;
      throw err;
    }

    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    console.error("ML service unreachable:", err.message);
    const serviceDownErr = new Error("ML classification service is currently unavailable");
    serviceDownErr.status = 503;
    throw serviceDownErr;
  }
}

/**
 * Extracts KYC fields (PAN, Aadhaar, Name, DOB) from document text.
 * @param {string} text 
 * @param {string} docClass 
 * @returns {Promise<{pan?: string, aadhaar_masked?: string, name?: string, dob?: string}>}
 */
async function extractFields(text, docClass = null) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": ML_INTERNAL_KEY,
      },
      body: JSON.stringify({ text, doc_class: docClass }),
    });

    if (!res.ok) {
      console.warn("ML extract returned error:", res.status);
      return {};
    }

    const data = await res.json();
    return data.fields || {};
  } catch (err) {
    console.warn("ML extraction call failed:", err.message);
    return {};
  }
}

module.exports = {
  classifyFile,
  extractFields,
};
