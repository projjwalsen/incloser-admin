"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/primary-button";
import { agencyLogin, setAgencyToken } from "@/lib/agency-portal-api";

export default function AgencyLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const result = await agencyLogin(code, password);
      setAgencyToken(result.token);
      router.replace("/agency/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] p-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-md rounded-[24px] border border-white bg-white/95 p-8 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-heading-1 text-[var(--text-primary)]">Agency login</h1>
        <p className="mt-2 text-body-sm text-[var(--text-muted)]">
          Sign in with your 6-character agency code and password.
        </p>

        {error ? (
          <div className="mt-4 rounded-[12px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        <label className="mt-6 block text-sm font-semibold text-[var(--text-secondary)]">
          Agency code
          <input
            className="soft-input mt-1 uppercase tracking-[0.2em]"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            autoComplete="username"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-[var(--text-secondary)]">
          Password
          <input
            className="soft-input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <PrimaryButton className="mt-6 w-full" type="submit" disabled={loading || code.length !== 6 || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </PrimaryButton>
      </form>
    </main>
  );
}
