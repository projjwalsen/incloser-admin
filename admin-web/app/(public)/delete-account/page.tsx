import type { Metadata } from "next";
import Link from "next/link";
import {
  ACCOUNT_DELETION_MAILTO,
  PUBLIC_SUPPORT_EMAIL,
} from "@/lib/public-site-config";

export const metadata: Metadata = {
  title: "Delete Account | In-Closer",
  description: "Request deletion of your In-Closer account and associated personal data.",
  robots: { index: true, follow: true },
};

const retentionItems = [
  "Profile information",
  "Registered mobile number",
  "Profile preferences",
  "Uploaded profile information",
  "Other personal information associated with your account",
];

export default function DeleteAccountPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-[24px] border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md sm:p-10">
        <h1 className="text-heading-1 text-[var(--text-primary)]">Delete Your In-Closer Account</h1>
        <p className="mt-4 text-body text-[var(--text-secondary)]">
          If you would like to permanently delete your In-Closer account and associated personal data,
          you can request account deletion using the options below.
        </p>

        <section className="mt-10">
          <h2 className="text-heading-2 text-[var(--text-primary)]">Delete from the In-Closer app</h2>
          <p className="mt-3 text-body-sm text-[var(--text-secondary)]">
            If you still have access to your In-Closer account, you can request account deletion
            directly from the app.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-body-sm text-[var(--text-secondary)]">
            <li>Open the In-Closer app.</li>
            <li>Go to your Profile or Settings.</li>
            <li>Open Account settings.</li>
            <li>Select &quot;Delete Account&quot;.</li>
            <li>Confirm your account deletion request.</li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-heading-2 text-[var(--text-primary)]">
            Request account deletion without the app
          </h2>
          <p className="mt-3 text-body-sm text-[var(--text-secondary)]">
            If you are unable to access the In-Closer app, you can request deletion by contacting
            our support team.
          </p>
          <a
            href={ACCOUNT_DELETION_MAILTO}
            className="mt-6 inline-flex items-center justify-center rounded-[14px] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            Request Account Deletion
          </a>
          <p className="mt-4 text-body-sm text-[var(--text-muted)]">
            When contacting us, please include the mobile number registered with your In-Closer
            account. We may contact you to verify account ownership before processing the deletion
            request.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading-2 text-[var(--text-primary)]">What happens after deletion</h2>
          <p className="mt-3 text-body-sm text-[var(--text-secondary)]">
            Once your account deletion request has been verified and processed, your In-Closer
            account and associated personal data will be deleted.
          </p>
          <p className="mt-3 text-body-sm font-medium text-[var(--text-secondary)]">
            This may include:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body-sm text-[var(--text-secondary)]">
            {retentionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 rounded-[14px] border border-[#d9e4ff] bg-[var(--surface-subtle)] px-4 py-3 text-body-sm text-[var(--text-secondary)]">
            Certain information may be retained where required for legal, regulatory, security,
            fraud-prevention, payment, accounting, or dispute-resolution purposes. Any retained
            information will be handled according to our Privacy Policy.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-heading-2 text-[var(--text-primary)]">Need help?</h2>
          <p className="mt-3 text-body-sm text-[var(--text-secondary)]">
            If you need assistance with your account deletion request, contact our support team at:{" "}
            <a
              href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              {PUBLIC_SUPPORT_EMAIL}
            </a>
          </p>
          <p className="mt-4 text-body-sm text-[var(--text-secondary)]">
            <Link href="/privacy-policy" className="font-semibold text-[var(--primary)] hover:underline">
              Read our Privacy Policy
            </Link>
          </p>
        </section>
      </div>
    </article>
  );
}
