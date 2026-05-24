/**
 * Create the first (or additional) admin user in Supabase `admin_users`.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in admin-backend/.env
 *
 * Usage (from admin-backend/):
 *   node scripts/create-admin.mjs <email> <plain-password> [full_name] [role]
 *
 * Example:
 *   node scripts/create-admin.mjs admin@incloser.app 'Str0ng!Pass' "Ops Admin" super_admin
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminRoot = join(__dirname, "..");
const envPath = join(adminRoot, ".env");

function loadDotenv() {
  if (!existsSync(envPath)) {
    console.error(`Missing ${envPath}. Copy .env.example or run npm run sync-env-from-app`);
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

const ROLES = new Set(["super_admin", "moderator", "verification_admin", "finance_admin", "support_admin"]);

async function main() {
  loadDotenv();
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env (service role required to insert).");
    process.exit(1);
  }

  const [, , emailArg, passwordArg, fullNameArg = "", roleArg = "super_admin"] = process.argv;
  if (!emailArg || !passwordArg) {
    console.error("Usage: node scripts/create-admin.mjs <email> <password> [full_name] [role]");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Invalid email.");
    process.exit(1);
  }

  if (passwordArg.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const role = roleArg.trim();
  if (!ROLES.has(role)) {
    console.error(`Invalid role. Use one of: ${[...ROLES].join(", ")}`);
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password_hash = bcrypt.hashSync(passwordArg, 12);
  const full_name = fullNameArg.trim();

  const { data, error } = await supabase
    .from("admin_users")
    .insert({ email, password_hash, full_name, role, is_active: true })
    .select("id,email,full_name,role,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.error("That email is already registered.");
    } else {
      console.error("Insert failed:", error.message);
    }
    process.exit(1);
  }

  console.log("Admin user created:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
