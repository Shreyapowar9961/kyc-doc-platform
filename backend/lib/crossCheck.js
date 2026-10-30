// backend/lib/crossCheck.js
/**
 * Cross-Document Verification Engine (R2).
 * Compares Name (Token-Sort Fuzzy Match) and Date of Birth across application documents.
 */

function normalizeName(name) {
  if (!name || typeof name !== "string") return "";
  let s = name.toUpperCase().replace(/[^A-Z\s]/g, " ");
  // Strip common honorifics
  s = s.replace(/\b(MR|MS|MRS|SHRI|SMT|DR|PROF)\b/g, " ");
  const tokens = s.trim().split(/\s+/).filter(Boolean);
  tokens.sort();
  return tokens.join(" ");
}

/**
 * Computes Token Sort similarity ratio (0 to 100).
 */
function tokenSortRatio(str1, str2) {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;

  // Levenshtein distance between sorted token strings
  const len1 = s1.length;
  const len2 = s2.length;
  const d = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) d[i][0] = i;
  for (let j = 0; j <= len2; j++) d[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  const dist = d[len1][len2];
  const maxLen = Math.max(len1, len2);
  const ratio = Math.round(((maxLen - dist) / maxLen) * 100);
  return Math.max(0, Math.min(100, ratio));
}

/**
 * Runs cross-document verification on an application's documents.
 * @param {Array<Object>} documents 
 * @returns {Array<Object>} list of CheckResult payloads
 */
function performCrossChecks(documents) {
  const checks = [];
  const docsWithFields = documents.filter(
    (d) => d.extractedFields && typeof d.extractedFields === "object"
  );

  if (docsWithFields.length < 2) {
    return checks;
  }

  // 1. Name Cross-Check
  const docsWithName = docsWithFields.filter((d) => d.extractedFields.name);
  if (docsWithName.length >= 2) {
    for (let i = 0; i < docsWithName.length; i++) {
      for (let j = i + 1; j < docsWithName.length; j++) {
        const d1 = docsWithName[i];
        const d2 = docsWithName[j];
        const name1 = d1.extractedFields.name;
        const name2 = d2.extractedFields.name;

        const ratio = tokenSortRatio(name1, name2);

        if (ratio >= 90) {
          checks.push({
            check: "NAME_MATCH",
            severity: "INFO",
            reasonCode: "NAME_MATCH_OK",
            message: `Name verified across ${d1.class || d1.originalName} and ${d2.class || d2.originalName}`,
            evidence: { docId1: d1.id, name1, docId2: d2.id, name2, score: ratio },
          });
        } else if (ratio >= 75) {
          checks.push({
            check: "NAME_MATCH",
            severity: "WARNING",
            reasonCode: "NAME_MISMATCH_SUSPECT",
            message: `Minor name variance between ${d1.class || d1.originalName} (${name1}) and ${d2.class || d2.originalName} (${name2})`,
            evidence: { docId1: d1.id, name1, docId2: d2.id, name2, score: ratio },
          });
        } else {
          checks.push({
            check: "NAME_MATCH",
            severity: "CRITICAL",
            reasonCode: "NAME_MISMATCH",
            message: `Name on ${d1.class || d1.originalName} (${name1}) differs significantly from ${d2.class || d2.originalName} (${name2})`,
            evidence: { docId1: d1.id, name1, docId2: d2.id, name2, score: ratio },
          });
        }
      }
    }
  }

  // 2. DOB Cross-Check
  const docsWithDob = docsWithFields.filter((d) => d.extractedFields.dob);
  if (docsWithDob.length >= 2) {
    for (let i = 0; i < docsWithDob.length; i++) {
      for (let j = i + 1; j < docsWithDob.length; j++) {
        const d1 = docsWithDob[i];
        const d2 = docsWithDob[j];
        const dob1 = d1.extractedFields.dob;
        const dob2 = d2.extractedFields.dob;

        if (dob1 === dob2) {
          checks.push({
            check: "DOB_MATCH",
            severity: "INFO",
            reasonCode: "DOB_MATCH_OK",
            message: `Date of birth matches exactly between ${d1.class || d1.originalName} and ${d2.class || d2.originalName}`,
            evidence: { docId1: d1.id, dob1, docId2: d2.id, dob2 },
          });
        } else {
          checks.push({
            check: "DOB_MATCH",
            severity: "CRITICAL",
            reasonCode: "DOB_MISMATCH",
            message: `DOB mismatch: ${d1.class || d1.originalName} reports ${dob1} but ${d2.class || d2.originalName} reports ${dob2}`,
            evidence: { docId1: d1.id, dob1, docId2: d2.id, dob2 },
          });
        }
      }
    }
  }

  return checks;
}

module.exports = {
  normalizeName,
  tokenSortRatio,
  performCrossChecks,
};
