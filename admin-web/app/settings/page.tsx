"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppSettings } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchSettings, patchSettings } from "@/lib/settings-api";

type FeatureToggles = {
  newDashboard: boolean;
  maintenanceMode: boolean;
  walletTopUps: boolean;
  modelSelfServe: boolean;
};

type SettingsState = {
  tokenPriceInr: string;
  defaultCallPriceTokens: string;
  commissionPercent: string;
  minimumWithdrawalInr: string;
  languageMasterList: string;
  toggles: FeatureToggles;
  supportEmail: string;
  supportPhone: string;
  textRateInr: string;
  voiceRateInr: string;
  videoRateInr: string;
  modelSharePercent: string;
};

const initialSettings: SettingsState = {
  tokenPriceInr: "1.00",
  defaultCallPriceTokens: "20",
  commissionPercent: "20",
  minimumWithdrawalInr: "500",
  languageMasterList: "Hindi, English, Bengali, Marathi, Tamil",
  toggles: {
    newDashboard: true,
    maintenanceMode: false,
    walletTopUps: true,
    modelSelfServe: true,
  },
  supportEmail: "support@incloser.app",
  supportPhone: "+91 80000 00000",
  textRateInr: "2",
  voiceRateInr: "5",
  videoRateInr: "10",
  modelSharePercent: "85",
};

function apiToState(api: AppSettings): SettingsState {
  const contact = api.supportContactInfo.trim();
  const lines = contact.split("\n").map((l) => l.trim());
  return {
    tokenPriceInr: String(api.tokenPricingInr),
    defaultCallPriceTokens: String(api.defaultCallPricingTokens),
    commissionPercent: String(api.commissionPercentage),
    minimumWithdrawalInr: String(api.minimumWithdrawalAmount),
    languageMasterList: api.languageMasterList.join(", "),
    toggles: {
      newDashboard: api.featureToggles.newDashboard ?? true,
      maintenanceMode: api.featureToggles.maintenanceMode ?? false,
      walletTopUps: api.featureToggles.walletTopUps ?? true,
      modelSelfServe: api.featureToggles.modelSelfServe ?? true,
    },
    supportEmail: lines[0] ?? "",
    supportPhone: lines.slice(1).join(" ").trim() || "",
    textRateInr: String(api.billing?.textRateInrPerMin ?? 2),
    voiceRateInr: String(api.billing?.voiceRateInrPerMin ?? 5),
    videoRateInr: String(api.billing?.videoRateInrPerMin ?? 10),
    modelSharePercent: String(api.billing?.modelSharePercent ?? 85),
  };
}

