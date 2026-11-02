// backend/tests/api.test.js
/**
 * Comprehensive Automated Test Suite for KYC & Loan Document Platform.
 * Verifies Auth regression, Section 4 Permission Matrix, Mandatory Security Fixes, and Applications Lifecycle.
 */

const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// In-memory mock database state
const mockUsers = [];
const mockApplications = [];
const mockDocuments = [];
const mockAuditLogs = [];
const mockCheckResults = [];
const mockReviews = [];

let mockUserAutoId = 1;
let mockDocAutoId = 1;
let mockAppAutoId = 1;
let mockReviewAutoId = 1;
let mockCheckAutoId = 1;

// Mock Prisma client
jest.mock("../lib/prisma", () => ({
  user: {
    create: jest.fn(async ({ data }) => {
      if (mockUsers.some((u) => u.email === data.email)) {
        const err = new Error("Unique constraint failed");
        err.code = "P2002";
        throw err;
      }
      const user = {
        id: `usr_${mockUserAutoId++}`,
        email: data.email,
        name: data.name || null,
        passwordHash: data.passwordHash,
        role: "APPLICANT",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsers.push(user);
      return user;
    }),
    findUnique: jest.fn(async ({ where }) => {
      if (where.email) return mockUsers.find((u) => u.email === where.email) || null;
      if (where.id) return mockUsers.find((u) => u.id === where.id) || null;
      return null;
    }),
    findMany: jest.fn(async () => mockUsers),
    count: jest.fn(async (args) => {
      if (args && args.where) {
        return mockUsers.filter((u) => {
          for (const [k, v] of Object.entries(args.where)) {
            if (u[k] !== v) return false;
          }
          return true;
        }).length;
      }
      return mockUsers.length;
    }),
    update: jest.fn(async ({ where, data }) => {
      const u = mockUsers.find((usr) => usr.id === where.id);
      if (!u) return null;
      Object.assign(u, data);
      return u;
    }),
  },
  application: {
    create: jest.fn(async ({ data }) => {
      const app = {
        id: `app_${mockAppAutoId++}`,
        applicantId: data.applicantId,
        title: data.title || "Untitled",
        status: data.status || "DRAFT",
        createdAt: new Date(),
        submittedAt: null,
        documents: [],
        checks: [],
        reviews: [],
      };
      mockApplications.push(app);
      return app;
    }),
    findUnique: jest.fn(async ({ where }) => {
      const app = mockApplications.find((a) => a.id === where.id);
      if (!app) return null;
      const docs = mockDocuments.filter((d) => d.applicationId === app.id);
      const checks = mockCheckResults.filter((c) => c.applicationId === app.id);
      const reviews = mockReviews.filter((r) => r.applicationId === app.id);
      return { ...app, documents: docs, checks, reviews };
    }),
    findMany: jest.fn(async ({ where }) => {
      return mockApplications.filter((a) => {
        if (where.applicantId && a.applicantId !== where.applicantId) return false;
        if (where.status?.in && !where.status.in.includes(a.status)) return false;
        return true;
      });
    }),
    count: jest.fn(async () => mockApplications.length),
    update: jest.fn(async ({ where, data }) => {
      const app = mockApplications.find((a) => a.id === where.id);
      if (!app) return null;
      Object.assign(app, data);
      return app;
    }),
  },
  document: {
    create: jest.fn(async ({ data }) => {
      const doc = {
        id: mockDocAutoId++,
        ...data,
        uploadDate: new Date(),
      };
      mockDocuments.push(doc);
      return doc;
    }),
    findFirst: jest.fn(async ({ where }) => {
      return mockDocuments.find((d) => d.id === where.id && d.applicationId === where.applicationId) || null;
    }),
    findUnique: jest.fn(async ({ where }) => {
      const d = mockDocuments.find((doc) => doc.id === where.id);
      if (!d) return null;
      const app = mockApplications.find((a) => a.id === d.applicationId);
      return { ...d, application: app || null };
    }),
    findMany: jest.fn(async () => mockDocuments),
    count: jest.fn(async () => mockDocuments.length),
    groupBy: jest.fn(async () => []),
    delete: jest.fn(async ({ where }) => {
      const idx = mockDocuments.findIndex((d) => d.id === where.id);
      if (idx !== -1) mockDocuments.splice(idx, 1);
      return { id: where.id };
    }),
  },
  auditLog: {
    create: jest.fn(async ({ data }) => {
      mockAuditLogs.push({ id: mockAuditLogs.length + 1, ...data, createdAt: new Date() });
    }),
    findMany: jest.fn(async () => mockAuditLogs),
    count: jest.fn(async () => mockAuditLogs.length),
  },
  checkResult: {
    create: jest.fn(async ({ data }) => {
      const cr = { id: mockCheckAutoId++, ...data, createdAt: new Date() };
      mockCheckResults.push(cr);
      return cr;
    }),
  },
  review: {
    create: jest.fn(async ({ data }) => {
      const rev = { id: mockReviewAutoId++, ...data, createdAt: new Date() };
      mockReviews.push(rev);
      return rev;
    }),
  },
}));

// Mock ML Client and Storage
jest.mock("../lib/mlClient", () => ({
  classifyFile: jest.fn(async () => ({
    class: "pan_card",
    confidence: 0.94,
    outcome: "CLASSIFIED",
    ocr_chars: 120,
    text: "INCOME TAX DEPARTMENT PAN: ABCDE1234F Name: RAMESH KUMAR DOB: 12/04/1985",
  })),
  extractFields: jest.fn(async () => ({
    pan: "ABCDE1234F",
    name: "RAMESH KUMAR",
    dob: "1985-04-12",
  })),
}));

jest.mock("../lib/storage", () => ({
  putFile: jest.fn(async () => ({ path: "applications/app_1/mock.pdf" })),
  getStream: jest.fn(async () => {
    const stream = require("stream");
    return stream.Readable.from(Buffer.from("%PDF-1.4 mock pdf data"));
  }),
  deleteFile: jest.fn(async () => {}),
  isSupabaseConfigured: false,
}));

process.env.JWT_SECRET = "test-jwt-secret-at-least-32-chars-long";
process.env.NODE_ENV = "test";

const app = require("../server");

describe("KYC & Loan Platform - Comprehensive API Test Suite", () => {
  let applicantAToken;
  let applicantBToken;
  let officerToken;
  let auditorToken;
  let adminToken;
  let fraudAnalystToken;
  let applicantAId;
  let applicantBId;

  beforeAll(async () => {
    // 1. Create Applicant A
    const resA = await request(app)
      .post("/auth/register")
      .send({ email: "applicant.a@example.com", name: "Applicant A", password: "Password1234!" });
    applicantAId = resA.body.user.id;

    const loginA = await request(app)
      .post("/auth/login")
      .send({ email: "applicant.a@example.com", password: "Password1234!" });
    applicantAToken = loginA.body.token;

    // 2. Create Applicant B
    const resB = await request(app)
      .post("/auth/register")
      .send({ email: "applicant.b@example.com", name: "Applicant B", password: "Password1234!" });
    applicantBId = resB.body.user.id;

    const loginB = await request(app)
      .post("/auth/login")
      .send({ email: "applicant.b@example.com", password: "Password1234!" });
    applicantBToken = loginB.body.token;

    // 3. Create Officer User
    const officerHash = await bcrypt.hash("Password1234!", 10);
    const officerUser = {
      id: "usr_officer",
      email: "officer@example.com",
      name: "Loan Officer",
      passwordHash: officerHash,
      role: "OFFICER",
      isActive: true,
      createdAt: new Date(),
    };
    mockUsers.push(officerUser);
    officerToken = jwt.sign({}, process.env.JWT_SECRET, { subject: officerUser.id });

    // 4. Create Auditor User
    const auditorUser = {
      id: "usr_auditor",
      email: "auditor@example.com",
      name: "Compliance Auditor",
      passwordHash: officerHash,
      role: "AUDITOR",
      isActive: true,
      createdAt: new Date(),
    };
    mockUsers.push(auditorUser);
    auditorToken = jwt.sign({}, process.env.JWT_SECRET, { subject: auditorUser.id });

    // 5. Create Admin User
    const adminUser = {
      id: "usr_admin",
      email: "admin@example.com",
      name: "System Admin",
      passwordHash: officerHash,
      role: "ADMIN",
      isActive: true,
      createdAt: new Date(),
    };
    mockUsers.push(adminUser);
    adminToken = jwt.sign({}, process.env.JWT_SECRET, { subject: adminUser.id });

    // 6. Create Fraud Analyst User
    const fraudUser = {
      id: "usr_fraud",
      email: "fraud@example.com",
      name: "Fraud Analyst",
      passwordHash: officerHash,
      role: "FRAUD_ANALYST",
      isActive: true,
      createdAt: new Date(),
    };
    mockUsers.push(fraudUser);
    fraudAnalystToken = jwt.sign({}, process.env.JWT_SECRET, { subject: fraudUser.id });

    // Seed mock document for download testing
    mockDocuments.push({
      id: 1,
      filename: "test.pdf",
      originalName: "test.pdf",
      storagePath: "applications/app_seed/test.pdf",
      class: "pan_card",
      mimeType: "application/pdf",
      userId: "usr_other",
      applicationId: "app_seed",
    });
    mockApplications.push({
      id: "app_seed",
      applicantId: "usr_other",
      title: "Seed App",
      status: "SUBMITTED",
      createdAt: new Date(),
    });
  });

  describe("1. Authentication & Security Regressions", () => {
    it("register -> 201, role APPLICANT, never exposes passwordHash", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "test.reg@example.com", name: "Test User", password: "ValidPassword123" });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("APPLICANT");
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it("register with sneaky role ADMIN -> rejected with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "sneaky@example.com", name: "Sneaky", password: "ValidPassword123", role: "ADMIN" });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/restricted to applicants/i);
    });

    it("duplicate registration email returns 409", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "applicant.a@example.com", password: "ValidPassword123" });
      expect(res.status).toBe(409);
    });

    it("weak password (< 10 chars) returns 400", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "weak@example.com", password: "short" });
      expect(res.status).toBe(400);
    });

    it("login with wrong password returns 401", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "applicant.a@example.com", password: "WrongPassword!" });
      expect(res.status).toBe(401);
    });

    it("/auth/me with valid token returns user profile", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${applicantAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("applicant.a@example.com");
    });

    it("/auth/me without token returns 401", async () => {
      const res = await request(app).get("/auth/me");
      expect(res.status).toBe(401);
    });

    it("/auth/me with invalid token returns 401", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token-string");
      expect(res.status).toBe(401);
    });
  });

  describe("2. Mandatory Security Fixes (S3, S6, S8, S9)", () => {
    it("S3: Direct /uploads route must return 404 (No public static file serving)", async () => {
      const res = await request(app).get("/uploads/test.pdf");
      expect(res.status).toBe(404);
    });

    it("Public unauthenticated download from /documents/:id/file returns 401", async () => {
      const res = await request(app).get("/documents/1/file");
      expect(res.status).toBe(401);
    });

    it("Auditor attempting to download document file returns 403 (Permission Matrix)", async () => {
      const res = await request(app)
        .get("/documents/1/file")
        .set("Authorization", `Bearer ${auditorToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("3. Applications Lifecycle & RBAC Matrix", () => {
    let createdAppId;

    it("Applicant creates a new DRAFT application -> 201", async () => {
      const res = await request(app)
        .post("/applications")
        .set("Authorization", `Bearer ${applicantAToken}`)
        .send({ title: "Home Loan Application" });
      expect(res.status).toBe(201);
      expect(res.body.application.status).toBe("DRAFT");
      createdAppId = res.body.application.id;
    });

    it("Admin cannot create application -> 403", async () => {
      const res = await request(app)
        .post("/applications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Admin Illegitimate App" });
      expect(res.status).toBe(403);
    });

    it("Applicant B cannot view Applicant A's application -> 404 (Isolation)", async () => {
      const res = await request(app)
        .get(`/applications/${createdAppId}`)
        .set("Authorization", `Bearer ${applicantBToken}`);
      expect(res.status).toBe(404);
    });

    it("Officer cannot view application while status is DRAFT -> 403", async () => {
      const res = await request(app)
        .get(`/applications/${createdAppId}`)
        .set("Authorization", `Bearer ${officerToken}`);
      expect(res.status).toBe(403);
    });

    it("Upload document with invalid extension (.exe) -> 415", async () => {
      const res = await request(app)
        .post(`/applications/${createdAppId}/documents`)
        .set("Authorization", `Bearer ${applicantAToken}`)
        .attach("files", Buffer.from("fake exe"), "malware.exe");
      expect(res.status).toBe(415);
    });

    it("Upload valid PDF document to DRAFT application -> 201, classified", async () => {
      // Valid PDF magic bytes: %PDF-1.4
      const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF");
      const res = await request(app)
        .post(`/applications/${createdAppId}/documents`)
        .set("Authorization", `Bearer ${applicantAToken}`)
        .attach("files", pdfBuffer, "pan_card.pdf");

      expect(res.status).toBe(201);
      expect(res.body.documents).toHaveLength(1);
      expect(res.body.documents[0].class).toBe("pan_card");
      expect(res.body.documents[0].outcome).toBe("CLASSIFIED");
    });

    it("Admin cannot upload documents to application -> 403", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4\nadmin upload");
      const res = await request(app)
        .post(`/applications/${createdAppId}/documents`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("files", pdfBuffer, "admin_doc.pdf");
      expect(res.status).toBe(403);
    });

    it("Admin cannot delete document from application -> 403", async () => {
      const res = await request(app)
        .delete(`/applications/${createdAppId}/documents/mock_doc_id`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it("Applicant submitting with fewer than 2 documents is rejected -> 400", async () => {
      const res = await request(app)
        .post(`/applications/${createdAppId}/submit`)
        .set("Authorization", `Bearer ${applicantAToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("at least 2 documents");
    });

    it("Applicant uploads second document and submits -> 200, status becomes SUBMITTED", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4\nsecond doc");
      const upRes = await request(app)
        .post(`/applications/${createdAppId}/documents`)
        .set("Authorization", `Bearer ${applicantAToken}`)
        .attach("files", pdfBuffer, "salary_slip.pdf");
      expect(upRes.status).toBe(201);

      const res = await request(app)
        .post(`/applications/${createdAppId}/submit`)
        .set("Authorization", `Bearer ${applicantAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe("SUBMITTED");
    });

    it("Applicant cannot upload documents after application is SUBMITTED -> 409", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4\nsecond doc");
      const res = await request(app)
        .post(`/applications/${createdAppId}/documents`)
        .set("Authorization", `Bearer ${applicantAToken}`)
        .attach("files", pdfBuffer, "extra.pdf");
      expect(res.status).toBe(409);
    });

    it("Officer can now view SUBMITTED application -> 200", async () => {
      const res = await request(app)
        .get(`/applications/${createdAppId}`)
        .set("Authorization", `Bearer ${officerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe("SUBMITTED");
    });

    it("Officer records review recommendation APPROVE -> 201, status RECOMMENDED", async () => {
      const res = await request(app)
        .post(`/applications/${createdAppId}/review`)
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ recommendation: "APPROVE", reason: "All documents verified" });

      expect(res.status).toBe(201);
      expect(res.body.review.recommendation).toBe("APPROVE");
      expect(res.body.status).toBe("RECOMMENDED");
    });

    it("Auditor can access /admin/audit and view audit logs -> 200", async () => {
      const res = await request(app)
        .get("/admin/audit")
        .set("Authorization", `Bearer ${auditorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });

    it("Applicant cannot access /admin/audit -> 403", async () => {
      const res = await request(app)
        .get("/admin/audit")
        .set("Authorization", `Bearer ${applicantAToken}`);
      expect(res.status).toBe(403);
    });

    it("F9: Fraud Analyst cannot submit review recommendation -> 403", async () => {
      const res = await request(app)
        .post(`/applications/${createdAppId}/review`)
        .set("Authorization", `Bearer ${fraudAnalystToken}`)
        .send({ recommendation: "APPROVE", reason: "Fraud check looks fine" });
      expect(res.status).toBe(403);
    });

    it("F3: Demoting last active ADMIN is blocked -> 400", async () => {
      const res = await request(app)
        .patch("/admin/users/usr_admin/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "OFFICER" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("last active ADMIN");
    });

    it("F3: Deactivating last active ADMIN is blocked -> 400", async () => {
      const res = await request(app)
        .patch("/admin/users/usr_admin/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("last active ADMIN");
    });

    it("F7: Admin can deactivate and reactivate non-admin user -> 200", async () => {
      // Deactivate
      const deactRes = await request(app)
        .patch("/admin/users/usr_fraud/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.user.isActive).toBe(false);

      // Reactivate
      const reactRes = await request(app)
        .patch("/admin/users/usr_fraud/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });
      expect(reactRes.status).toBe(200);
      expect(reactRes.body.user.isActive).toBe(true);
    });

    it("F4: Oversized document upload returns 413 instead of 500", async () => {
      // Create a draft application
      const appRes = await request(app)
        .post("/applications")
        .set("Authorization", `Bearer ${applicantAToken}`)
        .send({ title: "Oversized Test App" });
      const testAppId = appRes.body.application.id;

      // 11MB buffer (exceeds default 10MB limit)
      const oversizedBuf = Buffer.alloc(11 * 1024 * 1024, "%PDF-1.4\nlarge-content");
      const uploadRes = await request(app)
        .post(`/applications/${testAppId}/documents`)
        .set("Authorization", `Bearer ${applicantAToken}`)
        .attach("files", oversizedBuf, "oversized.pdf");

      expect(uploadRes.status).toBe(413);
      expect(uploadRes.body.error).toMatch(/too large/i);
    });
  });
});
