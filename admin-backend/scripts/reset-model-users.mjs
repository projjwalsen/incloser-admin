/**
 * Remove model users (and/or one phone) so registration can be tested again.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in admin-backend/.env
 *
 * Usage (from admin-backend/):
 *   npm run reset-model-users              # delete ALL users with role = model
 *   npm run reset-model-users -- +919876543210   # delete user(s) for this phone (any role)
 *
 * Also clears otp_sessions for affected phone numbers.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminRoot = join(__dirname, "..");
const envPath = join(adminRoot, ".env");

function loadDotenv() {
  if (!existsSync(envPath)) {
    console.error(`Missing ${envPath}. Copy .env.example and set SUPABASE_SERVICE_ROLE_KEY.`);
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

function phoneVariants(phone) {
  const digits = phone.replace(/\D/g, "");
  const set = new Set([phone.trim()]);
  if (digits.length >= 10) {
    const local10 = digits.slice(-10);
    set.add(local10);
    set.add(`+91${local10}`);
    set.add(`+91 ${local10}`);
  }
  return [...set];
}

async function main() {
  loadDotenv();
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env");
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => a !== "--");
  const phoneArg = args[0];

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase.from("users").select("id, phone, role, is_onboarding_completed");

  if (phoneArg) {
    const variants = phoneVariants(phoneArg);
    query = query.in("phone", variants);
    console.log("Target phone variants:", variants.join(", "));
  } else {
    query = query.eq("role", "model");
    console.log("Target: all users with role = model");
  }

  const { data: users, error: listError } = await query;
  if (listError) {
    console.error("List users failed:", listError.message);
    process.exit(1);
  }

  if (!users?.length) {
    console.log("No matching users found. Clearing OTP sessions for phone if provided.");
    if (phoneArg) {
      const variants = phoneVariants(phoneArg);
      await supabase.from("otp_sessions").delete().in("phone", variants);
      console.log("Cleared otp_sessions for:", variants.join(", "));
    }
    return;
  }

  console.log("Will delete:");
  for (const u of users) {
    console.log(`  - ${u.phone} (${u.role}, onboarding=${u.is_onboarding_completed}) id=${u.id}`);
  }

  const allPhones = new Set();
  for (const u of users) {
    for (const p of phoneVariants(u.phone)) allPhones.add(p);
  }

  const ids = users.map((u) => u.id);

  const { error: deleteUsersError } = await supabase.from("users").delete().in("id", ids);
  if (deleteUsersError) {
    console.error("Delete users failed:", deleteUsersError.message);
    console.error(
      "If this mentions calls or foreign keys, remove related rows first or delete from SQL Editor."
    );
    process.exit(1);
  }

  const { error: deleteOtpError } = await supabase
    .from("otp_sessions")
    .delete()
    .in("phone", [...allPhones]);

  if (deleteOtpError) {
    console.warn("Warning: otp_sessions cleanup:", deleteOtpError.message);
  }

  console.log(`Deleted ${ids.length} user(s) and cleared OTP sessions.`);
  console.log("On the phone: force-stop the app / clear Expo Go data, then register again.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
