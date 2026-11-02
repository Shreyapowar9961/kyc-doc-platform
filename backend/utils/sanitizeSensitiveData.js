// backend/utils/sanitizeSensitiveData.js
/**
 * Sensitive Data Sanitizer & Aadhaar Masking Utility.
 *
 * Implements Aadhaar redaction according to regulatory guidelines:
 * - Detects 12 consecutive digits (e.g. 123456789012)
 * - Detects 12 digits separated by spaces (e.g. 1234 5678 9012)
 * - Detects 12 digits separated by hyphens (e.g. 1234-5678-9012)
 * - Masks the first 8 digits and preserves the last 4 digits
 * - Preserves spacing / format where applicable
 * - Handles multiple Aadhaar occurrences in long text
 * - Avoids false positives on shorter/longer numbers (e.g. 10-digit phones, 16-digit cards, 9-digit accounts)
 */

// Negative lookaround to ensure we don't match 16-digit card numbers or longer segmented numbers
// Lookbehind: not preceded by a digit or a digit followed by space/hyphen
// Lookahead: not followed by a digit or space/hyphen followed by a digit

// Replacement patterns (global /g)
const AADHAAR_SPACED_REGEX = /(?<!\d)(?<!\d\s+)(\d{4})\s+(\d{4})\s+(\d{4})(?!\s*\d)(?!\d)/g;
const AADHAAR_HYPHEN_REGEX = /(?<!\d)(?<!\d-)(\d{4})-(\d{4})-(\d{4})(?!-\d)(?!\d)/g;
const AADHAAR_MIXED_REGEX = /(?<!\d)(?<!\d[ -])(\d{4})[ -](\d{4})[ -](\d{4})(?![ -]\d)(?!\d)/g;
const AADHAAR_CONTINUOUS_REGEX = /(?<!\d)\d{8}(\d{4})(?!\d)/g;

// Detection patterns (stateless non-global to prevent regex.test() lastIndex state bugs)
const AADHAAR_SPACED_TEST = /(?<!\d)(?<!\d\s+)(\d{4})\s+(\d{4})\s+(\d{4})(?!\s*\d)(?!\d)/;
const AADHAAR_HYPHEN_TEST = /(?<!\d)(?<!\d-)(\d{4})-(\d{4})-(\d{4})(?!-\d)(?!\d)/;
const AADHAAR_MIXED_TEST = /(?<!\d)(?<!\d[ -])(\d{4})[ -](\d{4})[ -](\d{4})(?![ -]\d)(?!\d)/;
const AADHAAR_CONTINUOUS_TEST = /(?<!\d)\d{8}(\d{4})(?!\d)/;

/**
 * Checks if a string contains any unmasked 12-digit Aadhaar number.
 * @param {string} text
 * @returns {boolean}
 */
function hasRawAadhaar(text) {
  if (typeof text !== "string" || !text) return false;
  return (
    AADHAAR_SPACED_TEST.test(text) ||
    AADHAAR_HYPHEN_TEST.test(text) ||
    AADHAAR_MIXED_TEST.test(text) ||
    AADHAAR_CONTINUOUS_TEST.test(text)
  );
}

/**
 * Masks 12-digit Aadhaar numbers in text, preserving only the last 4 digits.
 * @param {string} text - Raw OCR or document text
 * @returns {string} Sanitized text with Aadhaar numbers masked
 */
function maskAadhaar(text) {
  if (typeof text !== "string" || !text) {
    return text;
  }

  let sanitized = text;

  // 1. Space-separated: "1234 5678 9012" -> "XXXX XXXX 9012"
  sanitized = sanitized.replace(AADHAAR_SPACED_REGEX, "XXXX XXXX $3");

  // 2. Hyphen-separated: "1234-5678-9012" -> "XXXX-XXXX-9012"
  sanitized = sanitized.replace(AADHAAR_HYPHEN_REGEX, "XXXX-XXXX-$3");

  // 3. Mixed space/hyphen (if any remaining) -> "XXXX-XXXX-9012"
  sanitized = sanitized.replace(AADHAAR_MIXED_REGEX, "XXXX-XXXX-$3");

  // 4. Continuous 12 digits: "123456789012" -> "XXXX-XXXX-9012"
  sanitized = sanitized.replace(AADHAAR_CONTINUOUS_REGEX, "XXXX-XXXX-$1");

  return sanitized;
}

/**
 * Deeply sanitizes sensitive data (strings, objects, arrays).
 * @param {any} input
 * @returns {any} Sanitized clone of input
 */
function sanitizeSensitiveData(input) {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return maskAadhaar(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeSensitiveData(item));
  }

  if (typeof input === "object" && !(input instanceof Date) && !Buffer.isBuffer(input)) {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
      if (
        (key.toLowerCase().includes("aadhaar") || key.toLowerCase().includes("uid")) &&
        typeof value === "string" &&
        /^\d{12}$/.test(value)
      ) {
        output[key] = `XXXX-XXXX-${value.slice(-4)}`;
      } else {
        output[key] = sanitizeSensitiveData(value);
      }
    }
    return output;
  }

  return input;
}

module.exports = {
  maskAadhaar,
  maskAadhaarInText: maskAadhaar,
  sanitizeSensitiveData,
  hasRawAadhaar,
};
