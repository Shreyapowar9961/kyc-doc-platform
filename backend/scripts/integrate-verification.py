# backend/scripts/integrate-verification.py
import re

with open("backend/routes/applications.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add import
if 'const { verifyDocumentAuthenticity }' not in code:
    code = code.replace(
        'const { performCrossChecks } = require("../lib/crossCheck");',
        'const { performCrossChecks } = require("../lib/crossCheck");\nconst { verifyDocumentAuthenticity } = require("../lib/verification");'
    )
    print("Added verification import")

# 2. Update upload route to calculate verification
upload_target = """        // 3. Extract KYC fields (R2)
        let extracted = {};
        if (mlResult.text) {
          try {
            extracted = await mlClient.extractFields(mlResult.text, mlResult.class);
          } catch (_) {}
        }"""

upload_replacement = """        // 3. Extract KYC fields & verify authenticity (R1 + R2)
        let extracted = {};
        if (mlResult.text) {
          try {
            extracted = await mlClient.extractFields(mlResult.text, mlResult.class);
          } catch (_) {}
        }

        const verification = verifyDocumentAuthenticity({
          docClass: mlResult.class || "other_unknown",
          text: mlResult.text || "",
          confidence: mlResult.confidence || 0,
          ocrChars: mlResult.ocr_chars || 0,
          extractedFields: extracted,
        });
        extracted.verification = verification;"""

if upload_target in code:
    code = code.replace(upload_target, upload_replacement)
    print("Replaced upload logic")
elif upload_target.replace("\n", "\r\n") in code:
    code = code.replace(upload_target.replace("\n", "\r\n"), upload_replacement.replace("\n", "\r\n"))
    print("Replaced upload logic (CRLF)")
else:
    print("Upload target not found")

# 3. Update GET /:id route
get_target = """  // Mask internal database storage paths in user responses
  const safeDocuments = app.documents.map((d) => ({
    id: d.id,
    applicationId: d.applicationId,
    originalName: d.originalName,
    class: d.class,
    confidence: d.confidence,
    outcome: d.outcome,
    ocrChars: d.ocrChars,
    extractedFields: d.extractedFields,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    uploadDate: d.uploadDate,
  }));

  res.json({
    application: {
      ...app,
      documents: safeDocuments,
    },
  });"""

get_replacement = """  // Enrich documents with verification & mask internal storage paths
  const safeDocuments = app.documents.map((d) => {
    let extractedFields = (d.extractedFields && typeof d.extractedFields === "object") ? { ...d.extractedFields } : {};
    let verification = extractedFields.verification;
    if (!verification) {
      verification = verifyDocumentAuthenticity({
        docClass: d.class,
        text: d.text || "",
        confidence: d.confidence,
        ocrChars: d.ocrChars || 0,
        extractedFields,
      });
      extractedFields.verification = verification;
    }

    return {
      id: d.id,
      applicationId: d.applicationId,
      originalName: d.originalName,
      class: d.class,
      confidence: d.confidence,
      outcome: d.outcome,
      ocrChars: d.ocrChars,
      extractedFields,
      verification,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadDate: d.uploadDate,
    };
  });

  const totalDocs = safeDocuments.length;
  const avgScore = totalDocs > 0
    ? Math.round(safeDocuments.reduce((sum, d) => sum + (d.verification?.authenticityScore || 0), 0) / totalDocs)
    : 0;

  let dossierStatus = "INCOMPLETE";
  if (totalDocs > 0) {
    dossierStatus = avgScore >= 80 ? "AUTHENTIC" : avgScore >= 60 ? "NEEDS_REVIEW" : "UNVERIFIED";
  }

  const liveChecks = performCrossChecks(app.documents);

  res.json({
    application: {
      ...app,
      documents: safeDocuments,
      dossierVerification: {
        overallScore: avgScore,
        status: dossierStatus,
        totalDocuments: totalDocs,
        crossChecks: liveChecks,
      },
    },
  });"""

if get_target in code:
    code = code.replace(get_target, get_replacement)
    print("Replaced GET /:id logic")
elif get_target.replace("\n", "\r\n") in code:
    code = code.replace(get_target.replace("\n", "\r\n"), get_replacement.replace("\n", "\r\n"))
    print("Replaced GET /:id logic (CRLF)")
else:
    print("GET target not found")

with open("backend/routes/applications.js", "w", encoding="utf-8") as f:
    f.write(code)
print("Updated backend/routes/applications.js successfully")
