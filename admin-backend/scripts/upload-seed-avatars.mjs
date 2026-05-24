/**
 * Upload F2–F8 / M2–M8 PNGs from the repo into Supabase Storage so `avatars_seed.sql` URLs work.
 *
 * Prereq: Dashboard → Storage → New bucket → name `onboarding-avatars` → Public bucket (or add a public read policy).
 *
 * Usage (from admin-backend/):
 *   npm run upload-seed-avatars
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 * Source files: ../assets/images/{F2..F8,M2..M8}.png
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminRoot = join(__dirname, "..");
const repoRoot = join(adminRoot, "..");
const envPath = join(adminRoot, ".env");
const assetsDir = join(repoRoot, "assets", "images");

const BUCKET = "onboarding-avatars";
const FILES = ["F2", "F3", "F4", "F5", "F6", "F7", "F8", "M2", "M3", "M4", "M5", "M6", "M7", "M8"].map((f) => `${f}.png`);

function loadDotenv() {
  if (!existsSync(envPath)) {
    console.error(`Missing ${envPath}`);
    process.exit(1);
  }
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadDotenv();
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in admin-backend/.env");
    process.exit(1);
  }

  if (!existsSync(assetsDir)) {
    console.error(`Missing assets folder: ${assetsDir}`);
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const name of FILES) {
    const filePath = join(assetsDir, name);
    if (!existsSync(filePath)) {
      console.error(`Missing file: ${filePath}`);
      process.exit(1);
    }
    const buf = readFileSync(filePath);
    const { error } = await supabase.storage.from(BUCKET).upload(name, buf, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) {
      console.error(`Upload failed for ${name}:`, error.message);
      console.error("Create a public bucket named onboarding-avatars if it does not exist, then retry.");
      process.exit(1);
    }
    console.log("OK", name);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl("F2.png");
  console.log("\nDone. Example URL:", data.publicUrl);
  console.log("If images 404 in the browser, confirm the bucket is public and paths match avatars_seed.sql.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
