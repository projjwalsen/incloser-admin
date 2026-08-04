"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/primary-button";
import { adminLogin, getAuthToken } from "@/lib/api-client";
import { defaultLandingPath, setAdminSession } from "@/lib/admin-session";
import type { AdminRole } from "@incloser/shared-types";

type FormState = {
  username: string;
  password: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ username: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const canSubmit = useMemo(
    () => form.username.length > 0 && form.password.length > 0 && !isSubmitting,
    [form, isSubmitting],
  );

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
    const username = form.username.trim().toLowerCase();

    if (!username) {
      nextErrors.username = "Username is required.";
    } else if (!/^[a-z0-9._-]{3,32}$/.test(username) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      nextErrors.username = "Enter a valid username or email.";
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
      const username = form.username.trim();
      const isEmail = username.includes("@");
      const result = await adminLogin({
        ...(isEmail ? { email: username.toLowerCase() } : { username: username.toLowerCase() }),
        password: form.password,
      });

      setAdminSession({
        token: result.token,
        role: result.admin.role as AdminRole,
        username: result.admin.username,
        fullName: result.admin.full_name,
        email: result.admin.email,
      });

      router.replace(defaultLandingPath(result.admin.role as AdminRole));
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
          <p className="mt-2 text-body-sm text-[var(--text-secondary)]">
            Sign in with your username and password.
          </p>
        </div>

        {apiError ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {apiError}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              className="soft-input"
              style={errors.username ? { borderColor: "#f1a2ae", boxShadow: "0 0 0 4px rgba(160, 34, 54, 0.11)" } : undefined}
              placeholder="ops.admin"
              autoComplete="username"
            />
            {errors.username ? (
              <p className="mt-1.5 text-xs font-medium text-[var(--status-danger-text)]">{errors.username}</p>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">Super admins may also sign in with email.</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Password
            </label>
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
