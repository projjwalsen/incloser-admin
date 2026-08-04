"use client";

import { useEffect, useMemo, useState } from "react";
import type { BillingSettings } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchSettings, patchSettings } from "@/lib/settings-api";

type UnitPriceForm = {
  textRateInr: string;
  voiceRateInr: string;
  videoRateInr: string;
  platformCommissionPercent: string;
  fixedChargeInr: string;
};

const defaults: UnitPriceForm = {
  textRateInr: "2",
  voiceRateInr: "5",
  videoRateInr: "10",
  platformCommissionPercent: "10",
  fixedChargeInr: "0.50",
};

function billingToForm(billing: BillingSettings | undefined): UnitPriceForm {
  return {
    textRateInr: String(billing?.textRateInrPerMin ?? defaults.textRateInr),
    voiceRateInr: String(billing?.voiceRateInrPerMin ?? defaults.voiceRateInr),
    videoRateInr: String(billing?.videoRateInrPerMin ?? defaults.videoRateInr),
    platformCommissionPercent: String(
      billing?.platformCommissionPercent ?? defaults.platformCommissionPercent
    ),
    fixedChargeInr: String(billing?.fixedChargeInr ?? defaults.fixedChargeInr),
  };
}

function formToBilling(form: UnitPriceForm, existing: BillingSettings | undefined): BillingSettings {
  return {
    textRateInrPerMin: Number.parseFloat(form.textRateInr) || 2,
    voiceRateInrPerMin: Number.parseFloat(form.voiceRateInr) || 5,
    videoRateInrPerMin: Number.parseFloat(form.videoRateInr) || 10,
    modelSharePercent: existing?.modelSharePercent ?? 85,
    platformCommissionPercent: Number.parseFloat(form.platformCommissionPercent) || 10,
    fixedChargeInr: Number.parseFloat(form.fixedChargeInr) || 0.5,
    reserveMinutes: existing?.reserveMinutes ?? 3,
    disconnectMinutes: existing?.disconnectMinutes ?? 1,
  };
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">{label}</label>
      <input
        className="soft-input"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

export default function UnitPricesPage() {
  const [form, setForm] = useState<UnitPriceForm>(defaults);
  const [existingBilling, setExistingBilling] = useState<BillingSettings | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const settings = await fetchSettings();
        setExistingBilling(settings.billing);
        setForm(billingToForm(settings.billing));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load unit prices");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const preview = useMemo(() => {
    const voiceRate = Number.parseFloat(form.voiceRateInr) || 5;
    const commissionPct = Number.parseFloat(form.platformCommissionPercent) || 10;
    const fixed = Number.parseFloat(form.fixedChargeInr) || 0.5;
    const maleMinutes = 2;
    const modelMinutes = 1;
    const gross = modelMinutes * voiceRate;
    const commission = (gross * commissionPct) / 100;
    const modelNet = Math.max(0, gross - commission - fixed);
    return {
      maleTotal: maleMinutes * voiceRate,
      gross,
      commission,
      fixed,
      modelNet,
    };
  }, [form]);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await patchSettings({
        billing: formToBilling(form, existingBilling),
      });
      setExistingBilling(updated.billing);
      setForm(billingToForm(updated.billing));
      setSavedAt(
        new Date().toLocaleString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save unit prices");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-heading-1 text-[var(--text-primary)]">Unit price settings</h1>
            <p className="mt-1 text-body-sm text-[var(--text-muted)]">
              Per-minute rates charged to male users and model payout rules for the mobile app.
            </p>
          </div>
          <PrimaryButton type="button" onClick={() => void save()} disabled={loading || saving}>
            {saving ? "Saving…" : "Save prices"}
          </PrimaryButton>
        </div>

        {error ? (
          <div className="mt-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}
        {savedAt ? (
          <div className="mt-4 rounded-[16px] border border-[#c9ead9] bg-[var(--status-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-success-text)]">
            Saved at {savedAt}. New sessions will use these rates.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <CardShell className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Per-minute unit prices</h2>
                <p className="text-body-sm text-[var(--text-muted)]">
                  Male wallet is debited at the start of each minute (rounded up). Models are credited
                  for full minutes only (rounded down).
                </p>
              </div>
              <StatusBadge label="Live in app" variant="info" />
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-[var(--text-muted)]">Loading…</p>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field
                  label="Text chat (₹ / min)"
                  hint="Default ₹2"
                  value={form.textRateInr}
                  onChange={(textRateInr) => setForm((s) => ({ ...s, textRateInr }))}
                />
                <Field
                  label="Voice call (₹ / min)"
                  hint="Default ₹5"
                  value={form.voiceRateInr}
                  onChange={(voiceRateInr) => setForm((s) => ({ ...s, voiceRateInr }))}
                />
                <Field
                  label="Video call (₹ / min)"
                  hint="Default ₹10"
                  value={form.videoRateInr}
                  onChange={(videoRateInr) => setForm((s) => ({ ...s, videoRateInr }))}
                />
              </div>
            )}
          </CardShell>

          <CardShell>
            <h2 className="text-heading-2 text-[var(--text-primary)]">Model payout fees</h2>
            <p className="mt-1 text-body-sm text-[var(--text-muted)]">
              Deducted from model gross earnings when a session ends.
            </p>
            {!loading ? (
              <div className="mt-5 space-y-4">
                <Field
                  label="Platform commission (%)"
                  hint="Default 10%"
                  value={form.platformCommissionPercent}
                  onChange={(platformCommissionPercent) =>
                    setForm((s) => ({ ...s, platformCommissionPercent }))
                  }
                />
                <Field
                  label="Fixed charge (₹)"
                  hint="Per session with billable minutes. Default ₹0.50"
                  value={form.fixedChargeInr}
                  onChange={(fixedChargeInr) => setForm((s) => ({ ...s, fixedChargeInr }))}
                />
              </div>
            ) : null}
          </CardShell>

          <CardShell className="xl:col-span-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Example · 1:30 voice call</h2>
                <p className="text-body-sm text-[var(--text-muted)]">
                  Male pays for 2 minutes · Model paid for 1 full minute
                </p>
              </div>
              <StatusBadge label="Preview" variant="warning" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-[14px] border border-[#e7ecff] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">Male charged</p>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  ₹ {preview.maleTotal.toFixed(2)}
                </p>
              </div>
              <div className="rounded-[14px] border border-[#e7ecff] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">Model gross (1 min)</p>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  ₹ {preview.gross.toFixed(2)}
                </p>
              </div>
              <div className="rounded-[14px] border border-[#e7ecff] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">Commission + fixed</p>
                <p className="mt-1 text-lg font-bold text-[var(--status-danger-text)]">
                  − ₹ {(preview.commission + preview.fixed).toFixed(2)}
                </p>
              </div>
              <div className="rounded-[14px] border border-[#c9ead9] bg-[var(--status-success-bg)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">Model receives</p>
                <p className="mt-1 text-lg font-bold text-[var(--status-success-text)]">
                  ₹ {preview.modelNet.toFixed(2)}
                </p>
              </div>
            </div>
          </CardShell>
        </div>
      </PageContainer>
    </AdminShell>
  );
}
