"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { FemaleModelDetail } from "@incloser/shared-types";
import { ArrowLeft, Mic } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { AdminUserAvatar } from "@/components/ui/admin-user-avatar";
import { AdminPasswordConfirmModal } from "@/components/ui/admin-password-confirm-modal";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchModelById } from "@/lib/models-api";
import { fetchWithdrawals, type WithdrawalRowApi } from "@/lib/withdrawals-api";
import {
  approveAudio,
  approveProfile,
  fetchAudioQueue,
  rejectAudio,
  rejectProfile,
  resubmitAudio,
  type AudioQueueItem,
} from "@/lib/verification-api";

type TabKey = "profile" | "audio" | "earnings" | "withdrawals" | "activity";

type VerifyModalIntent =
  | { kind: "profile"; action: "approve" | "reject" }
  | { kind: "audio"; action: "approve" | "reject" | "resubmit"; queueItemId: string };

type ModelDetail = {
  id: string;
  nickname: string;
  avatarImageUrl: string | null;
  phone: string;
  cityState: string;
  joinedAt: string;
  bio: string;
  profileVerification: FemaleModelDetail["verificationStatus"];
  audioVerification: FemaleModelDetail["audioVerificationStatus"];
  languages: { label: string; level: string }[];
  earnings: {
    lifetime: string;
    last30d: string;
    today: string;
    callsCompleted: number;
    avgSession: string;
  };
  withdrawals: { id: string; amount: string; status: WithdrawalRowApi["status"]; requestedAt: string }[];
  earningsRows: { id: string; label: string; amount: string; date: string }[];
  activity: { id: string; title: string; detail: string; time: string; tone: "success" | "warning" | "danger" | "info" }[];
  internalNotes: string | null;
  accountActivated: boolean;
};

