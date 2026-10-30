// backend/scripts/test-connections.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const prisma = require("../lib/prisma");
const { getSupabaseClient, getStorageMode } = require("../lib/storage");

async function run() {
  console.log("Testing live infrastructure connections...");
  let allOk = true;

  // 1. Test Database (Neon PostgreSQL)
  try {
    const userCount = await prisma.user.count();
    console.log("✅ Neon PostgreSQL: CONNECTED (User count query succeeded)");
  } catch (err) {
    console.error("❌ Neon PostgreSQL: FAILED ->", err.message);
    allOk = false;
  }

  // 2. Test Supabase Storage
  try {
    const mode = getStorageMode();
    console.log(`ℹ️ Storage Mode: ${mode}`);
    if (mode === "supabase") {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        console.error("❌ Supabase Storage: FAILED ->", error.message);
        allOk = false;
      } else {
        const bucketNames = data.map((b) => b.name);
        console.log("✅ Supabase Storage: CONNECTED (Buckets found:", bucketNames.length, ")");
      }
    } else {
      console.log("⚠️ Supabase Storage: Local filesystem fallback in use (missing URL or Key)");
    }
  } catch (err) {
    console.error("❌ Supabase Storage: FAILED ->", err.message);
    allOk = false;
  }

  // 3. Test Prisma Migrations Status
  try {
    const appTableExists = await prisma.application.count().then(() => true).catch(() => false);
    if (appTableExists) {
      console.log("✅ Additive Database Migration: VERIFIED ('Application' table exists in database)");
    } else {
      console.log("⚠️ Additive Database Migration: PENDING (Application table not yet applied to remote DB)");
    }
  } catch (err) {
    console.log("⚠️ Additive Database Migration check error:", err.message);
  }

  await prisma.$disconnect();
  process.exit(allOk ? 0 : 1);
}

run();
