const prisma = require("./prisma");

// Writes one audit row. A failure is logged but never stops the request.
// Never pass passwords, tokens or document text in "details".
async function logAudit({ userId = null, action, documentId = null, details }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, documentId, details: details ?? undefined },
    });
  } catch (err) {
    console.error("Audit log write failed:", err.code || err.name);
  }
}

module.exports = { logAudit };
