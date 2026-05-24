/**
 * Writes admin-backend/.env Supabase URL + anon key from the Expo app (repo root app.json expo.extra).
 * Preserves PORT, NODE_ENV, JWT_SECRET, and a real SUPABASE_SERVICE_ROLE_KEY if already set.
 * Removes example placeholders so the anon key from the app is used until you add a service role.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminRoot = join(__dirname, "..");
const repoRoot = join(adminRoot, "..");
const appJsonPath = join(repoRoot, "app.json");
const envPath = join(adminRoot, ".env");

const PLACEHOLDER_URL = "https://your-project-id.supabase.co";
const PLACEHOLDER_SERVICE = "your-service-role-key";

const app = JSON.parse(readFileSync(appJsonPath, "utf8"));
const url = app.expo?.extra?.supabaseUrl?.trim();
const anon = app.expo?.extra?.supabaseAnonKey?.trim();
if (!url || !anon) {
  console.error("app.json is missing expo.extra.supabaseUrl and/or supabaseAnonKey.");
  process.exit(1);
}

/** @type {Map<string, string>} */
const vars = new Map();
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) vars.set(key, value);
  }
}

vars.set("SUPABASE_URL", url);
vars.set("SUPABASE_ANON_KEY", anon);

const existingService = vars.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
if (!existingService || existingService === PLACEHOLDER_SERVICE) {
  vars.delete("SUPABASE_SERVICE_ROLE_KEY");
}

const existingUrl = vars.get("SUPABASE_URL");
if (existingUrl === PLACEHOLDER_URL) {
  vars.set("SUPABASE_URL", url);
}

if (!vars.has("PORT")) vars.set("PORT", "5001");
if (!vars.has("NODE_ENV")) vars.set("NODE_ENV", "development");
if (!vars.has("JWT_SECRET")) vars.set("JWT_SECRET", "change_me_change_me");

const order = ["PORT", "NODE_ENV", "JWT_SECRET", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const out = [];
out.push("# Supabase URL + anon key synced from repo app.json (expo.extra) — same project as the Expo app.");
out.push("# Optional: add SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API for full admin RLS bypass.");
for (const key of order) {
  if (vars.has(key)) out.push(`${key}=${vars.get(key)}`);
}
for (const [key, value] of vars) {
  if (!order.includes(key)) out.push(`${key}=${value}`);
}

writeFileSync(envPath, `${out.join("\n")}\n`, "utf8");
console.log(`Updated ${envPath} from ${appJsonPath}`);
