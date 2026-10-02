import Link from "next/link";
import type { PropsWithChildren } from "react";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/public-site-config";

export function PublicSiteShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[6%] h-64 w-64 rounded-full bg-[var(--bg-gradient-a)] blur-3xl opacity-80" />
        <div className="absolute right-[6%] top-[12%] h-72 w-72 rounded-full bg-[var(--bg-gradient-b)] blur-3xl opacity-80" />
        <div className="absolute bottom-[6%] left-[24%] h-72 w-72 rounded-full bg-[var(--bg-gradient-c)] blur-3xl opacity-70" />
      </div>

      <header className="relative z-10 border-b border-white/60 bg-[var(--shell-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="group">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              In-Closer
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
              Safe social connection
            </p>
          </Link>
          <a
            href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
            className="text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            Support
          </a>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>

      <footer className="relative z-10 border-t border-white/60 bg-[var(--shell-bg)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Support
              </p>
              <a
                href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                className="mt-2 inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                {PUBLIC_SUPPORT_EMAIL}
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Legal
              </p>
              <ul className="mt-2 space-y-2 text-sm font-medium text-[var(--text-secondary)]">
                <li>
                  <Link href="/privacy-policy" className="hover:text-[var(--primary)] hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/delete-account" className="hover:text-[var(--primary)] hover:underline">
                    Delete Account
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} In-Closer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
