import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

const buckets = [
  "business-documents",
  "payment-receipts",
  "share-certificates",
];

const backupRoot = path.join(
  process.cwd(),
  "storage-backups",
  "2026-06-07"
);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function listFilesRecursive(bucket, prefix = "") {
  const allFiles = [];

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    throw new Error(`Failed to list ${bucket}/${prefix}: ${error.message}`);
  }

  for (const item of data || []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      const nestedFiles = await listFilesRecursive(bucket, itemPath);
      allFiles.push(...nestedFiles);
    } else {
      allFiles.push(itemPath);
    }
  }

  return allFiles;
}

async function downloadFile(bucket, filePath) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (error) {
    throw new Error(`Failed to download ${bucket}/${filePath}: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outputPath = path.join(backupRoot, bucket, filePath);
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, buffer);

  return outputPath;
}

async function main() {
  await ensureDir(backupRoot);

  const manifest = {
    backed_up_at: new Date().toISOString(),
    buckets: {},
  };

  for (const bucket of buckets) {
    console.log(`\nBacking up bucket: ${bucket}`);

    const files = await listFilesRecursive(bucket);
    manifest.buckets[bucket] = {
      total_files: files.length,
      files,
    };

    for (const file of files) {
      const savedTo = await downloadFile(bucket, file);
      console.log(`Saved: ${savedTo}`);
    }
  }

  const manifestPath = path.join(backupRoot, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log("\nStorage backup complete.");
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});