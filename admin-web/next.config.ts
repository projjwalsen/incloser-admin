import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
/** Repo root (parent of admin-web) — required so Vercel traces `../shared-types`. */
const monorepoRoot = join(projectRoot, "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@incloser/shared-types"],
  turbopack: {
    root: monorepoRoot,
  },
  /** Browser → same-origin `/api/admin-backend/*` → Express admin API (avoids CORS / wrong-host issues). */
  async rewrites() {
    const target = (process.env.ADMIN_API_PROXY_TARGET ?? "http://127.0.0.1:5001").replace(/\/$/, "");
    return [{ source: "/api/admin-backend/:path*", destination: `${target}/api/admin/:path*` }];
  },
};

export default nextConfig;
