// backend/scripts/test-supabase.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.SUPABASE_BUCKET || "kyc-documents";

  console.log("Connecting to Supabase Storage...");
  if (!url || !key) {
    console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment!");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    // 1. List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error("❌ Failed to list Supabase buckets:", listError.message);
      process.exit(1);
    }

    console.log("Existing buckets found:", buckets.map((b) => `${b.name} (public: ${b.public})`));

    // 2. Check if kyc-documents bucket exists
    let bucket = buckets.find((b) => b.name === bucketName);
    if (!bucket) {
      console.log(`Bucket "${bucketName}" not found. Creating private bucket...`);
      const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 20 * 1024 * 1024, // 20 MB limit
      });
      if (createError) {
        console.error(`❌ Failed to create bucket "${bucketName}":`, createError.message);
        process.exit(1);
      }
      console.log(`✅ Created private bucket: "${bucketName}"`);
    } else {
      console.log(`✅ Bucket "${bucketName}" exists. Public status: ${bucket.public}`);
      if (bucket.public) {
        console.log(`Updating "${bucketName}" to strict private mode (public: false)...`);
        const { error: updateError } = await supabase.storage.updateBucket(bucketName, { public: false });
        if (updateError) {
          console.warn(`Warning: Could not update bucket visibility: ${updateError.message}`);
        } else {
          console.log(`✅ Bucket "${bucketName}" updated to private.`);
        }
      }
    }

    // 3. Test upload and download of test probe file
    const testPath = `_test/probe-${Date.now()}.txt`;
    const testPayload = Buffer.from("KYC Platform Storage Verification - " + new Date().toISOString(), "utf8");

    console.log(`Uploading test probe to "${testPath}"...`);
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testPath, testPayload, { contentType: "text/plain", upsert: true });

    if (uploadError) {
      console.error("❌ Upload test failed:", uploadError.message);
      process.exit(1);
    }
    console.log("✅ Test probe uploaded successfully.");

    // 4. Download and verify content
    console.log(`Downloading test probe from "${testPath}"...`);
    const { data: downloadedData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testPath);

    if (downloadError) {
      console.error("❌ Download test failed:", downloadError.message);
      process.exit(1);
    }

    const downloadedText = Buffer.from(await downloadedData.arrayBuffer()).toString("utf8");
    if (downloadedText === testPayload.toString("utf8")) {
      console.log("✅ Download verified: payload matches exactly!");
    } else {
      console.error("❌ Download verification mismatch!");
      process.exit(1);
    }

    // 5. Clean up probe
    await supabase.storage.from(bucketName).remove([testPath]);
    console.log("✅ Test probe removed.");

    console.log("\n🎉 ALL SUPABASE STORAGE CHECKS PASSED!");
  } catch (err) {
    console.error("❌ Unexpected Supabase error:", err.message);
    process.exit(1);
  }
}

run();
