import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(5001),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
    SUPABASE_URL: z.string().url(),
    /** Prefer this for admin APIs (bypasses RLS). Same value as Supabase Dashboard → Settings → API → service_role. */
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
    /** Same key as the Expo app (`EXPO_PUBLIC_SUPABASE_ANON_KEY` / `app.json` extra). Used when service role is unset; RLS still applies. */
    SUPABASE_ANON_KEY: z.string().min(20).optional(),
  })
  .superRefine((data, ctx) => {
    const hasService = Boolean(data.SUPABASE_SERVICE_ROLE_KEY?.trim());
    const hasAnon = Boolean(data.SUPABASE_ANON_KEY?.trim());
    if (!hasService && !hasAnon) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Set SUPABASE_SERVICE_ROLE_KEY (required for admin login / admin_users) or SUPABASE_ANON_KEY for other routes. Run: npm run sync-env-from-app",
        path: ["SUPABASE_ANON_KEY"],
      });
    }
  });

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = ParsedEnv & {
  /** Key passed to @supabase/supabase-js (service role or anon). */
  supabaseServerKey: string;
  /** True when only SUPABASE_ANON_KEY is set (same credentials path as the Expo app). */
  supabaseUsesAnonKey: boolean;
};

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const p = envSchema.parse(process.env);
  const service = p.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = p.SUPABASE_ANON_KEY?.trim();
  const supabaseServerKey = service ?? anon!;
  const supabaseUsesAnonKey = !service && Boolean(anon);
  cached = { ...p, supabaseServerKey, supabaseUsesAnonKey };
  return cached;
}
