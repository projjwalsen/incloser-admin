/**
 * Set password (bcrypt) for an admin_users row.
 *
 * Usage (from admin-backend/):
 *   npm run set-admin-password -- <email> <new-password>
 *
 * If you have exactly ONE admin row, you may use:
 *   npm run set-admin-password -- <new-password>
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
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
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
    process.exit(1);
  }

  const a = process.argv[2];
  const b = process.argv[3];

  let email;
  let password;

  if (a && b) {
    email = a.trim().toLowerCase();
    password = b;
  } else if (a) {
    password = a;
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.from("admin_users").select("email");
    if (error) {
      console.error("List admins failed:", error.message);
      process.exit(1);
    }
    if (!data?.length) {
      console.error("No admin_users rows. Create one with: npm run create-admin -- <email> <password> ...");
      process.exit(1);
    }
    if (data.length > 1) {
      console.error("Multiple admins exist; pass email explicitly:\n  npm run set-admin-password -- <email> <new-password>");
      for (const row of data) console.error(" -", row.email);
      process.exit(1);
    }
    email = data[0].email;
    console.log("Using sole admin email:", email);
  } else {
    console.error("Usage: npm run set-admin-password -- <email> <new-password>");
    console.error("   or: npm run set-admin-password -- <new-password>   (only when exactly one admin exists)");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password_hash = bcrypt.hashSync(password, 12);
  const { data, error } = await supabase
    .from("admin_users")
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq("email", email)
    .select("id,email")
    .maybeSingle();

  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }
  if (!data) {
    console.error("No row updated — check email matches admin_users.email (lowercase).");
    process.exit(1);
  }

  console.log("Password updated for:", data.email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
