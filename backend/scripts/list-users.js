// backend/scripts/list-users.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const prisma = require("../lib/prisma");

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nFound ${users.length} registered user(s) in database:`);
  users.forEach((u) => {
    console.log(` - Email: ${u.email} | Name: ${u.name || "N/A"} | Role: ${u.role} | Active: ${u.isActive} | ID: ${u.id}`);
  });

  await prisma.$disconnect();
}

main();
