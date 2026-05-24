"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminUserAvatar } from "@/components/ui/admin-user-avatar";
import { TableShell } from "@/components/ui/table-shell";
import { AdminPasswordConfirmModal } from "@/components/ui/admin-password-confirm-modal";
import { approveAudio, fetchAudioQueue, rejectAudio, resubmitAudio, type AudioQueueItem } from "@/lib/verification-api";

function statusBadge(status: AudioQueueItem["status"]) {
  if (status === "approved") return { label: "Approved", variant: "success" as const };
  if (status === "pending") return { label: "Pending", variant: "warning" as const };
  if (status === "rejected") return { label: "Rejected", variant: "danger" as const };
  return { label: "In review", variant: "info" as const };
}

type ActionToast = { message: string; tone: "success" | "warning" | "danger" };

export default function AudioVerificationPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AudioQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ActionToast | null>(null);
  const [verifyIntent, setVerifyIntent] = useState<null | { action: "approve" | "reject" | "resubmit"; id: string }>(null);

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
  const selectedBadge = selected ? statusBadge(selected.status) : null;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAudioQueue();
        if (!active) return;
        setRows(data);
        setSelectedId((prev) => prev || data[0]?.id || "");
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load audio queue");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const runVerifiedAudioAction = async () => {
    if (!verifyIntent) return;
    const { id, action } = verifyIntent;
    try {
      if (action === "approve") await approveAudio(id);
      if (action === "reject") await rejectAudio(id);
      if (action === "resubmit") await resubmitAudio(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSelectedId((prev) => (prev === id ? "" : prev));
      setToast({
        message: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Resubmit requested",
        tone: action === "approve" ? "success" : action === "reject" ? "danger" : "warning",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update audio verification";
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        {toast ? (
          <div
            className={`rounded-[16px] border px-4 py-3 text-sm font-semibold ${
              toast.tone === "success"
                ? "border-[#c9ead9] bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                : toast.tone === "danger"
                  ? "border-[#f1c2c9] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
                  : "border-[#f5d9b8] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
            }`}
          >
            {toast.message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        <CardShell>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Step 2 of 2 — Audio verification</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Process submissions <strong>after</strong> the same model’s profile is approved in the profile queue. Approve audio here to count
            toward activation; reject if it fails review. Use <strong>Resubmit</strong> to ask the model to record again (reverification). The
            user account activates only when <strong>both</strong> profile and audio are approved.
          </p>
        </CardShell>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <TableShell title="Submissions queue" subtitle="Select a row to load the review deck on the right">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] text-left text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Submission</th>
                    <th className="px-5 py-4 font-semibold">Model</th>
                    <th className="px-5 py-4 font-semibold">Submitted</th>
                    <th className="px-5 py-4 font-semibold">Duration</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Open</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {rows.map((row) => {
                    const b = statusBadge(row.status);
                    const active = selected?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`cursor-pointer border-t border-[#eef2ff] ${active ? "bg-[#f7f9ff]" : ""}`}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[var(--text-primary)]">{row.id}</p>
                          <p className="text-xs text-[var(--text-muted)]">{row.audioUrl ? "Stored in Supabase" : "No audio URL"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <AdminUserAvatar imageUrl={row.avatarImageUrl} name={row.nickname} />
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text-primary)]">{row.nickname}</p>
                              <StatusBadge label={`ID ${row.modelId}`} variant="info" />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)]">{row.submittedAt}</td>
                        <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">{row.duration}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={b.label} variant={b.variant} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <SecondaryButton type="button" className="px-3 py-2 text-xs font-semibold" onClick={() => setSelectedId(row.id)}>
                            Review
                          </SecondaryButton>
                        </td>
                      </tr>
                    );
                  })}
                  {loading ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={6}>
                        Loading audio queue...
                      </td>
                    </tr>
                  ) : null}
                  {!loading && rows.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={6}>
                        No pending audio verifications.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TableShell>

          <div className="space-y-4">
            <CardShell>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {selected ? <AdminUserAvatar imageUrl={selected.avatarImageUrl} name={selected.nickname} size="md" /> : null}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Playback</p>
                    <h2 className="text-heading-2 text-[var(--text-primary)]">{selected?.id ?? "—"}</h2>
                    <p className="text-body-sm text-[var(--text-secondary)]">
                      {selected ? `${selected.nickname} · ${selected.duration}` : "Select a submission"}
                    </p>
                  </div>
                </div>
                {selected && selectedBadge ? <StatusBadge label={selectedBadge.label} variant={selectedBadge.variant} /> : null}
              </div>

              {selected ? (
                <>
                  <div className="mt-5 rounded-[18px] border border-dashed border-[#c9d8ff] bg-gradient-to-br from-white to-[#f4f7ff] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                        {selected.audioUrl
                          ? decodeURIComponent(selected.audioUrl.split("/").pop() ?? "Recording")
                          : `Submission ${selected.id}`}
                      </p>
                      <span className="shrink-0 text-xs font-semibold text-[var(--text-muted)]">{selected.duration}</span>
                    </div>
                    {selected.audioUrl ? (
                      <div className="mt-4">
                        <audio key={selected.audioUrl} className="w-full" controls src={selected.audioUrl} preload="metadata">
                          <track kind="captions" />
                        </audio>
                        <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">Plays from the URL returned by the admin API (public bucket or full URL).</p>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-[var(--text-secondary)]">
                        No playable URL returned for this submission. The API fills this from <span className="font-mono text-xs">audio_verifications.audio_url</span>{" "}
                        or, if empty, <span className="font-mono text-xs">female_profiles.audio_verification_url</span> (full URL or storage path in{" "}
                        <span className="font-mono text-xs">audio-verifications</span>).
                      </p>
                    )}
                  </div>

                  <div className="mt-4 rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3 text-sm text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">Reviewer note: </span>
                    {selected.note}
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <PrimaryButton type="button" className="flex-1" onClick={() => setVerifyIntent({ action: "approve", id: selected.id })}>
                      Approve
                    </PrimaryButton>
                    <SecondaryButton type="button" className="flex-1" onClick={() => setVerifyIntent({ action: "reject", id: selected.id })}>
                      Reject
                    </SecondaryButton>
                    <SecondaryButton type="button" className="flex-1" onClick={() => setVerifyIntent({ action: "resubmit", id: selected.id })}>
                      Resubmit
                    </SecondaryButton>
                  </div>

                  <div className="mt-4">
                    <SecondaryButton
                      type="button"
                      className="w-full justify-center px-4 py-2 text-xs font-semibold"
                      onClick={() => router.push(`/models/${selected.modelId}`)}
                    >
                      View model profile
                    </SecondaryButton>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-[var(--text-muted)]">No submissions to review.</p>
              )}
            </CardShell>
          </div>
        </div>

        {verifyIntent ? (
          <AdminPasswordConfirmModal
            open
            onOpenChange={(o) => {
              if (!o) setVerifyIntent(null);
            }}
            title={
              verifyIntent.action === "approve"
                ? "Approve this audio submission?"
                : verifyIntent.action === "reject"
                  ? "Reject this audio submission?"
                  : "Request audio resubmission?"
            }
            description="Enter your admin password to confirm this action."
            confirmLabel={verifyIntent.action === "approve" ? "Approve" : verifyIntent.action === "reject" ? "Reject" : "Confirm resubmit"}
            destructive={verifyIntent.action === "reject"}
            onAfterVerified={runVerifiedAudioAction}
          />
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
