import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
/** Repo root (parent of admin-web) — required so Vercel traces `../shared-types` and `../admin-backend`. */
const monorepoRoot = join(projectRoot, "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@incloser/shared-types"],
  /**
   * Keep the Express app and its native-ish deps OUT of Next.js's bundle —
   * they're loaded at runtime by the Node.js API route (`pages/api/admin-backend/[[...slug]].ts`).
   * Bundling them via webpack breaks dynamic `require`s inside Express / Supabase.
   */
  serverExternalPackages: [
    "@incloser/admin-backend",
    "@supabase/supabase-js",
    "express",
    "bcryptjs",
    "jsonwebtoken",
    "cors",
    "multer",
    "zod",
  ],
  turbopack: {
    root: monorepoRoot,
  },
  /**
   * Two modes:
   *  - When `ADMIN_API_PROXY_TARGET` is set, proxy the browser's `/api/admin-backend/*`
   *    to a separately deployed admin-backend (Option A).
   *  - When unset, fall through so the embedded `pages/api/admin-backend/[[...slug]].ts`
   *    handles requests in-process (Option B — default).
   */
  async rewrites() {
    const target = process.env.ADMIN_API_PROXY_TARGET?.trim();
    if (!target) return [];
    return [
      {
        source: "/api/admin-backend/:path*",
        destination: `${target.replace(/\/$/, "")}/api/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
