import Link from "next/link";
import { PrimaryButton } from "@/components/ui/primary-button";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] p-6">
      <div className="rounded-[24px] border border-white bg-white/90 p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-heading-1 text-[var(--text-primary)]">InCloser Admin UI Foundation</h1>
        <p className="mt-2 text-body-sm text-[var(--text-secondary)]">Frontend scaffold is ready for module development.</p>
        <Link href="/dashboard" className="mt-5 inline-block">
          <PrimaryButton>Open Dashboard Preview</PrimaryButton>
        </Link>
      </div>
    </main>
  );
}
