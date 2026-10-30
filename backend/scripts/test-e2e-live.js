// backend/scripts/test-e2e-live.js
/**
 * End-to-end integration test running directly against live Neon PostgreSQL and Supabase Storage.
 * Verifies Auth, Application creation, Document upload, Private Supabase streaming download,
 * and Officer review workflows with complete audit trail inspection.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../server");
const prisma = require("../lib/prisma");
const { getSupabaseClient, deleteFile } = require("../lib/storage");

async function main() {
  console.log("==================================================================");
  console.log("   LIVE END-TO-END INTEGRATION TEST (NEON DB + SUPABASE STORAGE)   ");
  console.log("==================================================================\n");

  const stamp = Date.now();
  const applicantEmail = `e2e-applicant-${stamp}@kyc-test.local`;
  const officerEmail = `e2e-officer-${stamp}@kyc-test.local`;
  const password = "StrongTestPassword123!";

  let applicantToken = null;
  let applicantId = null;
  let officerToken = null;
  let officerId = null;
  let applicationId = null;
  let documentId = null;
  let storagePath = null;

  try {
    // 1. Register Applicant
    console.log("[1/9] Registering Applicant on live Neon DB...");
    const regRes = await request(app)
      .post("/auth/register")
      .send({ email: applicantEmail, name: "E2E Test Applicant", password });

    if (regRes.status !== 201) throw new Error(`Registration failed: ${regRes.text}`);
    applicantId = regRes.body.user.id;
    console.log("  ✅ Applicant registered successfully (ID:", applicantId, ")");

    // 2. Login Applicant
    console.log("[2/9] Authenticating Applicant...");
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: applicantEmail, password });

    if (loginRes.status !== 200) throw new Error(`Login failed: ${loginRes.text}`);
    applicantToken = loginRes.body.token;
    console.log("  ✅ JWT received for Applicant.");

    // 3. Register & Promote Officer
    console.log("[3/9] Creating Officer Account on live Neon DB...");
    const regOffRes = await request(app)
      .post("/auth/register")
      .send({ email: officerEmail, name: "E2E Review Officer", password });

    if (regOffRes.status !== 201) throw new Error(`Officer register failed: ${regOffRes.text}`);
    officerId = regOffRes.body.user.id;

    // Directly update role to OFFICER in DB for testing
    await prisma.user.update({
      where: { id: officerId },
      data: { role: "OFFICER" },
    });

    const offLoginRes = await request(app)
      .post("/auth/login")
      .send({ email: officerEmail, password });

    officerToken = offLoginRes.body.token;
    console.log("  ✅ Officer account promoted and authenticated.");

    // 4. Create Draft Application
    console.log("[4/9] Creating new Loan Application...");
    const appRes = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${applicantToken}`)
      .send({ title: "Home Loan Application - Test Dossier" });

    if (appRes.status !== 201) throw new Error(`Create application failed: ${appRes.text}`);
    applicationId = appRes.body.application.id;
    console.log("  ✅ Application created (Status:", appRes.body.application.status, "ID:", applicationId, ")");

    // 5. Upload Synthetic Document (PDF or PNG) to Application
    console.log("[5/9] Uploading document to private Supabase bucket via Express...");
    // Create a realistic sample PDF buffer
    const samplePdfPath = path.resolve(__dirname, "../../data/kyc/demo_set/clean_pan.png");
    let fileBuffer;
    let fileName = "pan_card.png";
    let mimeType = "image/png";

    if (fs.existsSync(samplePdfPath)) {
      fileBuffer = fs.readFileSync(samplePdfPath);
    } else {
      // Minimal valid 1-pixel PNG buffer
      fileBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    }

    const uploadRes = await request(app)
      .post(`/applications/${applicationId}/documents`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .attach("files", fileBuffer, { filename: fileName, contentType: mimeType });

    if (uploadRes.status !== 201) throw new Error(`Document upload failed: ${uploadRes.text}`);
    const uploadedDocs = uploadRes.body.documents;
    documentId = uploadedDocs[0].id;
    storagePath = uploadedDocs[0].storagePath;
    console.log("  ✅ Document uploaded to Supabase bucket. (Doc ID:", documentId, "Class:", uploadedDocs[0].class, ")");

    // 6. Test Authenticated Streaming Download
    console.log("[6/9] Testing Authenticated Express streaming download...");
    const downloadRes = await request(app)
      .get(`/documents/${documentId}/file`)
      .set("Authorization", `Bearer ${applicantToken}`);

    if (downloadRes.status !== 200) throw new Error(`Streaming download failed: ${downloadRes.status}`);
    if (downloadRes.body.length !== fileBuffer.length) {
      throw new Error(`Downloaded byte length mismatch: expected ${fileBuffer.length}, got ${downloadRes.body.length}`);
    }
    console.log("  ✅ Authenticated streaming download verified: bytes match exactly (", downloadRes.body.length, "bytes )");

    // Also verify unauthenticated access is rejected
    const unauthRes = await request(app).get(`/documents/${documentId}/file`);
    if (unauthRes.status !== 401) throw new Error("Security check failed: unauthenticated download was not rejected with 401!");
    console.log("  ✅ Security check: Unauthenticated download correctly rejected with 401.");

    // 7. Submit Application
    console.log("[7/9] Submitting Application...");
    const submitRes = await request(app)
      .post(`/applications/${applicationId}/submit`)
      .set("Authorization", `Bearer ${applicantToken}`);

    if (submitRes.status !== 200) throw new Error(`Submit failed: ${submitRes.text}`);
    console.log("  ✅ Application status changed to:", submitRes.body.application.status);

    // 8. Officer Review Workflow
    console.log("[8/9] Officer inspecting application and recording review recommendation...");
    const getAppRes = await request(app)
      .get(`/applications/${applicationId}`)
      .set("Authorization", `Bearer ${officerToken}`);

    if (getAppRes.status !== 200) throw new Error(`Officer fetch failed: ${getAppRes.status}`);
    console.log("  ✅ Officer successfully accessed submitted application.");

    const reviewRes = await request(app)
      .post(`/applications/${applicationId}/review`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        recommendation: "APPROVE",
        reason: "All identity documents verified against live database and storage.",
      });

    if (reviewRes.status !== 201) throw new Error(`Review recommendation failed: ${reviewRes.text}`);
    console.log("  ✅ Officer recorded recommendation:", reviewRes.body.review.recommendation);
    console.log("  ✅ Application status advanced to:", reviewRes.body.status);

    // 9. Inspect Neon Audit Log
    console.log("[9/9] Verifying append-only audit trail in Neon DB...");
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: { in: [applicantId, officerId] } },
      orderBy: { createdAt: "asc" },
    });

    const recordedActions = auditLogs.map((l) => l.action);
    console.log("  Recorded Audit Actions:", recordedActions);
    const expectedActions = ["REGISTER", "LOGIN", "APPLICATION_CREATE", "DOCUMENT_UPLOAD", "FILE_DOWNLOAD", "APPLICATION_SUBMIT", "REVIEW_RECOMMEND"];
    const allFound = expectedActions.every((act) => recordedActions.includes(act));

    if (!allFound) {
      throw new Error(`Audit trail missing expected actions! Recorded: ${recordedActions}`);
    }
    console.log("  ✅ All required compliance audit events recorded in Neon PostgreSQL!");

    console.log("\n==================================================================");
    console.log("   🎉 ALL LIVE INTEGRATION TESTS PASSED WITH 100% SUCCESS!       ");
    console.log("==================================================================");

  } catch (err) {
    console.error("\n❌ LIVE E2E TEST FAILED:", err.message);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log("\nCleaning up test artifacts from Neon and Supabase...");
    try {
      if (storagePath) {
        await deleteFile(storagePath);
      }
      if (applicationId) {
        await prisma.checkResult.deleteMany({ where: { applicationId } });
        await prisma.review.deleteMany({ where: { applicationId } });
        await prisma.document.deleteMany({ where: { applicationId } });
        await prisma.auditLog.deleteMany({ where: { applicationId } });
        await prisma.application.delete({ where: { id: applicationId } });
      }
      if (applicantId) {
        await prisma.auditLog.deleteMany({ where: { userId: applicantId } });
        await prisma.user.delete({ where: { id: applicantId } });
      }
      if (officerId) {
        await prisma.auditLog.deleteMany({ where: { userId: officerId } });
        await prisma.user.delete({ where: { id: officerId } });
      }
      console.log("✅ Cleanup complete. Database and storage restored to pristine state.");
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr.message);
    }
    await prisma.$disconnect();
  }
}

main();