function formatJoined(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

function buildLanguages(profile: FemaleModelDetail): ModelDetail["languages"] {
  const list = profile.languages.length > 0 ? profile.languages : profile.primaryLanguage ? [profile.primaryLanguage] : [];
  return list.map((label, i) => ({
    label,
    level: i === 0 ? "Primary" : "Secondary",
  }));
}

function buildModelDetail(profile: FemaleModelDetail, withdrawalRows: WithdrawalRowApi[]): ModelDetail {
  const cityState = [profile.city, profile.state].filter(Boolean).join(", ") || "—";
  const forModel = withdrawalRows.filter((w) => w.modelId === profile.id);
  return {
    id: profile.id,
    nickname: profile.nickname,
    avatarImageUrl: profile.avatarImageUrl,
    phone: profile.phone || "—",
    cityState,
    joinedAt: formatJoined(profile.createdAt),
    bio: profile.bio ?? "—",
    profileVerification: profile.verificationStatus,
    audioVerification: profile.audioVerificationStatus,
    languages: buildLanguages(profile),
    earnings: {
      lifetime: "—",
      last30d: "—",
      today: "—",
      callsCompleted: 0,
      avgSession: "—",
    },
    earningsRows: [],
    withdrawals: forModel.map((w) => ({
      id: w.id,
      amount: formatInr(w.amount),
      status: w.status,
      requestedAt: formatJoined(w.requestedAt),
    })),
    activity: [],
    internalNotes: profile.internalNotes,
    accountActivated: profile.accountActivated,
  };
}

function badgeFor(status: ModelDetail["profileVerification"]) {
  if (status === "approved") return { label: "Approved", variant: "success" as const };
  if (status === "pending") return { label: "Pending", variant: "warning" as const };
  if (status === "rejected") return { label: "Rejected", variant: "danger" as const };
  return { label: "In review", variant: "info" as const };
}

function withdrawalBadge(status: WithdrawalRowApi["status"]) {
  if (status === "paid") return { label: "Paid", variant: "success" as const };
  if (status === "approved") return { label: "Approved", variant: "info" as const };
  if (status === "pending") return { label: "Pending", variant: "warning" as const };
  return { label: "Rejected", variant: "danger" as const };
}

export default function ModelDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [model, setModel] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [audioItem, setAudioItem] = useState<AudioQueueItem | null>(null);
  const [profilePlaybackUrl, setProfilePlaybackUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioAction, setAudioAction] = useState<{ message: string; tone: "success" | "warning" | "danger" } | null>(null);
  const [profileVerifyToast, setProfileVerifyToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);
  const [verifyIntent, setVerifyIntent] = useState<VerifyModalIntent | null>(null);

  const loadProfile = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    const silent = opts?.silent === true;
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const p = await fetchModelById(id);
      const withdrawals = await fetchWithdrawals();
      setProfilePlaybackUrl(p.audioVerificationPlaybackUrl ?? null);
      setModel(buildModelDetail(p, withdrawals));
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Failed to load model");
        setModel(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadProfile]);

  const loadAudioForModel = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    const silent = opts?.silent === true;
    try {
      if (!silent) setAudioLoading(true);
      setAudioError(null);
      const queue = await fetchAudioQueue();
      let hit = queue.find((q) => q.modelId === id) ?? null;
      if (!hit?.audioUrl) {
        const p = await fetchModelById(id);
        if (p.audioVerificationPlaybackUrl) {
          hit = {
            id: hit?.id ?? "",
            modelId: id,
            nickname: p.nickname,
            avatarImageUrl: p.avatarImageUrl,
            submittedAt: hit?.submittedAt ?? "—",
            duration: hit?.duration ?? "—",
            status: hit?.status ?? "pending",
            note: hit?.note ?? "",
            audioUrl: p.audioVerificationPlaybackUrl,
          };
        }
      }
      setAudioItem(hit);
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : "Failed to load audio queue");
      setAudioItem(null);
    } finally {
      if (!silent) setAudioLoading(false);
    }
  }, [id]);

  const playbackUrl = audioItem?.audioUrl ?? profilePlaybackUrl;

  const audioActionsEnabled = Boolean(
    audioItem?.id && playbackUrl && !audioItem.id.startsWith("av_fp_"),
  );

  useEffect(() => {
    if (activeTab !== "audio") return;
    const t = window.setTimeout(() => {
      void loadAudioForModel();
    }, 0);
    return () => window.clearTimeout(t);
  }, [activeTab, loadAudioForModel]);

  const profileBadge = useMemo(() => (model ? badgeFor(model.profileVerification) : null), [model]);
  const audioBadge = useMemo(() => (model ? badgeFor(model.audioVerification) : null), [model]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "audio", label: "Audio Verification" },
    { key: "earnings", label: "Earnings" },
    { key: "withdrawals", label: "Withdrawals" },
    { key: "activity", label: "Activity" },
  ];

  const runProfileVerifyAfterPassword = async (action: "approve" | "reject") => {
    if (!model || model.profileVerification !== "pending") return;
    if (action === "approve") await approveProfile(model.id);
    else await rejectProfile(model.id);
    setProfileVerifyToast({
      message: action === "approve" ? "Profile approved" : "Profile rejected",
      tone: action === "approve" ? "success" : "danger",
    });
    void loadProfile({ silent: true });
  };

  const runAudioActionAfterPassword = async (action: "approve" | "reject" | "resubmit", queueItemId: string) => {
    setAudioError(null);
    if (action === "approve") await approveAudio(queueItemId);
    if (action === "reject") await rejectAudio(queueItemId);
    if (action === "resubmit") await resubmitAudio(queueItemId);
    setAudioAction({
      message: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Resubmit requested",
      tone: action === "approve" ? "success" : action === "reject" ? "danger" : "warning",
    });
    setAudioItem(null);
    void loadProfile({ silent: true });
    void loadAudioForModel({ silent: true });
  };

  const verifyModalCopy = (intent: VerifyModalIntent, nickname: string) => {
    if (intent.kind === "profile") {
      if (intent.action === "approve") {
        return {
          title: `Approve profile for ${nickname}?`,
          description: "Enter your admin password to confirm this approval.",
          confirmLabel: "Approve profile",
          destructive: false as const,
        };
      }
      return {
        title: `Reject profile for ${nickname}?`,
        description: "Enter your admin password to confirm rejection.",
        confirmLabel: "Reject profile",
        destructive: true as const,
      };
    }
    if (intent.action === "approve") {
      return {
        title: "Approve this audio submission?",
        description: "Enter your admin password to confirm approval.",
        confirmLabel: "Approve",
        destructive: false as const,
      };
    }
    if (intent.action === "reject") {
      return {
        title: "Reject this audio submission?",
        description: "Enter your admin password to confirm rejection.",
        confirmLabel: "Reject",
        destructive: true as const,
      };
    }
    return {
      title: "Request audio resubmission?",
      description: "Enter your admin password to send this submission back to pending for the model to re-record.",
      confirmLabel: "Confirm resubmit",
      destructive: false as const,
    };
  };

  if (loading && !model) {
    return (
      <AdminShell>
        <PageContainer>
          <CardShell>
            <p className="text-sm text-[var(--text-muted)]">Loading model…</p>
          </CardShell>
        </PageContainer>
      </AdminShell>
    );
  }

  if (error || !model) {
    return (
      <AdminShell>
        <PageContainer>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Link href="/models">
              <SecondaryButton type="button" className="h-10 w-10 rounded-full p-0" aria-label="Back to models">
                <ArrowLeft className="size-4" />
              </SecondaryButton>
            </Link>
          </div>
          <CardShell>
            <p className="text-sm font-semibold text-[var(--status-danger-text)]">{error ?? "Model not found."}</p>
          </CardShell>
        </PageContainer>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageContainer>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Link href="/models">
              <SecondaryButton type="button" className="h-10 w-10 rounded-full p-0" aria-label="Back to models">
                <ArrowLeft className="size-4" />
              </SecondaryButton>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Model</p>
              <h1 className="text-heading-1 text-[var(--text-primary)]">{model.nickname}</h1>
              <p className="text-body-sm text-[var(--text-secondary)]">
                {model.cityState} · {model.phone}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* TODO: Backend export / share summary endpoint not available yet */}
            <SecondaryButton type="button" disabled title="Coming soon">
              Share summary
            </SecondaryButton>
            {/* TODO: Backend quick-actions bundle not available yet */}
            <PrimaryButton type="button" disabled title="Coming soon">
              Quick actions
            </PrimaryButton>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <CardShell className="xl:col-span-6">
            <div className="flex items-start gap-4">
              <AdminUserAvatar imageUrl={model.avatarImageUrl} name={model.nickname} size="md" />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-heading-2 text-[var(--text-primary)]">Profile summary</h2>
                  <StatusBadge label={`ID ${model.id}`} variant="info" />
                </div>
                <p className="text-body-sm text-[var(--text-secondary)]">{model.bio}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <StatusBadge label={`Joined ${model.joinedAt}`} variant="info" />
                  <StatusBadge label="Quality score —" variant="info" />
                </div>
              </div>
            </div>
          </CardShell>

          <CardShell className="xl:col-span-6">
            <h2 className="text-heading-2 text-[var(--text-primary)]">Languages</h2>
            <div className="mt-4 space-y-2">
              {model.languages.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No languages on file.</p>
              ) : (
                model.languages.map((lang) => (
                  <div key={`${lang.label}-${lang.level}`} className="flex items-center justify-between rounded-[14px] border border-[#e7ecff] bg-white px-3 py-2.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{lang.label}</p>
                    <StatusBadge label={lang.level} variant="info" />
                  </div>
                ))
              )}
            </div>
          </CardShell>

          <CardShell className="xl:col-span-12">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Earnings snapshot</h2>
                <p className="text-body-sm text-[var(--text-muted)]">
                  {/* TODO: GET /api/admin/models/:id/earnings (or finance) not implemented — placeholders until backend exists */}
                  Aggregates will load here when a model-scoped earnings API is available.
                </p>
              </div>
              <StatusBadge label="Last refreshed · live profile" variant="info" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--text-muted)]">Lifetime</p>
                <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{model.earnings.lifetime}</p>
              </div>
              <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--text-muted)]">Last 30 days</p>
                <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{model.earnings.last30d}</p>
              </div>
              <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--text-muted)]">Today</p>
                <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{model.earnings.today}</p>
              </div>
              <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--text-muted)]">Calls completed</p>
                <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{model.earnings.callsCompleted}</p>
              </div>
              <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--text-muted)]">Avg session</p>
                <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{model.earnings.avgSession}</p>
              </div>
            </div>
          </CardShell>
        </div>

        <CardShell>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-heading-2 text-[var(--text-primary)]">Verification</h2>
            <Mic className="size-5 text-[var(--primary)]" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[14px] border border-[#e7ecff] bg-white px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Profile</p>
              {profileBadge ? <StatusBadge label={profileBadge.label} variant={profileBadge.variant} /> : null}
            </div>
            <div className="flex items-center justify-between rounded-[14px] border border-[#e7ecff] bg-white px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Audio</p>
              {audioBadge ? <StatusBadge label={audioBadge.label} variant={audioBadge.variant} /> : null}
            </div>
            <div className="flex items-center justify-between rounded-[14px] border border-[#e7ecff] bg-[#f8fbff] px-3 py-2.5">
              <p className="text-sm font-medium text-[var(--text-secondary)]">User account</p>
              <StatusBadge
                label={model.accountActivated ? "Activated" : "Not activated"}
                variant={model.accountActivated ? "success" : "warning"}
              />
            </div>
            <div className="rounded-[14px] border border-[#e7ecff] bg-[var(--surface-muted)] p-4 text-left text-sm leading-relaxed text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">How to verify this model</p>
              <ol className="mt-2 list-decimal space-y-2 pl-4">
                <li>
                  Open the{" "}
                  <Link href="/verification/profile" className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline">
                    profile queue
                  </Link>{" "}
                  and <strong>approve or reject</strong> her profile first.
                </li>
                <li>
                  Then open the{" "}
                  <Link href="/verification/audio" className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline">
                    audio queue
                  </Link>{" "}
                  and <strong>approve or reject</strong> the voice submission.
                </li>
                <li>
                  When <strong>both</strong> are approved, the linked user is <strong>activated automatically</strong> (active + onboarding
                  completed).
                </li>
                <li>
                  <strong>Rejecting</strong> the profile <em>or</em> the audio keeps the account <strong>inactive</strong> until she resubmits and
                  you approve again.
                </li>
                <li>
                  <strong>Ask for reverification:</strong> use <strong>Resubmit</strong> on an audio row (profile reverification can be added
                  later).
                </li>
              </ol>
            </div>
          </div>
        </CardShell>

        <CardShell>
          <div className="flex flex-wrap gap-2 border-b border-[#eef2ff] pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setAudioAction(null);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.key ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-5">
            {activeTab === "profile" ? (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-[18px] border border-[#e7ecff] bg-white p-5">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Public profile fields</h3>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Display name</dt>
                        <dd className="font-semibold text-[var(--text-primary)]">{model.nickname}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Location</dt>
                        <dd className="font-semibold text-[var(--text-primary)]">{model.cityState}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Phone</dt>
                        <dd className="font-semibold text-[var(--text-primary)]">{model.phone}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Bio</dt>
                        <dd className="max-w-[60%] text-right text-[var(--text-secondary)]">{model.bio}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-[18px] border border-[#e7ecff] bg-white p-5">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Internal notes</h3>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">{model.internalNotes ?? "No internal notes on file."}</p>
                    <div className="mt-4 rounded-[14px] bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--text-muted)]">
                      Notes are loaded from the female_profiles record via the admin API.
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-[18px] border border-[#e7ecff] bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Profile verification</h3>
                      <p className="text-sm text-[var(--text-muted)]">Same endpoints as the profile queue page.</p>
                    </div>
                    {profileBadge ? <StatusBadge label={profileBadge.label} variant={profileBadge.variant} /> : null}
                  </div>

                  {model.profileVerification === "pending" ? (
                    <>
                      <p className="text-sm text-[var(--text-secondary)]">
                        This profile is waiting for review. Approve before processing audio if you follow the profile-first workflow.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <PrimaryButton type="button" className="flex-1" onClick={() => setVerifyIntent({ kind: "profile", action: "approve" })}>
                          Approve profile
                        </PrimaryButton>
                        <SecondaryButton type="button" className="flex-1" onClick={() => setVerifyIntent({ kind: "profile", action: "reject" })}>
                          Reject profile
                        </SecondaryButton>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {model.profileVerification === "approved"
                        ? "This profile is already approved. Use the audio queue or the Audio tab for voice review."
                        : model.profileVerification === "rejected"
                          ? "This profile was rejected. The model must resubmit from the app before it can appear as pending again."
                          : "No pending profile action for this state. Use the profile queue for bulk review."}
                    </p>
                  )}

                  {profileVerifyToast ? (
                    <p
                      className={`rounded-[14px] px-3 py-2 text-sm font-semibold ${
                        profileVerifyToast.tone === "success"
                          ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                          : "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
                      }`}
                    >
                      {profileVerifyToast.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === "audio" ? (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[18px] border border-[#e7ecff] bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Audio review</h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {audioLoading ? "Loading…" : audioItem ? `Queue item ${audioItem.id}` : "No pending audio item for this model in the current queue."}
                      </p>
                    </div>
                    {audioBadge ? <StatusBadge label={audioBadge.label} variant={audioBadge.variant} /> : null}
                  </div>

                  {audioError ? <p className="mt-3 text-sm font-semibold text-[var(--status-danger-text)]">{audioError}</p> : null}

                  {playbackUrl ? (
                    <div className="mt-5 rounded-[18px] border border-dashed border-[#c9d8ff] bg-gradient-to-br from-white to-[#f4f7ff] p-4">
                      <audio className="w-full" controls src={playbackUrl} preload="metadata">
                        <track kind="captions" />
                      </audio>
                      <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">Browser preview</p>
                    </div>
                  ) : !audioLoading && !playbackUrl ? (
                    <p className="mt-4 text-sm text-[var(--text-muted)]">No recorded audio on file for this model yet.</p>
                  ) : null}
                </div>

                <div className="space-y-4 rounded-[18px] border border-[#e7ecff] bg-white p-5">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Review actions</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Uses the same verification endpoints as the audio queue page.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <PrimaryButton
                      type="button"
                      className="flex-1"
                      disabled={!audioActionsEnabled}
                      onClick={() => audioItem && setVerifyIntent({ kind: "audio", action: "approve", queueItemId: audioItem.id })}
                    >
                      Approve
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      className="flex-1"
                      disabled={!audioActionsEnabled}
                      onClick={() => audioItem && setVerifyIntent({ kind: "audio", action: "reject", queueItemId: audioItem.id })}
                    >
                      Reject
                    </SecondaryButton>
                    <SecondaryButton
                      type="button"
                      className="flex-1"
                      disabled={!audioActionsEnabled}
                      onClick={() => audioItem && setVerifyIntent({ kind: "audio", action: "resubmit", queueItemId: audioItem.id })}
                    >
                      Resubmit
                    </SecondaryButton>
                  </div>
                  {audioAction ? (
                    <p
                      className={`rounded-[14px] px-3 py-2 text-sm font-semibold ${
                        audioAction.tone === "success"
                          ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                          : audioAction.tone === "danger"
                            ? "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
                            : "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                      }`}
                    >
                      {audioAction.message}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">
                      {audioActionsEnabled
                        ? "Actions apply to the pending queue row for this model."
                        : playbackUrl
                          ? "Playback is available from the profile. Reload after running supabase/audio_verifications.sql if approve/reject stays disabled."
                          : "Actions apply when a pending queue row exists for this model."}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "earnings" ? (
              <div className="overflow-hidden rounded-[16px] border border-[#e7ecff]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Entry</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {model.earningsRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-[var(--text-muted)]" colSpan={3}>
                          {/* TODO: Model-scoped earnings ledger API not available */}
                          No earnings rows yet.
                        </td>
                      </tr>
                    ) : (
                      model.earningsRows.map((row) => (
                        <tr key={row.id} className="border-t border-[#eef2ff]">
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.label}</td>
                          <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{row.amount}</td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{row.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === "withdrawals" ? (
              <div className="overflow-hidden rounded-[16px] border border-[#e7ecff]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Request</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Requested</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {model.withdrawals.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-[var(--text-muted)]" colSpan={4}>
                          No withdrawals for this model in the current snapshot.
                        </td>
                      </tr>
                    ) : (
                      model.withdrawals.map((row) => {
                        const wb = withdrawalBadge(row.status);
                        return (
                          <tr key={row.id} className="border-t border-[#eef2ff]">
                            <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{row.id}</td>
                            <td className="px-4 py-3 text-[var(--text-primary)]">{row.amount}</td>
                            <td className="px-4 py-3">
                              <StatusBadge label={wb.label} variant={wb.variant} />
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">{row.requestedAt}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === "activity" ? (
              <div className="space-y-3">
                {model.activity.length === 0 ? (
                  <p className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    {/* TODO: GET /api/admin/models/:id/activity or audit filter not implemented */}
                    No activity timeline yet.
                  </p>
                ) : (
                  model.activity.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
                      </div>
                      <StatusBadge label={item.time} variant={item.tone} />
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </CardShell>
      </PageContainer>

      {verifyIntent ? (
        <AdminPasswordConfirmModal
          open
          onOpenChange={(o) => {
            if (!o) setVerifyIntent(null);
          }}
          {...verifyModalCopy(verifyIntent, model.nickname)}
          onAfterVerified={async () => {
            if (!verifyIntent) return;
            if (verifyIntent.kind === "profile") {
              await runProfileVerifyAfterPassword(verifyIntent.action);
            } else {
              await runAudioActionAfterPassword(verifyIntent.action, verifyIntent.queueItemId);
            }
          }}
        />
      ) : null}
    </AdminShell>
  );
}
