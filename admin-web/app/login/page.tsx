"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/primary-button";
import { adminLogin, getAuthToken } from "@/lib/api-client";

type FormState = {
  email: string;
  password: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const canSubmit = useMemo(() => form.email.length > 0 && form.password.length > 0 && !isSubmitting, [form, isSubmitting]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (getAuthToken()?.trim()) {
        router.replace("/dashboard");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  const validate = () => {
    const nextErrors: Errors = {};
    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { token } = await adminLogin({
        email: form.email.trim(),
        password: form.password,
      });
      localStorage.setItem("admin_token", token);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--bg-page)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[8%] h-72 w-72 rounded-full bg-[var(--bg-gradient-a)] blur-3xl" />
        <div className="absolute right-[10%] top-[16%] h-80 w-80 rounded-full bg-[var(--bg-gradient-b)] blur-3xl" />
        <div className="absolute bottom-[8%] left-[28%] h-80 w-80 rounded-full bg-[var(--bg-gradient-c)] blur-3xl" />
      </div>

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-[460px] rounded-[30px] border border-[var(--shell-border)] bg-[var(--shell-bg)] p-8 shadow-[var(--shadow-shell)] backdrop-blur-md"
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">InCloser CMS</p>
          <h1 className="mt-2 text-heading-1 text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-2 text-body-sm text-[var(--text-secondary)]">Sign in to continue to your premium admin workspace.</p>
        </div>

        {apiError ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {apiError}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="soft-input"
              style={errors.email ? { borderColor: "#f1a2ae", boxShadow: "0 0 0 4px rgba(160, 34, 54, 0.11)" } : undefined}
              placeholder="admin@incloser.app"
              autoComplete="email"
            />
            {errors.email ? <p className="mt-1.5 text-xs font-medium text-[var(--status-danger-text)]">{errors.email}</p> : null}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <button type="button" className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="soft-input"
              style={errors.password ? { borderColor: "#f1a2ae", boxShadow: "0 0 0 4px rgba(160, 34, 54, 0.11)" } : undefined}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            {errors.password ? <p className="mt-1.5 text-xs font-medium text-[var(--status-danger-text)]">{errors.password}</p> : null}
          </div>
        </div>

        <PrimaryButton type="submit" className="mt-6 w-full" disabled={!canSubmit}>
          {isSubmitting ? "Signing In..." : "Sign In"}
        </PrimaryButton>
      </form>
    </main>
  );
}
