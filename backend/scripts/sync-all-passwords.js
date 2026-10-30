// backend/scripts/sync-all-passwords.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const UNIFIED_PASSWORD = "DemoPassword123!";

async function main() {
  const hash = await bcrypt.hash(UNIFIED_PASSWORD, 12);
  const updated = await prisma.user.updateMany({
    data: { passwordHash: hash },
  });

  console.log(`✅ Successfully updated ${updated.count} users with unified password: "${UNIFIED_PASSWORD}"`);

  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true, isActive: true },
    orderBy: { role: "asc" },
  });

  console.log("\n=========================================================================");
  console.log("            ALL ACTIVE PLATFORM USER CREDENTIALS (NEON DB)               ");
  console.log("=========================================================================");
  users.forEach((u) => {
    console.log(`Role: ${u.role.padEnd(14)} | Email: ${u.email.padEnd(30)} | Password: ${UNIFIED_PASSWORD} | Name: ${u.name || "N/A"}`);
  });
  console.log("=========================================================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
