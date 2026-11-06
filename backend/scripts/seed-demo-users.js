// backend/scripts/seed-demo-users.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const DEMO_PASSWORD = "DemoPassword123!";

const DEMO_ACCOUNTS = [
  { email: "admin@demo.local", name: "System Administrator", role: "ADMIN" },
  { email: "officer@demo.local", name: "Loan Review Officer", role: "OFFICER" },
  { email: "manager@demo.local", name: "Loan Department Manager", role: "MANAGER" },
  { email: "fraud@demo.local", name: "Senior Fraud Analyst", role: "FRAUD_ANALYST" },
  { email: "auditor@demo.local", name: "Compliance Auditor", role: "AUDITOR" },
  { email: "applicant@demo.local", name: "Sample Applicant", role: "APPLICANT" },
];

async function seed() {
  console.log("Seeding demo user credentials into Neon PostgreSQL...\n");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // 1. Upsert demo accounts for all 6 roles
  for (const acc of DEMO_ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        role: acc.role,
        passwordHash,
        isActive: true,
      },
      create: {
        email: acc.email,
        name: acc.name,
        role: acc.role,
        passwordHash,
        isActive: true,
      },
    });
    console.log(`✅ [${user.role}] ${user.email} (Password: ${DEMO_PASSWORD})`);
  }

  // 2. Clean up throwaway e2e-* test records
  const e2eUsers = await prisma.user.findMany({
    where: { email: { startsWith: "e2e-" } },
    select: { id: true },
  });
  const e2eIds = e2eUsers.map((u) => u.id);

  if (e2eIds.length > 0) {
    await prisma.checkResult.deleteMany({ where: { application: { applicantId: { in: e2eIds } } } });
    await prisma.review.deleteMany({ where: { OR: [{ reviewerId: { in: e2eIds } }, { application: { applicantId: { in: e2eIds } } }] } });
    await prisma.document.deleteMany({ where: { OR: [{ userId: { in: e2eIds } }, { application: { applicantId: { in: e2eIds } } }] } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: e2eIds } } });
    await prisma.application.deleteMany({ where: { applicantId: { in: e2eIds } } });
    const deleted = await prisma.user.deleteMany({ where: { id: { in: e2eIds } } });
    console.log(`\n🧹 Cleaned up ${deleted.count} ephemeral test accounts.`);
  }

  console.log("\n=============================================================");
  console.log("DEMO ACCOUNTS READY TO USE ON http://localhost:3000/login");
  console.log("=============================================================");

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
