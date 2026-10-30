// backend/scripts/inspect-db.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const prisma = require("../lib/prisma");

async function inspect() {
  console.log("Connecting to Neon PostgreSQL via Prisma Client...");

  try {
    // 1. Query table names in public schema
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tableNames = tables.map(r => r.table_name);
    console.log("✅ Neon PostgreSQL: CONNECTED SUCCESSFULLY");
    console.log("Existing tables in public schema:", tableNames);

    // 2. Check _prisma_migrations
    if (tableNames.includes("_prisma_migrations")) {
      const migs = await prisma.$queryRawUnsafe(`
        SELECT migration_name, finished_at, rolled_back_at 
        FROM _prisma_migrations 
        ORDER BY started_at;
      `);
      console.log("Prisma migration history:");
      migs.forEach(r => {
        console.log(` - ${r.migration_name} (Finished: ${r.finished_at ? "YES" : "NO"})`);
      });
    } else {
      console.log("No _prisma_migrations table found in database.");
    }

    // 3. Inspect table counts
    if (tableNames.includes("User")) {
      const userCount = await prisma.user.count();
      console.log(`Existing "User" table rows: ${userCount}`);
    }
    if (tableNames.includes("Document")) {
      const docCount = await prisma.document.count();
      console.log(`Existing "Document" table rows: ${docCount}`);
    }
    if (tableNames.includes("AuditLog")) {
      const auditCount = await prisma.auditLog.count();
      console.log(`Existing "AuditLog" table rows: ${auditCount}`);
    }
    if (tableNames.includes("Application")) {
      const appCount = await prisma.application.count();
      console.log(`Existing "Application" table rows: ${appCount}`);
    } else {
      console.log(`"Application" table does not exist yet (ready for additive migration).`);
    }

  } catch (err) {
    console.error("❌ Neon PostgreSQL error:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
