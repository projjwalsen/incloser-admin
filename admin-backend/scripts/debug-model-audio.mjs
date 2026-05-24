/**
 * Debug audio for a female_profiles id.
 * Usage: node scripts/debug-model-audio.mjs <profile-id>
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const profileId = process.argv[2];
if (!profileId) {
  console.error("Usage: node scripts/debug-model-audio.mjs <female_profiles.id>");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: profile, error: pErr } = await supabase
  .from("female_profiles")
  .select("id,user_id,nickname,audio_verification_url,audio_verification_duration_sec,verification_status")
  .eq("id", profileId)
  .maybeSingle();

console.log("--- female_profiles ---");
if (pErr) console.error(pErr);
else console.log(JSON.stringify(profile, null, 2));

const { data: avRows, error: avErr } = await supabase
  .from("audio_verifications")
  .select("*")
  .eq("model_id", profileId)
  .order("created_at", { ascending: false });

console.log("\n--- audio_verifications ---");
if (avErr) console.error(avErr.message, avErr.code);
else console.log(JSON.stringify(avRows, null, 2));

if (profile?.audio_verification_url) {
  const raw = profile.audio_verification_url.trim();
  let playable = raw;
  if (!/^https?:\/\//i.test(raw)) {
    const path = raw.replace(/^audio-verifications\//, "").replace(/^\//, "");
    const { data } = supabase.storage.from("audio-verifications").getPublicUrl(path);
    playable = data?.publicUrl ?? "(no public url)";
  }
  console.log("\n--- resolved playback url ---");
  console.log(playable);
  if (playable.startsWith("http")) {
    try {
      const head = await fetch(playable, { method: "HEAD" });
      console.log("HEAD status:", head.status, head.headers.get("content-type"));
    } catch (e) {
      console.log("HEAD failed:", e.message);
    }
  }
}
