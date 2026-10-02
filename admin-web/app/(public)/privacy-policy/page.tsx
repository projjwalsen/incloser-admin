import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_POLICY_PARAGRAPHS } from "@/lib/legal-content";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/public-site-config";

export const metadata: Metadata = {
  title: "Privacy Policy | In-Closer",
  description: "In-Closer privacy policy — how we collect, use, and protect your personal data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-[24px] border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md sm:p-10">
        <h1 className="text-heading-1 text-[var(--text-primary)]">Privacy Policy</h1>
        <p className="mt-4 text-body-sm text-[var(--text-muted)]">Last updated: October 2026</p>
        <div className="mt-8 space-y-4">
          {PRIVACY_POLICY_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph} className="text-body-sm text-[var(--text-secondary)]">
              {paragraph}
            </p>
          ))}
        </div>
        <p className="mt-8 text-body-sm text-[var(--text-secondary)]">
          To request account deletion, see{" "}
          <Link href="/delete-account" className="font-semibold text-[var(--primary)] hover:underline">
            Delete Account
          </Link>{" "}
          or email{" "}
          <a
            href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            {PUBLIC_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </article>
  );
}
