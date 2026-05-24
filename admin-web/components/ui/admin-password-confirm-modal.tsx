"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { reconfirmAdminPassword } from "@/lib/api-client";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { cn } from "@/lib/cn";

export type AdminPasswordConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  /** Use danger styling for the confirm control (reject / destructive). */
  destructive?: boolean;
  onAfterVerified: () => Promise<void>;
};

export function AdminPasswordConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onAfterVerified,
}: AdminPasswordConfirmModalProps) {
  const titleId = useId();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await reconfirmAdminPassword(password);
      await onAfterVerified();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-[20px] border border-white/80 bg-white p-6 shadow-[var(--shadow-shell)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-heading-2 text-[var(--text-primary)]">
          {title}
        </h2>
        {description ? <p className="mt-1 text-body-sm text-[var(--text-muted)]">{description}</p> : null}
        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor={`${titleId}-pw`} className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
              Admin password
            </label>
            <input
              id={`${titleId}-pw`}
              type="password"
              className="soft-input w-full"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Enter your password to confirm"
              autoComplete="current-password"
              disabled={busy}
            />
          </div>
          {error ? <p className="text-xs font-semibold text-[var(--status-danger-text)]">{error}</p> : null}
        </div>
        <div className="mt-6 flex gap-2">
          <SecondaryButton type="button" className="flex-1" disabled={busy} onClick={close}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            className={cn("flex-1", destructive && "bg-[#c42b44] shadow-none hover:bg-[#a82438]")}
            disabled={busy || !password.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Confirming…" : confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
