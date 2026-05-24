"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, FilePenLine, X } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminUserAvatar } from "@/components/ui/admin-user-avatar";
import { TableShell } from "@/components/ui/table-shell";
import { AdminPasswordConfirmModal } from "@/components/ui/admin-password-confirm-modal";
import { approveProfile, fetchProfileQueue, rejectProfile, type ProfileQueueItem } from "@/lib/verification-api";
import { cn } from "@/lib/cn";

type ActionToast = { rowId: string; message: string; tone: "success" | "warning" | "danger" | "info" };

const iconActionClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#d8e2ff] bg-white text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]";

type IconActionProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  children: React.ReactNode;
};

function IconAction({ label, onClick, href, className, children }: IconActionProps) {
  const shared = cn(iconActionClass, className);
  if (href) {
    return (
      <Link href={href} className={shared} title={label} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={shared} title={label} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

export default function ProfileVerificationPage() {
  const [rows, setRows] = useState<ProfileQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ActionToast | null>(null);
  const [verifyIntent, setVerifyIntent] = useState<null | { action: "approve" | "reject"; row: ProfileQueueItem }>(null);

  const pushToast = (rowId: string, message: string, tone: ActionToast["tone"]) => {
    setToast({ rowId, message, tone });
  };

  const queueStats = useMemo(() => {
    return {
      pending: rows.length,
      escalations: rows.filter((r) => r.verificationStatus === "review").length,
    };
  }, [rows]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProfileQueue();
        if (!active) return;
        setRows(data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load profile queue");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const runVerifiedProfileAction = async () => {
    if (!verifyIntent) return;
    const { row, action } = verifyIntent;
    try {
      if (action === "approve") await approveProfile(row.modelId);
      else await rejectProfile(row.modelId);
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      pushToast(row.id, action === "approve" ? "Approved" : "Rejected", action === "approve" ? "success" : "danger");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update profile";
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <CardShell>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Step 1 of 2 — Profile verification</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Approve when the profile looks legitimate; reject if it fails policy. The model’s user account <strong>does not activate</strong>{" "}
            until you also approve her <strong>audio</strong> in the audio queue. Rejecting the profile here blocks activation regardless of audio.
          </p>
        </CardShell>

        {toast ? (
          <div
            className={`rounded-[16px] border px-4 py-3 text-sm font-semibold ${
              toast.tone === "success"
                ? "border-[#c9ead9] bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                : toast.tone === "danger"
                  ? "border-[#f1c2c9] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
                  : toast.tone === "warning"
                    ? "border-[#f5d9b8] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                    : "border-[#c9d8ff] bg-[var(--status-info-bg)] text-[var(--status-info-text)]"
            }`}
          >
            <span className="font-bold">{toast.rowId}</span>: {toast.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Pending in queue</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{queueStats.pending}</p>
            <div className="mt-3">
              <StatusBadge label="SLA healthy" variant="success" />
            </div>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Avg review time</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">18m</p>
            <div className="mt-3">
              <StatusBadge label="Team load normal" variant="info" />
            </div>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Escalations</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{queueStats.escalations}</p>
            <div className="mt-3">
              <StatusBadge label={queueStats.escalations > 0 ? "Needs lead review" : "No escalations"} variant="warning" />
            </div>
          </CardShell>
        </div>

        <TableShell
          title="Pending profiles"
          subtitle="Step 1 of 2: approve or reject each profile here first. After approval, complete step 2 in Verification → Audio before the model’s user account activates."
        >
          {error ? (
            <div className="mb-3 rounded-[14px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
              {error}
            </div>
          ) : null}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[22%]" />
                <col className="min-w-[200px]" />
              </colgroup>
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Model</th>
                  <th className="px-5 py-4 font-semibold">City</th>
                  <th className="px-5 py-4 font-semibold">Submitted</th>
                  <th className="px-5 py-4 font-semibold">Flags</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#eef2ff]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <AdminUserAvatar imageUrl={row.avatarImageUrl} name={row.nickname} />
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-[var(--text-primary)]">{row.nickname}</p>
                          <p className="truncate text-xs font-medium text-[var(--text-muted)]">{row.modelId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{row.city ?? "—"}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{row.submittedAt}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {row.flags.map((f) => (
                          <StatusBadge key={f} label={f} variant="warning" />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
                        <IconAction label="View details" href={`/models/${row.modelId}`}>
                          <Eye className="size-4" />
                        </IconAction>
                        <PrimaryButton
                          type="button"
                          className="size-9 shrink-0 rounded-full p-0"
                          title="Approve submission"
                          aria-label="Approve submission"
                          onClick={() => setVerifyIntent({ action: "approve", row })}
                        >
                          <Check className="size-4" />
                        </PrimaryButton>
                        <IconAction label="Reject submission" onClick={() => setVerifyIntent({ action: "reject", row })}>
                          <X className="size-4" />
                        </IconAction>
                        <IconAction
                          label="Request changes from model"
                          onClick={() => setVerifyIntent({ action: "reject", row })}
                        >
                          <FilePenLine className="size-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                      Loading profile queue...
                    </td>
                  </tr>
                ) : null}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                      No pending profile verifications.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </TableShell>

        {verifyIntent ? (
          <AdminPasswordConfirmModal
            open
            onOpenChange={(o) => {
              if (!o) setVerifyIntent(null);
            }}
            title={
              verifyIntent.action === "approve"
                ? `Approve profile for ${verifyIntent.row.nickname}?`
                : `Reject profile for ${verifyIntent.row.nickname}?`
            }
            description="Enter your admin password to confirm this action."
            confirmLabel={verifyIntent.action === "approve" ? "Approve" : "Reject"}
            destructive={verifyIntent.action === "reject"}
            onAfterVerified={runVerifiedProfileAction}
          />
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
