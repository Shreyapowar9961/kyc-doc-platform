// backend/middleware/ownership.js
/**
 * Role-Based Access Control and Resource Ownership Middleware.
 * Strictly enforces the BRD v2.0 Section 4 Permission Matrix.
 */

const prisma = require("../lib/prisma");

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

/**
 * Ensures req.user has one of the allowed roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 401, "Authentication required");
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, "You do not have permission to perform this action");
    }
    next();
  };
}

/**
 * Validates application access against ownership rules:
 * - APPLICANT: Must be owner. If non-existent OR belongs to another applicant, return 404.
 * - STAFF (OFFICER, MANAGER, FRAUD_ANALYST): Can access SUBMITTED, UNDER_REVIEW, RECOMMENDED.
 * Attaches req.application.
 */
async function requireApplicationAccess(req, res, next) {
  try {
    const applicationId = req.params.id || req.params.applicationId;
    if (!applicationId) return sendError(res, 400, "Application ID is required");

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        documents: true,
        checks: true,
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        },
        applicant: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!app) return sendError(res, 404, "Application not found");

    const user = req.user;
    if (user.role === "APPLICANT") {
      if (app.applicantId !== user.id) {
        // Return 404 to avoid leaking existence of other applicants' applications
        return sendError(res, 404, "Application not found");
      }
    } else if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(user.role)) {
      // Staff cannot view DRAFT applications
      if (app.status === "DRAFT") {
        return sendError(res, 403, "Officers cannot view draft applications");
      }
    } else if (["ADMIN", "AUDITOR"].includes(user.role)) {
      // Admins and Auditors have platform oversight to inspect application details & checks
    } else {
      return sendError(res, 403, "Unauthorized role");
    }

    req.application = app;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensures the applicant can only modify (upload/delete/submit) their own DRAFT application.
 */
function requireDraftOwner(req, res, next) {
  if (!req.application) return sendError(res, 400, "Application context missing");
  const user = req.user;

  const isOwner = req.application.applicantId === user.id;
  const isAllowed = ["APPLICANT", "ADMIN"].includes(user.role);

  if (!isAllowed || (!isOwner && user.role !== "ADMIN")) {
    return sendError(res, 403, "Only the applicant or administrator can modify this application");
  }

  if (req.application.status !== "DRAFT") {
    return sendError(res, 409, "Cannot modify an application that is already submitted");
  }

  next();
}

module.exports = {
  requireRole,
  requireApplicationAccess,
  requireDraftOwner,
};