function stateToPayload(s: SettingsState): AppSettings {
  const tokenPricingInr = Number.parseFloat(s.tokenPriceInr) || 0;
  const defaultCallPricingTokens = Number.parseInt(s.defaultCallPriceTokens, 10) || 0;
  const commissionPercentage = Number.parseFloat(s.commissionPercent) || 0;
  const minimumWithdrawalAmount = Number.parseInt(s.minimumWithdrawalInr, 10) || 0;
  const languageMasterList = s.languageMasterList
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const supportContactInfo = [s.supportEmail.trim(), s.supportPhone.trim()].filter(Boolean).join("\n");
  return {
    tokenPricingInr,
    defaultCallPricingTokens,
    commissionPercentage,
    minimumWithdrawalAmount,
    languageMasterList,
    featureToggles: { ...s.toggles },
    supportContactInfo: supportContactInfo || "support@incloser.app",
    billing: {
      textRateInrPerMin: Number.parseFloat(s.textRateInr) || 2,
      voiceRateInrPerMin: Number.parseFloat(s.voiceRateInr) || 5,
      videoRateInrPerMin: Number.parseFloat(s.videoRateInr) || 10,
      modelSharePercent: Number.parseFloat(s.modelSharePercent) || 85,
      reserveMinutes: 3,
      disconnectMinutes: 1,
    },
  };
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-9 w-[52px] shrink-0 rounded-full border transition-colors ${
          checked ? "border-[#bcd0ff] bg-[var(--primary-soft)]" : "border-[#e3e9ff] bg-[var(--surface-muted)]"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow-[var(--shadow-soft)] transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdminConfirmed, setIsAdminConfirmed] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const didMountRef = useRef(false);

  const languagesPreview = useMemo(() => {
    return settings.languageMasterList
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [settings.languageMasterList]);

  const stampNow = () => {
    const stamp = new Date().toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
    setSavedAt(stamp);
  };

  const reset = () => {
    setSavedAt(null);
    setConfirmOpen(false);
    setAdminPassword("");
    setAuthError(null);
    setIsAdminConfirmed(false);
    setSaveError(null);
    void (async () => {
      try {
        setLoadError(null);
        const api = await fetchSettings();
        setSettings(apiToState(api));
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to reload settings");
      }
    })();
  };

  useEffect(() => {
    const onReset = () => reset();
    window.addEventListener("settings:reset", onReset);
    return () => window.removeEventListener("settings:reset", onReset);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoadError(null);
          const api = await fetchSettings();
          setSettings(apiToState(api));
        } catch (e) {
          setLoadError(e instanceof Error ? e.message : "Failed to load settings");
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!isAdminConfirmed) {
      const modalTimer = window.setTimeout(() => {
        setConfirmOpen(true);
      }, 0);
      return () => window.clearTimeout(modalTimer);
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          setSaveError(null);
          await patchSettings(stateToPayload(settings));
          stampNow();
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : "Failed to save settings");
        }
      })();
    }, 500);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [settings, isAdminConfirmed]);

  const confirmAdmin = () => {
    if (!adminPassword.trim()) {
      setAuthError("Admin password is required.");
      return;
    }
    setIsAdminConfirmed(true);
    setConfirmOpen(false);
    setAuthError(null);
    setAdminPassword("");
    void (async () => {
      try {
        setSaveError(null);
        await patchSettings(stateToPayload(settings));
        stampNow();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Failed to save settings");
      }
    })();
  };

  return (
    <AdminShell>
      <PageContainer>
        {loadError ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {loadError}
          </div>
        ) : null}
        {saveError ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {saveError}
          </div>
        ) : null}
        {savedAt ? (
          <div className="rounded-[16px] border border-[#c9ead9] bg-[var(--status-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-success-text)]">
            Saved at {savedAt}
          </div>
        ) : null}
        {!isAdminConfirmed ? (
          <div className="rounded-[16px] border border-[#f5d9b8] bg-[var(--status-warning-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-warning-text)]">
            Enter admin password once to enable auto-save for this session.
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <CardShell>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Token pricing</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Controls how INR maps into token bundles.</p>
              </div>
              <StatusBadge label="Core billing" variant="info" />
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">INR per token</label>
                <input
                  className="soft-input"
                  inputMode="decimal"
                  value={settings.tokenPriceInr}
                  onChange={(e) => setSettings((s) => ({ ...s, tokenPriceInr: e.target.value }))}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Example: 1.00 means ₹1 buys 1 token.</p>
              </div>
            </div>
          </CardShell>

          <CardShell className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Per-minute rates (INR)</h2>
                <p className="text-body-sm text-[var(--text-muted)]">
                  Charged to male users at the start of each minute. Models receive {settings.modelSharePercent}% of
                  full minutes on session end.
                </p>
              </div>
              <StatusBadge label="Wallet billing" variant="info" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Text chat (₹/min)</label>
                <input
                  className="soft-input"
                  inputMode="decimal"
                  value={settings.textRateInr}
                  onChange={(e) => setSettings((s) => ({ ...s, textRateInr: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Voice call (₹/min)</label>
                <input
                  className="soft-input"
                  inputMode="decimal"
                  value={settings.voiceRateInr}
                  onChange={(e) => setSettings((s) => ({ ...s, voiceRateInr: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Video call (₹/min)</label>
                <input
                  className="soft-input"
                  inputMode="decimal"
                  value={settings.videoRateInr}
                  onChange={(e) => setSettings((s) => ({ ...s, videoRateInr: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Model share (%)</label>
                <input
                  className="soft-input"
                  inputMode="decimal"
                  value={settings.modelSharePercent}
                  onChange={(e) => setSettings((s) => ({ ...s, modelSharePercent: e.target.value }))}
                />
              </div>
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Call pricing</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Default token burn for a standard session.</p>
              </div>
              <StatusBadge label="Product" variant="warning" />
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Default call price (tokens)</label>
                <input
                  className="soft-input"
                  inputMode="numeric"
                  value={settings.defaultCallPriceTokens}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultCallPriceTokens: e.target.value }))}
                />
              </div>
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Commission</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Platform take on gross transaction value.</p>
              </div>
              <StatusBadge label="Finance" variant="success" />
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Commission (%)</label>
                <input
                  className="soft-input"
                  inputMode="decimal"
                  value={settings.commissionPercent}
                  onChange={(e) => setSettings((s) => ({ ...s, commissionPercent: e.target.value }))}
                />
              </div>
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Withdrawals</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Minimum payout threshold for models.</p>
              </div>
              <StatusBadge label="Risk" variant="danger" />
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Minimum withdrawal (₹)</label>
                <input
                  className="soft-input"
                  inputMode="numeric"
                  value={settings.minimumWithdrawalInr}
                  onChange={(e) => setSettings((s) => ({ ...s, minimumWithdrawalInr: e.target.value }))}
                />
              </div>
            </div>
          </CardShell>

          <CardShell className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Language master list</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Comma-separated values used across onboarding and discovery filters.</p>
              </div>
              <StatusBadge label={`${languagesPreview.length} languages`} variant="info" />
            </div>
            <div className="mt-5 space-y-3">
              <textarea
                className="soft-input min-h-[120px] resize-y"
                value={settings.languageMasterList}
                onChange={(e) => setSettings((s) => ({ ...s, languageMasterList: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                {languagesPreview.map((lang) => (
                  <span key={lang} className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </CardShell>

          <CardShell className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Feature toggles</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Safe rollout switches — persisted via admin API.</p>
              </div>
              <StatusBadge label="Ops controls" variant="info" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Toggle
                label="New dashboard"
                description="Enables the refreshed analytics shell for internal admins."
                checked={settings.toggles.newDashboard}
                onChange={(next) => setSettings((s) => ({ ...s, toggles: { ...s.toggles, newDashboard: next } }))}
              />
              <Toggle
                label="Maintenance mode"
                description="Gracefully blocks non-admin traffic during incidents."
                checked={settings.toggles.maintenanceMode}
                onChange={(next) => setSettings((s) => ({ ...s, toggles: { ...s.toggles, maintenanceMode: next } }))}
              />
              <Toggle
                label="Wallet top-ups"
                description="Controls token purchase surfaces in the mobile app."
                checked={settings.toggles.walletTopUps}
                onChange={(next) => setSettings((s) => ({ ...s, toggles: { ...s.toggles, walletTopUps: next } }))}
              />
              <Toggle
                label="Model self-serve edits"
                description="Allows models to update limited profile fields without review."
                checked={settings.toggles.modelSelfServe}
                onChange={(next) => setSettings((s) => ({ ...s, toggles: { ...s.toggles, modelSelfServe: next } }))}
              />
            </div>
          </CardShell>

          <CardShell className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Support contact</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Shown in help surfaces and escalation templates.</p>
              </div>
              <StatusBadge label="CX" variant="warning" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Support email</label>
                <input className="soft-input" value={settings.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Support phone</label>
                <input className="soft-input" value={settings.supportPhone} onChange={(e) => setSettings((s) => ({ ...s, supportPhone: e.target.value }))} />
              </div>
            </div>
          </CardShell>
        </div>
      </PageContainer>
      {confirmOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[20px] border border-white/80 bg-white p-6 shadow-[var(--shadow-shell)]">
            <h2 className="text-heading-2 text-[var(--text-primary)]">Confirm admin password</h2>
            <p className="mt-1 text-body-sm text-[var(--text-muted)]">Required before settings can auto-save in this session.</p>
            <div className="mt-5">
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Admin password</label>
              <input
                className="soft-input"
                type="password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAuthError(null);
                }}
                placeholder="Enter admin password"
                autoComplete="current-password"
              />
              {authError ? <p className="mt-2 text-xs font-semibold text-[var(--status-danger-text)]">{authError}</p> : null}
            </div>
            <div className="mt-6 flex gap-2">
              <SecondaryButton type="button" className="flex-1" onClick={reset}>
                Reset all
              </SecondaryButton>
              <SecondaryButton type="button" className="flex-1" onClick={confirmAdmin}>
                Confirm
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
