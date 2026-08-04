"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AgencySettings } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { fetchAgencySettings, patchAgencySettings } from "@/lib/agencies-api";

export default function AgencySettingsPage() {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSettings(await fetchAgencySettings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      setSaved(false);
      setSettings(await patchAgencySettings(settings));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <Link href="/agencies" className="text-sm font-semibold text-[var(--brand-primary)]">
          ← Agencies
        </Link>
        <h1 className="mt-2 text-heading-1 text-[var(--text-primary)]">Agency & withdrawal settings</h1>
        <p className="mt-1 text-body-sm text-[var(--text-muted)]">
          Defaults used for agency commission and model/agency payout deductions.
        </p>

        {error ? (
          <div className="mt-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}
        {saved ? (
          <div className="mt-4 rounded-[16px] border border-[#c7f0d8] bg-[#f0fdf6] px-4 py-3 text-sm font-semibold text-emerald-800">
            Settings saved.
          </div>
        ) : null}

        {loading || !settings ? (
          <p className="mt-6 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <CardShell className="mt-6 max-w-xl space-y-4">
            <label className="block text-sm font-semibold">
              Default agency commission %
              <input
                className="soft-input mt-1"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.defaultAgencyCommissionPercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultAgencyCommissionPercent: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block text-sm font-semibold">
              Platform withdrawal charge %
              <input
                className="soft-input mt-1"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.platformWithdrawalChargePercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    platformWithdrawalChargePercent: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block text-sm font-semibold">
              TDS threshold (₹ / financial year)
              <input
                className="soft-input mt-1"
                type="number"
                min={0}
                value={settings.tdsThresholdInr}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tdsThresholdInr: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block text-sm font-semibold">
              TDS %
              <input
                className="soft-input mt-1"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.tdsPercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tdsPercent: Number(e.target.value),
                  })
                }
              />
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Example model withdrawal ₹1000 under agency: agency 12% (₹120) + platform 1% (₹10) +
              TDS if FY payouts exceed threshold.
            </p>
            <PrimaryButton onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </PrimaryButton>
          </CardShell>
        )}
      </PageContainer>
    </AdminShell>
  );
}
